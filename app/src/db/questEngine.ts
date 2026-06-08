import { db } from './schema';
import { getHealthState } from './health';

// ─── Tuning constants ─────────────────────────────────────────────────────────
// One editable block, same convention as DROP_TABLE (game.ts:96) — transparent,
// hand-tunable, no magic numbers buried in logic.
export const QUEST_ENGINE_TUNING = {
  recompute_interval_days: 7,    // how often the Player Snapshot reruns
  consistency_window_days: 14,   // trailing window for streak/frequency calc
  scaling_factor: 0.9,           // spans the stretch_multiplier clamp range linearly (1.1 -> 2.0) across consistency_score [0,1]
  mood_low_threshold: 5,         // mood rating (1-10) below which restorative/repair rules fire
  mood_high_threshold: 8,        // mood rating (1-10) counted as "self-reported thriving" for the anti-cheese check
  anti_cheese_min_high_streak: 10, // consecutive high-mood logs (out of the 14-day window) before the mismatch check engages
  anti_cheese_activity_floor: 0.3, // if logged-days-ratio falls below this while mood streak is high, behavior doesn't match the self-report
  mood_rule_weight_mult: 1.5,    // how strongly a fired mood rule reweights candidates
  recency_decay_half_life_days: 14, // how fast an old log's pull on weighting fades
  candidate_pool_limit: 3,       // how many quest candidates get drawn per cycle
};

const STRETCH_MIN = 1.1;
const STRETCH_MAX = 2.0;

// ─── Player Snapshot ──────────────────────────────────────────────────────────
// Periodic aggregation over activity_logs + health_state + mood history, boiled
// down into per-category stats the rest of the pipeline reads from. Pure
// number-crunching — produces the "ingredients," nothing user-facing.

export type CategorySnapshot = {
  category: string;
  attribute: string;
  base_weight: number;
  times_logged: number;
  avg_duration_mins: number;
  consistency_score: number;   // 0-1, how reliably it's been logged in the trailing window
  last_logged_date: string | null;
};

export type MoodSnapshot = {
  avg_rating: number | null;   // trailing-window average mood (1-10), null if no data
  low_streak_days: number;     // consecutive most-recent mood logs below mood_low_threshold
  high_streak_days: number;    // consecutive most-recent mood logs at/above mood_high_threshold
  sample_size: number;
};

export type BehaviorSnapshot = {
  active_days: number;         // distinct days with at least one activity log in the window
  logged_days_ratio: number;   // active_days / window_days — the "actual engagement" signal
};

export type PlayerSnapshot = {
  computed_at: string;
  window_days: number;
  categories: CategorySnapshot[];
  unused_categories: string[]; // exist in `categories` but not logged in the window — discovery material
  mood: MoodSnapshot;
  behavior: BehaviorSnapshot;
  health_trend: { emotional: number; physical: number; mental: number };
};

function computeConsistencyScore(datesLogged: string[], windowDays: number): number {
  if (datesLogged.length === 0) return 0;
  const uniqueDays = new Set(datesLogged).size;
  // Reward both raw frequency and recency-weighted spread across the window —
  // a burst of 5 logs on one day scores lower than 5 logs spread across 5 days.
  const frequencyComponent = Math.min(1, uniqueDays / windowDays);
  return Math.round(frequencyComponent * 100) / 100;
}

export function computePlayerSnapshot(): PlayerSnapshot {
  const windowDays = QUEST_ENGINE_TUNING.consistency_window_days;
  const since = `date('now', '-${windowDays} days')`;

  const categoryRows = db.getAllSync<{ name: string; attribute: string; weight: number }>(
    `SELECT name, attribute, weight FROM categories`,
  );

  const categories: CategorySnapshot[] = [];
  const usedNames = new Set<string>();

  for (const cat of categoryRows) {
    const logs = db.getAllSync<{ log_date: string; duration_mins: number | null }>(
      `SELECT log_date, duration_mins FROM activity_logs
       WHERE entry_type = 'activity' AND archived_at IS NULL
         AND lower(json_extract(categories, '$[0]')) = lower(?)
         AND log_date >= ${since}
       ORDER BY log_date DESC`,
      cat.name,
    );

    if (logs.length === 0) continue;
    usedNames.add(cat.name.toLowerCase());

    const durations = logs.map(l => l.duration_mins ?? 0).filter(d => d > 0);
    const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;

    categories.push({
      category: cat.name,
      attribute: cat.attribute,
      base_weight: cat.weight,
      times_logged: logs.length,
      avg_duration_mins: avgDuration,
      consistency_score: computeConsistencyScore(logs.map(l => l.log_date), windowDays),
      last_logged_date: logs[0]?.log_date ?? null,
    });
  }

  const unused_categories = categoryRows
    .map(c => c.name)
    .filter(name => !usedNames.has(name.toLowerCase()));

  const moodRows = db.getAllSync<{ mood_rating: number }>(
    `SELECT mood_rating FROM activity_logs
     WHERE entry_type = 'mood' AND mood_rating > 0 AND archived_at IS NULL
       AND log_date >= ${since}
     ORDER BY log_date DESC, created_at DESC`,
  );

  let lowStreak = 0;
  for (const row of moodRows) {
    if (row.mood_rating < QUEST_ENGINE_TUNING.mood_low_threshold) lowStreak++;
    else break;
  }
  let highStreak = 0;
  for (const row of moodRows) {
    if (row.mood_rating >= QUEST_ENGINE_TUNING.mood_high_threshold) highStreak++;
    else break;
  }

  const mood: MoodSnapshot = {
    avg_rating: moodRows.length ? Math.round((moodRows.reduce((s, r) => s + r.mood_rating, 0) / moodRows.length) * 10) / 10 : null,
    low_streak_days: lowStreak,
    high_streak_days: highStreak,
    sample_size: moodRows.length,
  };

  // Behavioral signal — independent of self-reported mood. The "ground truth"
  // the anti-cheese check compares the mood self-report against.
  const activeDayRows = db.getAllSync<{ log_date: string }>(
    `SELECT DISTINCT log_date FROM activity_logs
     WHERE entry_type = 'activity' AND archived_at IS NULL AND log_date >= ${since}`,
  );
  const behavior: BehaviorSnapshot = {
    active_days: activeDayRows.length,
    logged_days_ratio: Math.round((activeDayRows.length / windowDays) * 100) / 100,
  };

  const health = getHealthState();

  return {
    computed_at: new Date().toISOString(),
    window_days: windowDays,
    categories,
    unused_categories,
    mood,
    behavior,
    health_trend: { emotional: health.emotional, physical: health.physical, mental: health.mental },
  };
}

// ─── Snapshot persistence + 7-day recompute gate ──────────────────────────────

export function getStoredSnapshot(): { last_snapshot_at: string | null; snapshot: PlayerSnapshot | null } {
  const row = db.getFirstSync<{ last_snapshot_at: string | null; snapshot: string }>(
    `SELECT last_snapshot_at, snapshot FROM quest_engine_state WHERE id = 1`,
  );
  if (!row) return { last_snapshot_at: null, snapshot: null };
  let snapshot: PlayerSnapshot | null = null;
  try { snapshot = JSON.parse(row.snapshot); } catch {}
  return { last_snapshot_at: row.last_snapshot_at, snapshot };
}

function saveSnapshot(snapshot: PlayerSnapshot): void {
  db.runSync(
    `UPDATE quest_engine_state SET last_snapshot_at = ?, snapshot = ? WHERE id = 1`,
    snapshot.computed_at, JSON.stringify(snapshot),
  );
}

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  if (isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

/** Returns the current snapshot, recomputing it if the 7-day gate has elapsed (or none exists). */
export function getOrRefreshSnapshot(): PlayerSnapshot {
  const { last_snapshot_at, snapshot } = getStoredSnapshot();
  if (snapshot && last_snapshot_at && daysSince(last_snapshot_at) < QUEST_ENGINE_TUNING.recompute_interval_days) {
    return snapshot;
  }
  const fresh = computePlayerSnapshot();
  saveSnapshot(fresh);
  return fresh;
}

// ─── Stretch function ─────────────────────────────────────────────────────────
// NOT a fixed multiplier — scales with how consistent the player has been.
// Sporadic logger -> gentle 1.1-1.3x. Strong streak -> close to 2x.

export function stretchMultiplier(consistencyScore: number): number {
  const raw = STRETCH_MIN + consistencyScore * QUEST_ENGINE_TUNING.scaling_factor;
  return Math.round(Math.min(STRETCH_MAX, Math.max(STRETCH_MIN, raw)) * 100) / 100;
}

// ─── Mood-reactive rules layer ────────────────────────────────────────────────
// Ordered condition -> action list (classic expert-system pattern). Each rule
// that fires can inject a forced-kind candidate and/or suppress stretch quests.

export type MoodRuleResult = {
  forcedKind: 'restorative' | 'mood_repair' | null;
  suppressStretch: boolean;
  raiseDifficultyFloor: boolean; // anti-cheese: forces stretch-tier, cuts easy/discovery weight
  weightMultiplier: number; // applied to forced-kind candidates when one fires
};

export function applyMoodRules(snapshot: PlayerSnapshot): MoodRuleResult {
  const { mood, health_trend, behavior } = snapshot;
  const lowMood = mood.avg_rating !== null && mood.avg_rating < QUEST_ENGINE_TUNING.mood_low_threshold;
  const emotionalLow = health_trend.emotional < 50;

  // Ordered: most specific / highest-signal rules first.
  if (emotionalLow && lowMood) {
    return { forcedKind: 'restorative', suppressStretch: true, raiseDifficultyFloor: false, weightMultiplier: QUEST_ENGINE_TUNING.mood_rule_weight_mult * 1.3 };
  }
  if (lowMood) {
    return { forcedKind: 'restorative', suppressStretch: true, raiseDifficultyFloor: false, weightMultiplier: QUEST_ENGINE_TUNING.mood_rule_weight_mult };
  }
  if (mood.low_streak_days >= 5 && mood.sample_size >= 5) {
    // Sustained low mood over the rolling window -> theme toward mood-repair, not just rest.
    return { forcedKind: 'mood_repair', suppressStretch: true, raiseDifficultyFloor: false, weightMultiplier: QUEST_ENGINE_TUNING.mood_rule_weight_mult };
  }
  // Anti-cheese: self-report says "thriving" (sustained high mood) but the behavioral
  // signal (actual logged days) doesn't back it up -> the easy path is being coasted on.
  // Don't inject anything restorative/repair-themed here — instead make the normal
  // draw harder to game: force stretch-tier, starve the easy/discovery candidates.
  if (
    mood.high_streak_days >= QUEST_ENGINE_TUNING.anti_cheese_min_high_streak &&
    mood.sample_size >= QUEST_ENGINE_TUNING.anti_cheese_min_high_streak &&
    behavior.logged_days_ratio < QUEST_ENGINE_TUNING.anti_cheese_activity_floor
  ) {
    return { forcedKind: null, suppressStretch: false, raiseDifficultyFloor: true, weightMultiplier: 1.0 };
  }
  return { forcedKind: null, suppressStretch: false, raiseDifficultyFloor: false, weightMultiplier: 1.0 };
}

// ─── Recency decay ────────────────────────────────────────────────────────────

function recencyDecay(lastLoggedDate: string | null): number {
  if (!lastLoggedDate) return 0.5; // never logged in-window -> mild neutral pull
  const ageDays = daysSince(`${lastLoggedDate}T00:00:00`);
  const halfLife = QUEST_ENGINE_TUNING.recency_decay_half_life_days;
  return Math.pow(0.5, ageDays / halfLife);
}

// ─── Weighted draw ────────────────────────────────────────────────────────────
// Combines base category weight x stretch multiplier x mood-rule adjustments x
// recency-decay into a single score, then does a weighted-random pick of N —
// same mechanism as DROP_TABLE (game.ts:96)/getCategoryWeight (game.ts:271).

export type QuestCandidate = {
  category: string;
  attribute: string;
  kind: 'maintain' | 'stretch' | 'discovery' | 'restorative' | 'mood_repair';
  minutes: number | null;
  score: number;
};

export function buildCandidates(snapshot: PlayerSnapshot): QuestCandidate[] {
  const moodRule = applyMoodRules(snapshot);
  const candidates: QuestCandidate[] = [];

  for (const cat of snapshot.categories) {
    const decay = recencyDecay(cat.last_logged_date);
    const stretch = stretchMultiplier(cat.consistency_score);
    // Anti-cheese floor: when self-report and behavior don't line up, the easy
    // "maintain" path gets closed off — every category is treated as stretch-worthy.
    const isStretchWorthy = moodRule.raiseDifficultyFloor
      || (cat.consistency_score >= 0.4 && cat.avg_duration_mins > 0);

    if (moodRule.forcedKind) {
      candidates.push({
        category: cat.category,
        attribute: cat.attribute,
        kind: moodRule.forcedKind,
        minutes: cat.avg_duration_mins > 0 ? cat.avg_duration_mins : null,
        score: cat.base_weight * decay * moodRule.weightMultiplier,
      });
      continue;
    }

    if (isStretchWorthy && cat.avg_duration_mins > 0) {
      candidates.push({
        category: cat.category,
        attribute: cat.attribute,
        kind: 'stretch',
        minutes: Math.round(cat.avg_duration_mins * stretch),
        score: cat.base_weight * stretch * decay,
      });
    } else {
      candidates.push({
        category: cat.category,
        attribute: cat.attribute,
        kind: 'maintain',
        minutes: cat.avg_duration_mins > 0 ? cat.avg_duration_mins : null,
        score: cat.base_weight * decay,
      });
    }
  }

  // Discovery material — categories that exist (created) but weren't logged this window.
  // Withheld both when mood rules are actively repairing (suppressStretch) and when
  // the anti-cheese floor is raised (the easy/novel paths are exactly what's being starved).
  if (!moodRule.suppressStretch && !moodRule.raiseDifficultyFloor) {
    for (const name of snapshot.unused_categories) {
      const row = db.getFirstSync<{ attribute: string; weight: number }>(
        `SELECT attribute, weight FROM categories WHERE name = ?`, name,
      );
      if (!row) continue;
      candidates.push({
        category: name,
        attribute: row.attribute,
        kind: 'discovery',
        minutes: null,
        score: row.weight * 0.6, // gentle pull — discovery quests shouldn't dominate the draw
      });
    }
  }

  return candidates.filter(c => c.score > 0);
}

function weightedSample<T extends { score: number }>(pool: T[], n: number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  while (remaining.length && picked.length < n) {
    const total = remaining.reduce((s, c) => s + c.score, 0);
    if (total <= 0) break;
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      roll -= remaining[idx].score;
      if (roll <= 0) break;
    }
    picked.push(remaining[Math.min(idx, remaining.length - 1)]);
    remaining.splice(Math.min(idx, remaining.length - 1), 1);
  }
  return picked;
}

export function drawQuestCandidates(snapshot: PlayerSnapshot): QuestCandidate[] {
  const pool = buildCandidates(snapshot);
  return weightedSample(pool, QUEST_ENGINE_TUNING.candidate_pool_limit);
}

// ─── Template fill ────────────────────────────────────────────────────────────

export function fillTemplate(candidate: QuestCandidate): { title: string; description: string; stat_hint: string } {
  const row = db.getFirstSync<{ title_template: string; description_template: string }>(
    `SELECT title_template, description_template FROM quest_templates WHERE kind = ? ORDER BY RANDOM() LIMIT 1`,
    candidate.kind,
  ) ?? { title_template: 'Log: {category}', description_template: 'Complete a {category} session this week.' };

  const fill = (s: string) => s
    .replace(/\{category\}/g, candidate.category)
    .replace(/\{minutes\}/g, String(candidate.minutes ?? 30));

  return {
    title: fill(row.title_template),
    description: fill(row.description_template),
    stat_hint: candidate.attribute,
  };
}
