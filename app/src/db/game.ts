import { db } from './schema';
import { getRPGState } from './rpg';
import { getHealthState } from './health';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Dungeon = {
  id: number;
  name: string;
  rank: string;
  flavor_text: string | null;
  primary_stat: string;
  secondary_stat: string | null;
  difficulty: number;
  coin_reward: number;
  item_drop_chance: number;
  item_name: string | null;
  item_description: string | null;
  cooldown_hours: number;
};

export type DungeonRun = {
  id: number;
  dungeon_id: number;
  completed_at: string;
  result: 'win' | 'fail';
  coins_earned: number;
  hp_change: number;
  item_dropped: string | null;
};

export type Quest = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  quest_type: string;
  status: string;
  generated_at: string;
  coin_reward: number;
  stat_hint: string | null;
};

export type GameLog = {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
};

export type GameStats = {
  str: number; str_ap: number; str_auto: number;
  agi: number; agi_ap: number; agi_auto: number;
  foc: number; foc_ap: number; foc_auto: number;
  wis: number; wis_ap: number; wis_auto: number;
  spr: number; spr_ap: number; spr_auto: number;
  per: number; per_ap: number; per_auto: number;
  sta: number; sta_ap: number; sta_auto: number;
};

// ─── Stats computation ────────────────────────────────────────────────────────

function logCount(likePat: string): number {
  try {
    return db.getFirstSync<{ n: number }>(
      `SELECT count(*) as n FROM activity_logs WHERE entry_type = 'activity' AND categories LIKE ?`,
      likePat,
    )?.n ?? 0;
  } catch { return 0; }
}

function totalActivityCount(): number {
  try {
    return db.getFirstSync<{ n: number }>(
      `SELECT count(*) as n FROM activity_logs WHERE entry_type = 'activity'`,
    )?.n ?? 0;
  } catch { return 0; }
}

export function getComputedStats(): GameStats {
  const rpg = getRPGState();
  const workout  = logCount('%"Workout"%');
  const coding   = logCount('%"Coding"%');
  const studyEtc = (logCount('%"Study"%') + logCount('%"Reading"%') + logCount('%"Devotion"%'));
  const admin    = logCount('%"Admin"%');
  const journalEtc = (logCount('%"Journal"%') + logCount('%"Devotion"%'));
  const total    = totalActivityCount();

  const str_ap = rpg.strength ?? 0;  const str_auto = Math.floor(workout  / 5);
  const agi_ap = rpg.agility  ?? 0;  const agi_auto = Math.floor(admin    / 7);
  const foc_ap = rpg.focus    ?? 0;  const foc_auto = Math.floor(coding   / 5);
  const wis_ap = rpg.wisdom   ?? 0;  const wis_auto = Math.floor(studyEtc / 5);
  const spr_ap = rpg.resilience ?? 0; const spr_auto = Math.floor(journalEtc / 5);
  const per_ap = rpg.per_stat ?? 0;  const per_auto = Math.floor(total    / 15);
  const sta_ap = rpg.sta_stat ?? 0;  const sta_auto = Math.floor(workout  / 7);

  return {
    str: str_ap + str_auto, str_ap, str_auto,
    agi: agi_ap + agi_auto, agi_ap, agi_auto,
    foc: foc_ap + foc_auto, foc_ap, foc_auto,
    wis: wis_ap + wis_auto, wis_ap, wis_auto,
    spr: spr_ap + spr_auto, spr_ap, spr_auto,
    per: per_ap + per_auto, per_ap, per_auto,
    sta: sta_ap + sta_auto, sta_ap, sta_auto,
  };
}

export function getFatigue(): boolean {
  try {
    const rows = db.getAllSync<{ energy_rating: number }>(
      "SELECT energy_rating FROM activity_logs WHERE entry_type = 'mood' AND energy_rating > 0 ORDER BY log_date DESC LIMIT 7",
    );
    if (rows.length < 3) return false;
    const avg = rows.reduce((s, r) => s + r.energy_rating, 0) / rows.length;
    return avg <= 4;
  } catch { return false; }
}

// ─── Stat allocation (AP → stat) ─────────────────────────────────────────────

const STAT_COLUMN: Record<string, string> = {
  str: 'strength', agi: 'agility', foc: 'focus',
  wis: 'wisdom',   spr: 'resilience', per: 'per_stat', sta: 'sta_stat',
};

export function allocateStat(statKey: string): 'ok' | 'no_ap' | 'invalid_stat' {
  const col = STAT_COLUMN[statKey];
  if (!col) return 'invalid_stat';
  const rpg = getRPGState();
  if ((rpg.ap ?? 0) < 1) return 'no_ap';
  db.runSync(`UPDATE rpg_state SET ${col} = ${col} + 1, ap = ap - 1 WHERE id = 1`);
  return 'ok';
}

// ─── Death check ──────────────────────────────────────────────────────────────

export type DeathCause = 'hp' | 'emotional' | 'physical' | 'mental' | null;

export function getDeathCause(): DeathCause {
  try {
    const rpg    = getRPGState();
    const health = getHealthState();
    if ((rpg.hp ?? 100) <= 0) return 'hp';
    if (health.emotional <= 0) return 'emotional';
    if (health.physical  <= 0) return 'physical';
    if (health.mental    <= 0) return 'mental';
    return null;
  } catch { return null; }
}

export function handleDeath(cause: DeathCause): void {
  const msg = cause === 'hp'
    ? 'HP reached zero during a quest.'
    : `${cause?.charAt(0).toUpperCase()}${cause?.slice(1)} health reached zero.`;
  addGameLog('death', msg);
  // Penalty TBD — reset HP to 50 for now
  db.runSync('UPDATE rpg_state SET hp = 50 WHERE id = 1');
  // Clear health_critical flag
  try { db.runSync('UPDATE health_state SET health_critical = 0 WHERE id = 1'); } catch {}
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export function getDungeons(): Dungeon[] {
  return db.getAllSync<Dungeon>('SELECT * FROM dungeons ORDER BY id ASC');
}

export function getLastRun(dungeonId: number): DungeonRun | null {
  return db.getFirstSync<DungeonRun>(
    'SELECT * FROM dungeon_runs WHERE dungeon_id = ? ORDER BY completed_at DESC LIMIT 1',
    dungeonId,
  ) ?? null;
}

export function isDungeonOnCooldown(dungeonId: number, cooldownHours: number): boolean {
  const last = getLastRun(dungeonId);
  if (!last) return false;
  const hoursAgo = (Date.now() - new Date(last.completed_at).getTime()) / 3600000;
  return hoursAgo < cooldownHours;
}

function applyHealthDebuffs(stats: GameStats): GameStats {
  const h = getHealthState();
  const debuff = (pct: number, threshold = 60) => pct < threshold ? 0.8 : 1.0;
  const em = debuff(h.emotional);
  const ph = debuff(h.physical);
  const mn = debuff(h.mental);
  return {
    ...stats,
    str: Math.floor(stats.str * ph), str_ap: stats.str_ap, str_auto: stats.str_auto,
    agi: Math.floor(stats.agi * ph), agi_ap: stats.agi_ap, agi_auto: stats.agi_auto,
    foc: Math.floor(stats.foc * Math.min(em, mn)), foc_ap: stats.foc_ap, foc_auto: stats.foc_auto,
    wis: Math.floor(stats.wis * em), wis_ap: stats.wis_ap, wis_auto: stats.wis_auto,
    spr: Math.floor(stats.spr * mn), spr_ap: stats.spr_ap, spr_auto: stats.spr_auto,
    per: Math.floor(stats.per * Math.min(em, mn)), per_ap: stats.per_ap, per_auto: stats.per_auto,
    sta: Math.floor(stats.sta * ph), sta_ap: stats.sta_ap, sta_auto: stats.sta_auto,
  };
}

export type DungeonResult = {
  win: boolean;
  playerPower: number;
  dungeonPower: number;
  hpChange: number;
  coinsEarned: number;
  itemDropped: string | null;
  itemDescription: string | null;
};

export function runDungeon(dungeon: Dungeon): DungeonResult {
  const raw   = getComputedStats();
  const stats = applyHealthDebuffs(raw);

  const primaryVal   = stats[dungeon.primary_stat   as keyof GameStats] as number ?? 0;
  const secondaryVal = dungeon.secondary_stat ? (stats[dungeon.secondary_stat as keyof GameStats] as number ?? 0) : 0;

  const playerPower  = primaryVal * 2 + secondaryVal + Math.floor(Math.random() * 6);
  const dungeonPower = dungeon.difficulty * 3 + Math.floor(Math.random() * 4);
  const win          = playerPower >= dungeonPower;

  const hpChange    = win ? 0 : -20;
  const coinsEarned = win ? dungeon.coin_reward : Math.floor(dungeon.coin_reward * 0.2);

  let itemDropped: string | null = null;
  let itemDescription: string | null = null;
  if (win && dungeon.item_name && Math.random() < dungeon.item_drop_chance) {
    itemDropped    = dungeon.item_name;
    itemDescription = dungeon.item_description;
    try {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, description) VALUES (?, 'equipment', ?)`,
        dungeon.item_name, dungeon.item_description ?? '',
      );
    } catch {}
  }

  // Save run
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  db.runSync(
    `INSERT INTO dungeon_runs (dungeon_id, completed_at, result, coins_earned, hp_change, item_dropped)
     VALUES (?, ?, ?, ?, ?, ?)`,
    dungeon.id, ts, win ? 'win' : 'fail', coinsEarned, hpChange, itemDropped,
  );

  // Apply HP change
  db.runSync('UPDATE rpg_state SET hp = MAX(0, MIN(hp_max, hp + ?)) WHERE id = 1', hpChange);

  // Apply coins
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', coinsEarned);

  // Log event
  addGameLog(
    win ? 'dungeon_win' : 'dungeon_fail',
    `${win ? 'Cleared' : 'Failed'} ${dungeon.name}. +${coinsEarned} coins.${itemDropped ? ` Obtained: ${itemDropped}.` : ''}`,
  );

  return { win, playerPower, dungeonPower, hpChange, coinsEarned, itemDropped, itemDescription };
}

// ─── Quest board ──────────────────────────────────────────────────────────────

export function getActiveQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'active' ORDER BY generated_at DESC",
  );
}

export function generateQuests(): void {
  // Find categories logged ≥2 times in last 28 days but not in last 7 days
  try {
    const candidates = db.getAllSync<{ category: string; times: number }>(
      `SELECT json_extract(categories, '$[0]') as category, count(*) as times
       FROM activity_logs
       WHERE entry_type = 'activity'
         AND log_date >= date('now', '-28 days')
         AND json_extract(categories, '$[0]') IS NOT NULL
       GROUP BY category
       HAVING times >= 2
         AND category NOT IN (
           SELECT json_extract(categories, '$[0]')
           FROM activity_logs
           WHERE entry_type = 'activity'
             AND log_date >= date('now', '-7 days')
         )
       ORDER BY times DESC
       LIMIT 3`,
    );

    const existing = getActiveQuests().map(q => q.category);

    for (const { category } of candidates) {
      if (existing.includes(category)) continue;
      const reward = 30;
      db.runSync(
        `INSERT INTO quests (title, description, category, quest_type, coin_reward, stat_hint)
         VALUES (?, ?, ?, 'weekly', ?, ?)`,
        `Log: ${category}`,
        `You haven't logged ${category} this week. Complete a ${category} session.`,
        category,
        reward,
        null,
      );
    }

    // Onboarding quests if no logs at all
    const total = db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM activity_logs')?.n ?? 0;
    if (total === 0 && existing.length === 0) {
      const starters = [
        ['First Activity', 'Log any activity to begin your journey.', 'Any', 20],
        ['Record Your Mood', 'Fill in today\'s mood, energy, and productivity.', 'Mood', 15],
      ] as const;
      for (const [t, d, c, r] of starters) {
        if (!existing.includes(c)) {
          db.runSync(
            `INSERT INTO quests (title, description, category, quest_type, coin_reward) VALUES (?, ?, ?, 'daily', ?)`,
            t, d, c, r,
          );
        }
      }
    }
  } catch {}
}

export function completeQuest(questId: number): void {
  const quest = db.getFirstSync<Quest>('SELECT * FROM quests WHERE id = ?', questId);
  if (!quest) return;
  db.runSync(`UPDATE quests SET status = 'completed' WHERE id = ?`, questId);
  db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?, ?)`, questId, quest.coin_reward);
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', quest.coin_reward);
  addGameLog('quest_complete', `Quest completed: ${quest.title}. +${quest.coin_reward} coins.`);
}

export function deleteQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'deleted' WHERE id = ?`, questId);
}

export function skipQuest(questId: number): void {
  // Skip: remove for today. The generator will re-create it tomorrow if still relevant.
  db.runSync(`UPDATE quests SET status = 'skipped' WHERE id = ?`, questId);
}

// ─── Game log ─────────────────────────────────────────────────────────────────

export function getGameLogs(): GameLog[] {
  return db.getAllSync<GameLog>(
    'SELECT * FROM game_logs ORDER BY created_at DESC LIMIT 100',
  );
}

export function addGameLog(event_type: string, description: string): void {
  try { db.runSync(`INSERT INTO game_logs (event_type, description) VALUES (?, ?)`, event_type, description); } catch {}
}

// ─── Quest count ──────────────────────────────────────────────────────────────
export function getQuestCompletedCount(): number {
  return db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM quest_completions')?.n ?? 0;
}
export function getDeathCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM game_logs WHERE event_type = 'death'"
  )?.n ?? 0;
}
