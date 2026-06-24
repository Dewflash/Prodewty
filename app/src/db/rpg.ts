import { db } from './schema';
import { xpRequiredForLevel, titleForLevel } from '../services/xpEngine';
import { sqlNow, localDateStr } from '../utils/date';
import { triggerCurrencyRefresh } from './currencySignal';
import { triggerDeathCheck } from './deathCheckSignal';
import { logicalToday, logicalYesterday } from './dayBoundary';

export type RPGState = {
  current_level: number;
  total_xp: number;
  xp_to_next_level: number;
  unallocated_points: number;
  strength: number;
  wisdom: number;
  focus: number;
  agility: number;
  resilience: number;
  per_stat: number;
  sta_stat: number;
  strength_auto: number;
  wisdom_auto: number;
  focus_auto: number;
  agility_auto: number;
  resilience_auto: number;
  per_stat_auto: number;
  sta_stat_auto: number;
  title: string;
  streak_days: number;
  last_active_date: string | null;
  highest_xp_attained: number;
  coins: number;
  ap: number;
  streak_freezes: number;
  hp: number;
  hp_max: number;
  mp: number;
  job: string;
  // v11
  self_destruct_count: number;
  last_self_destruct: string | null;
  current_mood: string;
  level_up_pending: number;
  level_up_ap_gained: number;
  level_up_coins_gained: number;
  level_up_right_rank: string | null;
  death_acknowledged: number;
  // v14
  gems: number;
  // v15
  vigor: number;
  last_vigor_date: string | null;
  // v21
  spendable_xp: number;
  total_xp_earned: number;
  // v47
  last_key_used_at: string | null;
  // v48
  last_daily_gen_date: string | null;
};

export function getRPGState(): RPGState {
  return db.getFirstSync<RPGState>('SELECT * FROM rpg_state WHERE id = 1')!;
}

// Called on app open — adds today's optimistic +1; confirms yesterday as clean if no SD logged
export function checkVigor(): { gemAwarded: boolean } {
  try {
    const state = getRPGState();
    const today = logicalToday();
    const lastVigor = (state as any).last_vigor_date as string | null;
    if (lastVigor === today) return { gemAwarded: false }; // already ran today

    const yesterday = logicalYesterday();
    const sdRow = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM activity_logs WHERE entry_type = 'self_destruct' AND COALESCE(effective_date, log_date) = ?`,
      yesterday,
    );
    const yesterdayClean = (sdRow?.cnt ?? 0) === 0;

    if (yesterdayClean && lastVigor !== null) {
      // Yesterday confirmed clean and we have a prior login — permanent vigor + gem
      db.runSync(
        `UPDATE rpg_state SET vigor = vigor + 1, gems = gems + 1, last_vigor_date = ? WHERE id = 1`,
        today,
      );
      return { gemAwarded: true };
    } else {
      // First ever login OR yesterday had SD — optimistic +1 only, no gem
      db.runSync(
        `UPDATE rpg_state SET vigor = vigor + 1, last_vigor_date = ? WHERE id = 1`,
        today,
      );
      return { gemAwarded: false };
    }
  } catch { return { gemAwarded: false }; }
}

export function getAnima(): number {
  try {
    const state = getRPGState();
    return ((state as any).vigor ?? 0) - (state.self_destruct_count ?? 0);
  } catch { return 0; }
}

// Coin multiplier: scales with Anima at 0.5% per point (anima -50 = 0.75x / 25%
// drop, anima +50 = 1.25x / 25% boost), clamped to 0x-3x so it can't go negative
// or run away unbounded as vigor accumulates over time.
export function getCoinMultiplier(): number {
  return Math.max(0, Math.min(3, 1 + getAnima() * 0.005));
}

// Weekly log boost: 1.05× on all activity logs for 7 days after submitting a weekly reflection.
export function getWeeklyBoostMult(): number {
  try {
    const row = db.getFirstSync<{ weekly_boost_until: string | null }>(
      'SELECT weekly_boost_until FROM rpg_state WHERE id = 1',
    );
    if (!row?.weekly_boost_until) return 1.0;
    const today = logicalToday();
    return row.weekly_boost_until >= today ? 1.05 : 1.0;
  } catch { return 1.0; }
}

export function activateWeeklyBoost(): void {
  try {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const untilStr = localDateStr(until);
    db.runSync('UPDATE rpg_state SET weekly_boost_until = ? WHERE id = 1', untilStr);
  } catch {}
}

// Called on app open — auto-applies streak freeze if exactly one day was missed
export function checkStreakFreeze(): void {
  try {
    const state = getRPGState();
    if (!state.last_active_date) return;
    const today = logicalToday();
    if (state.last_active_date >= today) return;
    const daysMissed = Math.floor(
      (new Date(today).getTime() - new Date(state.last_active_date).getTime()) / 86400000,
    );
    if (daysMissed === 1) return;
    if (daysMissed === 2 && (state.streak_freezes ?? 0) > 0) {
      // Consume freeze and back-date last_active_date to yesterday so next
      // applyXP call sees diff=1 and extends the streak instead of resetting it.
      const yesterday = logicalYesterday();
      db.runSync(
        'UPDATE rpg_state SET streak_freezes = streak_freezes - 1, last_active_date = ? WHERE id = 1',
        yesterday,
      );
    } else if (daysMissed > 1) {
      db.runSync('UPDATE rpg_state SET streak_days = 0 WHERE id = 1');
    }
  } catch {}
}

export function isInDeathState(): boolean {
  try {
    const rpg = getRPGState();
    if ((rpg.hp ?? 100) <= 0) return true;
    const h = db.getFirstSync<{ e: number; p: number; m: number }>(
      'SELECT emotional as e, physical as p, mental as m FROM health_state WHERE id = 1',
    );
    if (!h) return false;
    return h.e <= 0 || h.p <= 0 || h.m <= 0;
  } catch { return false; }
}

export function selfDestruct(): { count: number; date: string } {
  const realToday = localDateStr();
  const today = logicalToday(); // logical day — drives dedup/vigor, not display
  const state = getRPGState();
  const isFirstSDToday = (state.last_self_destruct ?? '') !== today;
  db.runSync(
    `UPDATE rpg_state SET
       self_destruct_count = self_destruct_count + 1,
       last_self_destruct = ?
       ${isFirstSDToday ? ', vigor = MAX(0, vigor - 1)' : ''}
     WHERE id = 1`,
    today,
  );
  // Health penalties: physical -45, emotional -20, mental -10
  try {
    db.runSync(
      `UPDATE health_state SET
         physical  = MAX(0, physical  - 45),
         emotional = MAX(0, emotional - 20),
         mental    = MAX(0, mental    - 10)
       WHERE id = 1`,
    );
  } catch {}
  triggerCurrencyRefresh();
  triggerDeathCheck();
  try {
    db.runSync(
      `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, effective_date, created_at, categories, xp_awarded, mood_rating)
       VALUES ('', '', 'daily', 'self_destruct', ?, ?, ?, '[]', 0, 0)`,
      realToday, today, sqlNow(),
    );
  } catch {}
  return { count: getRPGState().self_destruct_count, date: realToday };
}

export function setCurrentMood(mood: string): void {
  db.runSync(`UPDATE rpg_state SET current_mood = ? WHERE id = 1`, mood);
  db.runSync(`UPDATE custom_moods SET used = 1 WHERE name = ?`, mood);
}

export type CustomMood = { name: string; color: string; passive_effect: string | null; mp_rate: number; xp_change: number; used?: number };

function getMoodByName(name: string): CustomMood | null {
  try {
    return db.getFirstSync<CustomMood>(
      `SELECT name, color, passive_effect, mp_rate, xp_change, used FROM custom_moods WHERE name = ?`,
      name,
    ) ?? null;
  } catch { return null; }
}

// Looks up the named mood logged against a given logical day (most recent
// entry that day with a mood_name set) — sourced from the daily-log mood selector.
function getLoggedMoodName(dateStr: string): string | null {
  try {
    const row = db.getFirstSync<{ mood_name: string | null }>(
      `SELECT mood_name FROM activity_logs WHERE COALESCE(effective_date, log_date) = ? AND mood_name IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      dateStr,
    );
    return row?.mood_name ?? null;
  } catch { return null; }
}

// Active mood's passive XP modifier — applied as a multiplier inside applyXP()
// so it covers every XP source uniformly (activity logs, mood/journal, dungeon loot, quests, habits).
export function getMoodXPMultiplier(): number {
  const mood = getMoodByName(getRPGState().current_mood);
  if (!mood) return 1.0;
  return 1 + (mood.xp_change ?? 0) / 100;
}

const MP_REGEN_PER_DAY = 50;

// Natural MP regen — daily-tick pattern mirrors applyHealthDecay. Active mood's
// MP Rate (±50/day) is additive on top of the 50/day baseline, giving the
// previously-cosmetic mp_rate field a real effect.
export function applyMpRegen(): void { try { _applyMpRegen(); } catch {} }
function _applyMpRegen(): void {
  const state = getRPGState();
  const last = (state as any).last_mp_regen as string | null;
  const now = new Date();
  if (!last) {
    db.runSync(`UPDATE rpg_state SET last_mp_regen = ? WHERE id = 1`, sqlNow());
    return;
  }
  const daysPassed = Math.min((now.getTime() - new Date(last).getTime()) / 86400000, 30);
  if (daysPassed < 0.042) return; // skip if < ~1 hour

  // MP regen reflects *yesterday's* logged mood, not today's — e.g. yesterday's
  // "terrible" (mp_rate -50) zeroes out today's grant: 50 - 50 = 0.
  const yesterday = logicalYesterday();
  const yesterdayMoodName = getLoggedMoodName(yesterday);
  const mood = yesterdayMoodName ? getMoodByName(yesterdayMoodName) : null;
  const dailyRate = MP_REGEN_PER_DAY + (mood?.mp_rate ?? 0);
  const delta = Math.round(dailyRate * daysPassed);
  if (delta === 0) return;

  const mp = Math.max(0, Math.min(100, state.mp + delta));
  db.runSync(`UPDATE rpg_state SET mp = ?, last_mp_regen = ? WHERE id = 1`, mp, sqlNow());
  triggerCurrencyRefresh();
}

// Deletes a mood from the active list. Moods that have been logged against
// are archived (kept for Past History, can no longer be selected); never-used ones are purged outright.
export function deleteCustomMood(name: string): 'archived' | 'purged' | 'not_found' {
  const mood = db.getFirstSync<{ used: number }>(`SELECT used FROM custom_moods WHERE name = ?`, name);
  if (!mood) return 'not_found';
  if (mood.used === 1) {
    db.runSync(`UPDATE custom_moods SET is_active = 0 WHERE name = ?`, name);
    return 'archived';
  }
  db.runSync(`DELETE FROM custom_moods WHERE name = ?`, name);
  return 'purged';
}

export function getPastHistoryMoods(): CustomMood[] {
  try {
    return db.getAllSync<CustomMood>(
      `SELECT name, color, passive_effect, mp_rate, xp_change, used FROM custom_moods WHERE is_active = 0 AND used = 1 ORDER BY name ASC`,
    );
  } catch { return []; }
}

// Fallback colors for the 6 default moods — used when DB isn't loaded yet
export const MOOD_FALLBACK_COLORS: Record<string, string> = {
  driven:        '#34D399',
  burnout:       '#EF4444',
  reminiscing:   '#A855F7',
  lonely:        '#64748B',
  overstimulated:'#F97316',
  relapsed:      '#EF4444',
};

export function getCustomMoods(): CustomMood[] {
  try {
    return db.getAllSync<CustomMood>(
      `SELECT name, color, passive_effect, mp_rate, xp_change, used FROM custom_moods WHERE is_active = 1 ORDER BY id ASC`,
    );
  } catch { return []; }
}

// Renames a mood, cascading to every place its name string is referenced —
// mirrors renameCategory's pattern for activity categories.
export function renameCustomMood(oldName: string, newName: string): 'ok' | 'duplicate' | 'not_found' {
  const trimmed = newName.trim();
  if (!trimmed) return 'not_found';
  if (trimmed === oldName) return 'ok';
  const mood = db.getFirstSync<{ id: number }>('SELECT id FROM custom_moods WHERE name = ?', oldName);
  if (!mood) return 'not_found';
  const dup = db.getFirstSync<{ id: number }>(
    'SELECT id FROM custom_moods WHERE lower(name) = lower(?) AND id != ?', trimmed, mood.id,
  );
  if (dup) return 'duplicate';
  db.withTransactionSync(() => {
    db.runSync('UPDATE custom_moods SET name = ? WHERE id = ?', trimmed, mood.id);
    db.runSync('UPDATE activity_logs SET mood_name = ? WHERE mood_name = ?', trimmed, oldName);
    db.runSync('UPDATE rpg_state SET current_mood = ? WHERE current_mood = ?', trimmed, oldName);
  });
  return 'ok';
}

// Partial field update for an existing mood — used by the inline edit panel
// in MoodSettingsSheet's "Your Moods" list.
export function updateCustomMood(
  name: string,
  fields: Partial<Pick<CustomMood, 'color' | 'passive_effect' | 'mp_rate' | 'xp_change'>>,
): void {
  if ('color' in fields) db.runSync('UPDATE custom_moods SET color = ? WHERE name = ?', fields.color!, name);
  if ('passive_effect' in fields) db.runSync('UPDATE custom_moods SET passive_effect = ? WHERE name = ?', fields.passive_effect ?? null, name);
  if ('mp_rate' in fields) db.runSync('UPDATE custom_moods SET mp_rate = ? WHERE name = ?', fields.mp_rate!, name);
  if ('xp_change' in fields) db.runSync('UPDATE custom_moods SET xp_change = ? WHERE name = ?', fields.xp_change!, name);
}

export function clearLevelUpPending(): void {
  db.runSync(`UPDATE rpg_state SET level_up_pending = 0, level_up_ap_gained = 0, level_up_coins_gained = 0, level_up_right_rank = NULL WHERE id = 1`);
}

// ─── Dungeon Rights (MECHANICS.md §11.6 Rights & Keys) ───────────────────────
// Single source of truth for natural-unlock levels — game.ts imports this
// rather than duplicating it, since applyXP (here) needs it to auto-grant
// the permanent "Right" item the instant a player crosses an unlock threshold.
export const DUNGEON_NATURAL_UNLOCK_LEVEL: Record<string, number> = {
  E: 11, D: 21, C: 31, B: 41, A: 51, S: 61, SS: 71, SSS: 81, Legend: 91,
};

export function dungeonRightItemName(rank: string): string {
  return `${rank}-Tier Dungeon Right`;
}

export function ownsDungeonRight(rank: string): boolean {
  try {
    return !!db.getFirstSync(
      `SELECT id FROM inventory WHERE category = 'game' AND item_type = 'dungeon_right' AND item_name = ?`,
      dungeonRightItemName(rank),
    );
  } catch { return false; }
}

// Materializes the permanent, non-usable "Right" item the instant a rank becomes
// owned (early purchase OR natural level-up) — idempotent.
export function materializeDungeonRight(rank: string): void {
  try {
    if (ownsDungeonRight(rank)) return;
    db.runSync(
      `INSERT INTO inventory (item_name, category, item_type, description, quantity) VALUES (?, 'game', 'dungeon_right', ?, 1)`,
      dungeonRightItemName(rank),
      `A permanent writ of passage — grants lasting access to ${rank}-rank dungeon gates.`,
    );
  } catch {}
}

export function applyXP(xp: number): { levelUp: boolean; newLevel?: number; state: RPGState } {
  const state = getRPGState();

  // Block XP gain when in death state (HP=0 or any health bar=0)
  if (isInDeathState()) return { levelUp: false, state };
  let { current_level, total_xp, xp_to_next_level } = state;

  // Active mood's passive XP modifier (±10%) — applied here so it covers every XP source.
  xp = Math.max(1, Math.round(xp * getMoodXPMultiplier()));

  total_xp += xp;
  const newHighest = Math.max(state.highest_xp_attained ?? 0, total_xp);
  let levelUp = false;
  let levelsGained = 0;

  while (total_xp >= xp_to_next_level) {
    total_xp -= xp_to_next_level;
    current_level += 1;
    xp_to_next_level = xpRequiredForLevel(current_level);
    levelsGained++;
    levelUp = true;
  }

  const title = titleForLevel(current_level);

  // Streak update
  const today = logicalToday();
  let { streak_days } = state;
  if (state.last_active_date === today) {
    // no change
  } else if (state.last_active_date) {
    const diff = (new Date(today).getTime() - new Date(state.last_active_date).getTime()) / 86400000;
    streak_days = diff === 1 ? streak_days + 1 : 1;
  } else {
    streak_days = 1;
  }

  // AP earned on level-up (10 per level)
  const apGained = levelsGained * 10;
  // Coins: level × 10 per level crossed (e.g. reaching level 5 grants 50 coins)
  let coinsGained = 0;
  const startLevel = current_level - levelsGained;
  for (let lvl = startLevel + 1; lvl <= current_level; lvl++) coinsGained += lvl * 10;

  // Auto-grant a dungeon "Right" for EVERY natural-unlock threshold crossed in this
  // jump — level-up grants are never partial (unlike purchases, which grant exactly
  // the rank bought). Surfaced via a separate toast (not the level-up page) listing
  // every newly-accessible rank, stored comma-separated in level_up_right_rank.
  const rightRanks: string[] = [];
  if (levelUp) {
    for (const [rank, lvl] of Object.entries(DUNGEON_NATURAL_UNLOCK_LEVEL)) {
      if (lvl > startLevel && lvl <= current_level) rightRanks.push(rank);
    }
    for (const rank of rightRanks) materializeDungeonRight(rank);
  }
  const rightRanksStr = rightRanks.length ? rightRanks.join(',') : null;

  db.runSync(
    `UPDATE rpg_state SET
       current_level = ?, total_xp = ?, xp_to_next_level = ?,
       title = ?, streak_days = ?, last_active_date = ?,
       ap = COALESCE(ap, 0) + ?,
       coins = COALESCE(coins, 0) + ?,
       level_up_pending = CASE WHEN ? > 0 THEN ? ELSE level_up_pending END,
       level_up_ap_gained    = CASE WHEN ? > 0 THEN ? ELSE level_up_ap_gained END,
       level_up_coins_gained = CASE WHEN ? > 0 THEN ? ELSE level_up_coins_gained END,
       level_up_right_rank   = CASE WHEN ? > 0 THEN ? ELSE level_up_right_rank END,
       spendable_xp    = COALESCE(spendable_xp, 0) + ?,
       total_xp_earned = COALESCE(total_xp_earned, 0) + ?
     WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    title, streak_days, today,
    apGained, coinsGained,
    levelsGained, levelUp ? current_level : 0,
    levelsGained, apGained,
    levelsGained, coinsGained,
    levelsGained, rightRanksStr,
    xp, xp,
  );
  try {
    db.runSync(
      'UPDATE rpg_state SET highest_xp_attained = MAX(COALESCE(highest_xp_attained, 0), ?) WHERE id = 1',
      newHighest,
    );
  } catch {}

  triggerCurrencyRefresh();
  if (levelUp) triggerDeathCheck(); // fires checkState → picks up level_up_pending
  return { levelUp, newLevel: levelUp ? current_level : undefined, state: getRPGState() };
}

export function spendXP(amount: number): 'ok' | 'insufficient' {
  const state = getRPGState();
  if ((state.spendable_xp ?? state.total_xp) < amount) return 'insufficient';
  db.runSync('UPDATE rpg_state SET spendable_xp = COALESCE(spendable_xp, 0) - ? WHERE id = 1', amount);
  triggerCurrencyRefresh();
  return 'ok';
}

// Buying a Streak Freeze adds it to the global inventory (unarmed) — it only
// becomes the "armed" freeze checkStreakFreeze() auto-consumes on a missed day
// once the player presses USE on it (useStreakFreeze, below).
export function purchaseStreakFreeze(): 'ok' | 'insufficient_coins' {
  const COST = 300;
  const state = getRPGState();
  if ((state.coins ?? 0) < COST) return 'insufficient_coins';
  db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', COST);
  const existing = db.getFirstSync<{ id: number }>(
    `SELECT id FROM inventory WHERE category = 'global' AND item_type = 'consumable' AND item_name = 'Streak Freeze'`,
  );
  if (existing) {
    db.runSync(`UPDATE inventory SET quantity = quantity + 1 WHERE id = ?`, existing.id);
  } else {
    db.runSync(
      `INSERT INTO inventory (item_name, category, item_type, description, quantity)
       VALUES ('Streak Freeze', 'global', 'consumable', 'Use to arm — protects your streak for one missed day.', 1)`,
    );
  }
  triggerCurrencyRefresh();
  return 'ok';
}

export function getStreakFreezeInventoryCount(): number {
  return db.getFirstSync<{ quantity: number }>(
    `SELECT quantity FROM inventory WHERE category = 'global' AND item_type = 'consumable' AND item_name = 'Streak Freeze'`,
  )?.quantity ?? 0;
}

// Consumes one unarmed Streak Freeze from inventory and arms it
// (rpg_state.streak_freezes — the pool checkStreakFreeze() auto-consumes).
export function useStreakFreeze(): 'ok' | 'no_inventory' {
  const item = db.getFirstSync<{ id: number; quantity: number }>(
    `SELECT id, quantity FROM inventory WHERE category = 'global' AND item_type = 'consumable' AND item_name = 'Streak Freeze'`,
  );
  if (!item || item.quantity <= 0) return 'no_inventory';
  if (item.quantity <= 1) db.runSync(`DELETE FROM inventory WHERE id = ?`, item.id);
  else db.runSync(`UPDATE inventory SET quantity = quantity - 1 WHERE id = ?`, item.id);
  db.runSync('UPDATE rpg_state SET streak_freezes = streak_freezes + 1 WHERE id = 1');
  triggerCurrencyRefresh();
  return 'ok';
}
