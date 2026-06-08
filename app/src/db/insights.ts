import { db } from './schema';
import { getOnboardingAnswers } from './onboarding';
import { addCategory } from './categories';
import {
  getOrRefreshSnapshot, getStoredSnapshot, QUEST_ENGINE_TUNING,
  stretchMultiplier, type PlayerSnapshot,
} from './questEngine';

// ─── Tuning ───────────────────────────────────────────────────────────────────
// Same convention as QUEST_ENGINE_TUNING — one editable, transparent block.
export const INSIGHTS_TUNING = {
  overuse_min_logs: 6,        // baseline-category logs in-window before "give this a real name" fires
  tier_ready_threshold: 1.9,  // stretch multiplier sitting this close to the 2.0 ceiling counts as "maxed"
  tier_ready_min_cycles: 2,   // consecutive snapshot cycles it must stay there
  mood_trend_min_delta: 1.0,  // minimum avg-mood swing (1-10 scale) to count as a "trend"
  mood_trend_min_cycles: 2,   // consecutive snapshot cycles moving the same direction
};

export type SuggestionKind = 'new_category' | 'tier_ready' | 'mood_trend';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export type InsightSuggestion = {
  id: number;
  kind: SuggestionKind;
  title: string;
  description: string;
  payload: Record<string, any>;
  status: SuggestionStatus;
  generated_at: string;
  resolved_at: string | null;
};

function rowToSuggestion(row: { id: number; kind: string; title: string; description: string; payload: string; status: string; generated_at: string; resolved_at: string | null }): InsightSuggestion {
  let payload: Record<string, any> = {};
  try { payload = JSON.parse(row.payload); } catch {}
  return {
    id: row.id,
    kind: row.kind as SuggestionKind,
    title: row.title,
    description: row.description,
    payload,
    status: row.status as SuggestionStatus,
    generated_at: row.generated_at,
    resolved_at: row.resolved_at,
  };
}

export function getPendingSuggestions(): InsightSuggestion[] {
  return db.getAllSync<any>(
    `SELECT * FROM insight_suggestions WHERE status = 'pending' ORDER BY generated_at DESC`,
  ).map(rowToSuggestion);
}

export function getResolvedSuggestions(): InsightSuggestion[] {
  return db.getAllSync<any>(
    `SELECT * FROM insight_suggestions WHERE status != 'pending' ORDER BY resolved_at DESC LIMIT 30`,
  ).map(rowToSuggestion);
}

export function getPendingCount(): number {
  const row = db.getFirstSync<{ n: number }>(`SELECT count(*) as n FROM insight_suggestions WHERE status = 'pending'`);
  return row?.n ?? 0;
}

// ─── Personalization gate ─────────────────────────────────────────────────────
// The Settings toggle (`personalization_enabled`) is the single, always-reversible
// source of truth. The onboarding answer (q8_personalization) only seeds its
// *initial* value the first time this is checked — after that, Settings owns it,
// so flipping it never gets silently overridden by a one-time onboarding answer.

export function isPersonalizationEnabled(): boolean {
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'personalization_enabled'`,
  );
  if (row) return row.value === '1';

  // No explicit setting yet — seed it from the onboarding answer (default: on).
  const { answers } = getOnboardingAnswers();
  const initial = answers.q8_personalization !== false;
  db.runSync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('personalization_enabled', ?)`, initial ? '1' : '0');
  return initial;
}

// ─── Suggestion generation — pure rules-based threshold checks ────────────────
// Reuses the exact same PlayerSnapshot the quest engine reads — Insights and the
// quest engine are siblings drawing from one shared aggregation, not a pipeline.

// Matches on kind + dedupe_key regardless of status — once a given suggestion has
// been surfaced (pending, accepted, or dismissed), it never gets generated again.
// That's the entire "don't repeat yourself" guarantee in one query.
function alreadySuggested(kind: SuggestionKind, dedupeKey: string): boolean {
  const row = db.getFirstSync<{ id: number }>(
    `SELECT id FROM insight_suggestions
     WHERE kind = ? AND json_extract(payload, '$.dedupe_key') = ?
     LIMIT 1`,
    kind, dedupeKey,
  );
  return !!row;
}

function insertSuggestion(kind: SuggestionKind, title: string, description: string, payload: Record<string, any>): void {
  db.runSync(
    `INSERT INTO insight_suggestions (kind, title, description, payload, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    kind, title, description, JSON.stringify(payload),
  );
}

function generateNewCategorySuggestions(snapshot: PlayerSnapshot): void {
  const overused = db.getAllSync<{ name: string; attribute: string; weight: number; is_physical: number; is_recreational: number; is_communal: number; color: string }>(
    `SELECT c.name, c.attribute, c.weight, c.is_physical, c.is_recreational, c.is_communal, c.color
     FROM categories c
     WHERE c.is_baseline = 1`,
  );

  for (const cat of overused) {
    const snap = snapshot.categories.find(c => c.category.toLowerCase() === cat.name.toLowerCase());
    if (!snap || snap.times_logged < INSIGHTS_TUNING.overuse_min_logs) continue;

    const dedupeKey = `overuse:${cat.name.toLowerCase()}`;
    if (alreadySuggested('new_category', dedupeKey)) continue;

    insertSuggestion(
      'new_category',
      `Give "${cat.name}" a real name?`,
      `You've logged under "${cat.name}" ${snap.times_logged} times recently — looks like it's become something specific. Want to split it into its own category? It'll keep the same stat focus and styling, you just name it.`,
      {
        dedupe_key: dedupeKey,
        source_category: cat.name,
        inherited: {
          attribute: cat.attribute, weight: cat.weight,
          is_physical: !!cat.is_physical, is_recreational: !!cat.is_recreational,
          is_communal: !!cat.is_communal, color: cat.color,
        },
      },
    );
  }
}

function generateTierReadySuggestions(snapshot: PlayerSnapshot, prior: PlayerSnapshot | null): void {
  for (const cat of snapshot.categories) {
    const stretch = stretchMultiplier(cat.consistency_score);
    if (stretch < INSIGHTS_TUNING.tier_ready_threshold) continue;

    // "Maxed for N consecutive cycles" — compares against the snapshot from the
    // prior cycle (captured before this cycle's refresh overwrote it in storage).
    const priorCat = prior?.categories.find(c => c.category.toLowerCase() === cat.category.toLowerCase());
    const priorStretch = priorCat ? stretchMultiplier(priorCat.consistency_score) : 0;
    if (priorStretch < INSIGHTS_TUNING.tier_ready_threshold) continue;

    const dedupeKey = `tier_ready:${cat.category.toLowerCase()}`;
    if (alreadySuggested('tier_ready', dedupeKey)) continue;

    insertSuggestion(
      'tier_ready',
      `You've grown with "${cat.category}"`,
      `Your consistency with "${cat.category}" has been holding strong for a while now — the quests here have stretched about as far as they can go. That doesn't mean stop; it might just be a good moment to also explore something alongside it.`,
      { dedupe_key: dedupeKey, category: cat.category },
    );
  }
}

function generateMoodTrendSuggestions(snapshot: PlayerSnapshot, prior: PlayerSnapshot | null): void {
  if (!prior || prior.mood.avg_rating === null || snapshot.mood.avg_rating === null) return;

  const delta = snapshot.mood.avg_rating - prior.mood.avg_rating;
  if (Math.abs(delta) < INSIGHTS_TUNING.mood_trend_min_delta) return;

  const direction = delta > 0 ? 'up' : 'down';
  const dedupeKey = `mood_trend:${direction}:${snapshot.computed_at.slice(0, 10)}`;
  if (alreadySuggested('mood_trend', dedupeKey)) return;

  const title = direction === 'up' ? 'Your mood has been lifting' : 'A gentle note on your mood';
  const description = direction === 'up'
    ? `Your average mood has been trending upward over the past couple of weeks — just a quiet observation worth noticing.`
    : `Your average mood has been trending lower over the past couple of weeks. No action needed — just something worth being aware of.`;

  insertSuggestion('mood_trend', title, description, { dedupe_key: dedupeKey, direction, delta: Math.round(delta * 10) / 10 });
}

/** Generates fresh suggestions if personalization is enabled. Call alongside the snapshot refresh — same 7-day cadence. */
export function generateInsightSuggestions(): void {
  if (!isPersonalizationEnabled()) return;
  try {
    // Capture the prior cycle's snapshot + timestamp BEFORE refreshing —
    // getOrRefreshSnapshot overwrites stored state in place once the 7-day
    // gate elapses, so this is the only chance to diff against the old cycle.
    const { last_snapshot_at: priorAt, snapshot: prior } = getStoredSnapshot();
    const snapshot = getOrRefreshSnapshot();
    const justRefreshed = snapshot.computed_at !== priorAt;

    generateNewCategorySuggestions(snapshot);
    // Cycle-over-cycle comparisons only mean anything right at a cycle boundary —
    // outside of a refresh, "prior" and "current" would be the same row, which
    // would let a "2 consecutive cycles" check trivially pass on the very first
    // cycle a threshold is crossed. Gate these on an actual fresh recompute.
    if (justRefreshed) {
      generateTierReadySuggestions(snapshot, prior);
      generateMoodTrendSuggestions(snapshot, prior);
    }
  } catch {}
}

// ─── Resolve (accept / dismiss) ───────────────────────────────────────────────

export function dismissSuggestion(id: number): void {
  db.runSync(
    `UPDATE insight_suggestions SET status = 'dismissed', resolved_at = datetime('now', 'localtime') WHERE id = ?`,
    id,
  );
}

/**
 * Accepts a suggestion, performing its real side-effect.
 * - new_category: creates the category with inherited traits + the user-supplied name
 * - tier_ready / mood_trend: pure observations — accepting just acknowledges/dismisses
 */
export function acceptSuggestion(id: number, userInput?: { categoryName?: string }): void {
  const row = db.getFirstSync<any>(`SELECT * FROM insight_suggestions WHERE id = ?`, id);
  if (!row) return;
  const suggestion = rowToSuggestion(row);

  if (suggestion.kind === 'new_category') {
    const name = userInput?.categoryName?.trim();
    if (!name) return; // caller must supply a name — nothing to create without one
    const { inherited } = suggestion.payload;
    addCategory(
      name, inherited.weight, inherited.attribute,
      inherited.is_physical, inherited.is_recreational, inherited.is_communal, inherited.color,
    );
  }

  db.runSync(
    `UPDATE insight_suggestions SET status = 'accepted', resolved_at = datetime('now', 'localtime') WHERE id = ?`,
    id,
  );
}
