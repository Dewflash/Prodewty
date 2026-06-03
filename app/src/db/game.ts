import { db } from './schema';
import { getRPGState, applyXP, getCoinMultiplier } from './rpg';
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
  objective_text: string | null;
  duration_mins: number;
  category: string;
};

export type DungeonRun = {
  id: number;
  dungeon_id: number;
  completed_at: string;
  result: string;
  coins_earned: number;
  hp_change: number;
  item_dropped: string | null;
  started_at: string | null;
  status: string;
};

export type ActiveDungeonRun = {
  run_id: number;
  dungeon_id: number;
  started_at: string;
  dungeon_name: string;
  duration_mins: number;
  objective_text: string | null;
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
  accepted_at: string | null;
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

export type DungeonClearResult = {
  xpEarned: number;
  coinsEarned: number;
  itemDropped: string | null;
  itemRarity: string | null;
  itemSlotType: string | null;
};

// ─── Rarity drop system ───────────────────────────────────────────────────────

type RarityTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Chromatic';

const DROP_TABLE: Record<string, { rarity: RarityTier; chance: number }[]> = {
  E: [
    { rarity: 'E',  chance: 0.30 },
    { rarity: 'D',  chance: 0.12 },
    { rarity: 'C',  chance: 0.03 },
  ],
  D: [{ rarity: 'D', chance: 0.40 }, { rarity: 'C', chance: 0.20 }, { rarity: 'B', chance: 0.08 }, { rarity: 'A', chance: 0.02 }],
  C: [{ rarity: 'C', chance: 0.40 }, { rarity: 'B', chance: 0.25 }, { rarity: 'A', chance: 0.10 }, { rarity: 'S', chance: 0.03 }],
  B: [{ rarity: 'B', chance: 0.40 }, { rarity: 'A', chance: 0.25 }, { rarity: 'S', chance: 0.15 }, { rarity: 'SS', chance: 0.05 }],
  A: [{ rarity: 'A', chance: 0.35 }, { rarity: 'S', chance: 0.25 }, { rarity: 'SS', chance: 0.10 }, { rarity: 'SSS', chance: 0.03 }],
  S: [{ rarity: 'S', chance: 0.30 }, { rarity: 'SS', chance: 0.20 }, { rarity: 'SSS', chance: 0.08 }, { rarity: 'Chromatic', chance: 0.02 }],
};

// Equipment slot pool per dungeon category
const CATEGORY_SLOTS: Record<string, string[]> = {
  Workout:  ['top', 'pants', 'coat', 'gloves', 'shoes', 'sword'],
  Study:    ['ring', 'necklace', 'grimoire', 'scepter'],
  Devotion: ['goblet', 'bracelet', 'necklace', 'scepter'],
  Journal:  ['ring', 'necklace', 'dagger', 'bracelet'],
  default:  ['top', 'ring', 'necklace', 'dagger', 'sword', 'shield'],
};

function rollDrop(rank: string): { rarity: RarityTier; slotType: string } | null {
  const table = DROP_TABLE[rank] ?? DROP_TABLE['E'];
  const roll = Math.random();
  let cum = 0;
  for (const entry of table) {
    cum += entry.chance;
    if (roll < cum) return { rarity: entry.rarity, slotType: '' }; // slot filled below
  }
  return null;
}

function pickSlot(category: string): string {
  const pool = CATEGORY_SLOTS[category] ?? CATEGORY_SLOTS['default'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDropRates(rank: string): { rarity: string; chance: number }[] {
  return DROP_TABLE[rank] ?? DROP_TABLE['E'];
}

const RARITY_ORDER: Record<string, number> = {
  Chromatic: 0, SSS: 1, SS: 2, S: 3, A: 4, B: 5, C: 6, D: 7, E: 8,
};

export type InventoryItem = {
  id: number; item_name: string; rarity: string;
  slot_type: string | null; description: string | null; quantity: number;
};

export function getInventoryBySlot(slotType: string): InventoryItem[] {
  try {
    const rows = db.getAllSync<InventoryItem>(
      `SELECT id, item_name, COALESCE(rarity,'E') as rarity, slot_type, description, quantity
       FROM inventory WHERE slot_type = ? AND category = 'game' ORDER BY id DESC`,
      slotType,
    );
    return rows.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9));
  } catch { return []; }
}

export function getInventoryByStat(statKey: string, itemCategory: 'consumable' | 'catalyst'): InventoryItem[] {
  const slotType = `${itemCategory}_${statKey}`;
  return getInventoryBySlot(slotType);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sqlNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
}

// ─── Computed stats ───────────────────────────────────────────────────────────

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
  const workout    = logCount('%"Workout"%');
  const coding     = logCount('%"Coding"%');
  const studyEtc   = logCount('%"Study"%') + logCount('%"Reading"%') + logCount('%"Devotion"%');
  const admin      = logCount('%"Admin"%');
  const journalEtc = logCount('%"Journal"%') + logCount('%"Devotion"%');
  const total      = totalActivityCount();

  const str_ap = rpg.strength    ?? 0; const str_auto = Math.floor(workout    / 5);
  const agi_ap = rpg.agility     ?? 0; const agi_auto = Math.floor(admin      / 7);
  const foc_ap = rpg.focus       ?? 0; const foc_auto = Math.floor(coding     / 5);
  const wis_ap = rpg.wisdom      ?? 0; const wis_auto = Math.floor(studyEtc   / 5);
  const spr_ap = rpg.resilience  ?? 0; const spr_auto = Math.floor(journalEtc / 5);
  const per_ap = rpg.per_stat    ?? 0; const per_auto = Math.floor(total      / 15);
  const sta_ap = rpg.sta_stat    ?? 0; const sta_auto = Math.floor(workout    / 7);

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
    return rows.reduce((s, r) => s + r.energy_rating, 0) / rows.length <= 4;
  } catch { return false; }
}

// ─── Stat allocation ──────────────────────────────────────────────────────────

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

// ─── Death ────────────────────────────────────────────────────────────────────

export type DeathCause = 'hp' | 'emotional' | 'physical' | 'mental' | null;

export function getDeathCause(): DeathCause {
  try {
    const rpg    = getRPGState();
    const health = getHealthState();
    if ((rpg.hp ?? 100) <= 0)    return 'hp';
    if (health.emotional <= 0)   return 'emotional';
    if (health.physical  <= 0)   return 'physical';
    if (health.mental    <= 0)   return 'mental';
    return null;
  } catch { return null; }
}

export function handleDeath(cause: DeathCause): void {
  const msg = cause === 'hp'
    ? 'HP reached zero.'
    : `${cause?.charAt(0).toUpperCase()}${cause?.slice(1)} health reached zero.`;
  addGameLog('death', msg);
  // Only reset HP to 0 when the cause is HP depletion.
  // For health stat deaths, HP stays intact — revival restores the stat instead.
  if (cause === 'hp') {
    db.runSync('UPDATE rpg_state SET hp = 0, death_acknowledged = 0 WHERE id = 1');
  } else {
    db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1');
  }
  try { db.runSync('UPDATE health_state SET health_critical = 0 WHERE id = 1'); } catch {}
}

export function acknowledgeDeathIgnore(): void {
  db.runSync('UPDATE rpg_state SET death_acknowledged = 1 WHERE id = 1');
}
export function resetDeathIgnore(): void {
  db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1');
}

// ─── Revival quests ───────────────────────────────────────────────────────────

export type RevivalQuest = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  hp_restore: number;
  duration_mins: number;
};

export function getRevivalQuests(): RevivalQuest[] {
  return db.getAllSync<RevivalQuest>('SELECT * FROM revival_quests WHERE is_active = 1 ORDER BY hp_restore DESC');
}

export function completeRevivalQuest(quest: RevivalQuest): void {
  const rpg    = getRPGState();
  const health = getHealthState();
  const restore = quest.hp_restore;
  const isHPDeath = (rpg.hp ?? 100) <= 0;

  db.runSync(`UPDATE rpg_state SET death_acknowledged = 0, revival_count = revival_count + 1 WHERE id = 1`);

  if (isHPDeath) {
    db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + ?) WHERE id = 1`, restore);
  } else {
    // Only restore health bars that are actually at 0 — leave non-zero bars untouched
    const parts: string[] = [];
    if (health.emotional <= 0) parts.push(`emotional = ${restore}`);
    if (health.physical  <= 0) parts.push(`physical  = ${restore}`);
    if (health.mental    <= 0) parts.push(`mental    = ${restore}`);
    if (parts.length > 0) {
      try { db.runSync(`UPDATE health_state SET ${parts.join(', ')} WHERE id = 1`); } catch {}
    }
  }

  // Log the revival activity
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const ts    = `${today} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  try {
    db.runSync(
      `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at, categories, xp_awarded, mood_rating)
       VALUES (?, ?, 'daily', 'quest', ?, ?, ?, 15, 0)`,
      quest.category, `Revival: ${quest.title}`, today, ts,
      JSON.stringify([quest.category]),
    );
  } catch {}
  addGameLog('quest_complete', `Revival quest completed: ${quest.title}. HP restored.`);
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export function getDungeons(): Dungeon[] {
  return db.getAllSync<Dungeon>('SELECT * FROM dungeons ORDER BY id ASC');
}

function getLastCompletedRun(dungeonId: number): DungeonRun | null {
  return db.getFirstSync<DungeonRun>(
    "SELECT * FROM dungeon_runs WHERE dungeon_id = ? AND status IN ('completed','failed') ORDER BY completed_at DESC LIMIT 1",
    dungeonId,
  ) ?? null;
}

export function isDungeonOnCooldown(dungeonId: number, cooldownHours: number): boolean {
  const last = getLastCompletedRun(dungeonId);
  if (!last) return false;
  const hoursAgo = (Date.now() - new Date(last.completed_at).getTime()) / 3600000;
  return hoursAgo < cooldownHours;
}

export function getDungeonCooldownRemaining(dungeonId: number, cooldownHours: number): string | null {
  const last = getLastCompletedRun(dungeonId);
  if (!last) return null;
  const elapsed  = (Date.now() - new Date(last.completed_at).getTime()) / 3600000;
  const remaining = cooldownHours - elapsed;
  if (remaining <= 0) return null;
  if (remaining >= 24) return `${Math.ceil(remaining / 24)}d`;
  return `${Math.ceil(remaining)}h`;
}

export function startDungeon(dungeonId: number): number {
  const now = sqlNow();
  db.runSync(
    `INSERT INTO dungeon_runs (dungeon_id, started_at, status, result, coins_earned, hp_change, completed_at)
     VALUES (?, ?, 'active', 'active', 0, 0, ?)`,
    dungeonId, now, now,
  );
  return db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
}

export function getActiveDungeonRun(): ActiveDungeonRun | null {
  return db.getFirstSync<ActiveDungeonRun>(
    `SELECT dr.id as run_id, dr.dungeon_id, dr.started_at,
            d.name as dungeon_name, d.duration_mins, d.objective_text
     FROM dungeon_runs dr
     JOIN dungeons d ON d.id = dr.dungeon_id
     WHERE dr.status = 'active'
     ORDER BY dr.id DESC LIMIT 1`,
  ) ?? null;
}

export function submitDungeonClear(runId: number, dungeon: Dungeon): DungeonClearResult {
  const xpEarned    = 45;
  const coinsEarned = Math.floor(dungeon.coin_reward * getCoinMultiplier());
  let itemDropped: string | null = null;
  let itemRarity: string | null = null;
  let itemSlotType: string | null = null;

  const drop = rollDrop(dungeon.rank);
  if (drop) {
    const slot = pickSlot(dungeon.category ?? 'default');
    itemRarity   = drop.rarity;
    itemSlotType = slot;
    itemDropped  = `${drop.rarity}-rank ${slot.replace('_', ' ')}`;
    try {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description)
         VALUES (?, 'equipment', 'game', ?, ?, ?)`,
        itemDropped, slot, drop.rarity,
        `Dropped from ${dungeon.name} (${dungeon.rank}-rank gate).`,
      );
    } catch {}
  }

  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'completed', result = 'win', completed_at = ?, coins_earned = ?, item_dropped = ? WHERE id = ?`,
    now, coinsEarned, itemDropped, runId,
  );
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', coinsEarned);

  try {
    db.runSync(
      `INSERT INTO activity_logs (entry_type, categories, category, description, duration_mins, xp_awarded, mood_rating, log_date)
       VALUES ('dungeon', ?, ?, ?, ?, ?, 0, date('now','localtime'))`,
      JSON.stringify([dungeon.category]),
      dungeon.category,
      `${dungeon.rank}-Rank Gate: ${dungeon.name}`,
      dungeon.duration_mins,
      xpEarned,
    );
  } catch {}

  try { applyXP(xpEarned, dungeon.category); } catch {}

  addGameLog(
    'dungeon_win',
    `Gate Cleared: ${dungeon.name}. +${xpEarned} XP · +${coinsEarned} coins.${itemDropped ? ` Obtained: ${itemDropped}.` : ''}`,
  );

  return { xpEarned, coinsEarned, itemDropped, itemRarity, itemSlotType };
}

export function failDungeon(runId: number, dungeon: Dungeon): void {
  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'failed', result = 'fail', completed_at = ?, hp_change = -20 WHERE id = ?`,
    now, runId,
  );
  db.runSync('UPDATE rpg_state SET hp = MAX(0, hp - 20) WHERE id = 1');
  addGameLog('dungeon_fail', `Gate Failed: ${dungeon.name}. HP -20.`);
}

export function abandonDungeon(runId: number): void {
  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'abandoned', result = 'abandoned', completed_at = ? WHERE id = ?`,
    now, runId,
  );
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export function getPendingQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'pending' ORDER BY generated_at DESC",
  );
}

export function getAcceptedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'accepted' ORDER BY accepted_at DESC",
  );
}

export function generateQuests(): void {
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

    const existing = db.getAllSync<{ category: string }>(
      "SELECT category FROM quests WHERE status IN ('pending','accepted')",
    ).map(r => r.category);

    for (const { category } of candidates) {
      if (existing.includes(category)) continue;
      db.runSync(
        `INSERT INTO quests (title, description, category, quest_type, coin_reward, status)
         VALUES (?, ?, ?, 'weekly', 30, 'pending')`,
        `Log: ${category}`,
        `You haven't logged ${category} recently. Complete a ${category} session.`,
        category,
      );
    }

    const total = db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM activity_logs')?.n ?? 0;
    if (total === 0 && existing.length === 0) {
      for (const [t, d, c, r] of [
        ['First Activity',  'Log any activity to begin your journey.',           'Any',  20],
        ['Record Your Mood', "Fill in today's mood, energy, and productivity.", 'Mood', 15],
      ] as const) {
        if (!existing.includes(c)) {
          db.runSync(
            `INSERT INTO quests (title, description, category, quest_type, coin_reward, status) VALUES (?, ?, ?, 'daily', ?, 'pending')`,
            t, d, c, r,
          );
        }
      }
    }
  } catch {}
}

export function acceptQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'accepted', accepted_at = ? WHERE id = ?`, sqlNow(), questId);
}

export function completeQuest(questId: number, notes?: string): void {
  const quest = db.getFirstSync<Quest>('SELECT * FROM quests WHERE id = ?', questId);
  if (!quest) return;

  const xpEarned = 30;
  db.runSync(`UPDATE quests SET status = 'completed' WHERE id = ?`, questId);
  db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?, ?)`, questId, quest.coin_reward);
  const questCoins = Math.floor(quest.coin_reward * getCoinMultiplier());
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', questCoins);

  const desc = notes?.trim() ? `${quest.title} — ${notes.trim()}` : quest.title;
  try {
    db.runSync(
      `INSERT INTO activity_logs (entry_type, categories, category, description, xp_awarded, mood_rating, log_date)
       VALUES ('quest', ?, ?, ?, ?, 0, date('now','localtime'))`,
      JSON.stringify([quest.category]), quest.category, desc, xpEarned,
    );
  } catch {}

  try { applyXP(xpEarned, quest.category); } catch {}

  addGameLog('quest_complete', `Quest completed: ${quest.title}. +${xpEarned} XP · +${quest.coin_reward} coins.`);
}

export function skipQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'skipped' WHERE id = ?`, questId);
}

export function deleteQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'deleted' WHERE id = ?`, questId);
}

// ─── Game log ─────────────────────────────────────────────────────────────────

export function getGameLogs(): GameLog[] {
  return db.getAllSync<GameLog>('SELECT * FROM game_logs ORDER BY created_at DESC LIMIT 100');
}

export function addGameLog(event_type: string, description: string): void {
  try { db.runSync(`INSERT INTO game_logs (event_type, description) VALUES (?, ?)`, event_type, description); } catch {}
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export function getQuestCompletedCount(): number {
  return db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM quest_completions')?.n ?? 0;
}

export function getDeathCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM game_logs WHERE event_type = 'death'",
  )?.n ?? 0;
}
export function getAbandonedCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM dungeon_runs WHERE status = 'abandoned'",
  )?.n ?? 0;
}
export function getSkippedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'skipped' ORDER BY generated_at DESC LIMIT 10",
  );
}

export function getCompletedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'completed' ORDER BY generated_at DESC LIMIT 20",
  );
}

export function reinstateQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'pending', accepted_at = NULL WHERE id = ?`, questId);
}

export function purchaseHPBoost(): 'ok' | 'insufficient_coins' | 'hp_not_critical' {
  const rpg = getRPGState();
  if ((rpg.hp ?? 100) > 30) return 'hp_not_critical';
  if ((rpg.coins ?? 0) < 100) return 'insufficient_coins';
  db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + 30), coins = coins - 100 WHERE id = 1`);
  return 'ok';
}
