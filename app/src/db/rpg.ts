import { db } from './schema';
import { xpRequiredForLevel, titleForLevel } from '../services/xpEngine';
import { sqlNow } from '../utils/date';
import { triggerCurrencyRefresh } from './currencySignal';
import { triggerDeathCheck } from './deathCheckSignal';

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
  death_acknowledged: number;
  // v14
  gems: number;
  revival_count?: number;
  // v15
  vigor: number;
  last_vigor_date: string | null;
  // v21
  spendable_xp: number;
  total_xp_earned: number;
};

export function getRPGState(): RPGState {
  return db.getFirstSync<RPGState>('SELECT * FROM rpg_state WHERE id = 1')!;
}

// Called on app open — adds today's optimistic +1; confirms yesterday as clean if no SD logged
export function checkVigor(): { gemAwarded: boolean } {
  try {
    const state = getRPGState();
    const today = new Date().toISOString().split('T')[0];
    const lastVigor = (state as any).last_vigor_date as string | null;
    if (lastVigor === today) return { gemAwarded: false }; // already ran today

    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
    const sdRow = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM activity_logs WHERE entry_type = 'self_destruct' AND log_date = ?`,
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

// Coin multiplier: debuff when anima < -10 (blight far exceeds vigor). To be repurposed — new mechanic TBD.
export function getCoinMultiplier(): number {
  return getAnima() < -10 ? 0.8 : 1.0;
}

// Weekly log boost: 1.05× on all activity logs for 7 days after submitting a weekly reflection.
export function getWeeklyBoostMult(): number {
  try {
    const row = db.getFirstSync<{ weekly_boost_until: string | null }>(
      'SELECT weekly_boost_until FROM rpg_state WHERE id = 1',
    );
    if (!row?.weekly_boost_until) return 1.0;
    const today = new Date().toISOString().split('T')[0];
    return row.weekly_boost_until >= today ? 1.05 : 1.0;
  } catch { return 1.0; }
}

export function activateWeeklyBoost(): void {
  try {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const untilStr = until.toISOString().split('T')[0];
    db.runSync('UPDATE rpg_state SET weekly_boost_until = ? WHERE id = 1', untilStr);
  } catch {}
}

// Called on app open — auto-applies streak freeze if exactly one day was missed
export function checkStreakFreeze(): void {
  try {
    const state = getRPGState();
    if (!state.last_active_date) return;
    const today = new Date().toISOString().split('T')[0];
    if (state.last_active_date >= today) return;
    const daysMissed = Math.floor(
      (new Date(today).getTime() - new Date(state.last_active_date).getTime()) / 86400000,
    );
    if (daysMissed === 1) return;
    if (daysMissed === 2 && (state.streak_freezes ?? 0) > 0) {
      // Consume freeze and back-date last_active_date to yesterday so next
      // applyXP call sees diff=1 and extends the streak instead of resetting it.
      const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
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
      `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at, categories, xp_awarded, mood_rating)
       VALUES ('', '', 'daily', 'self_destruct', ?, ?, '[]', 0, 0)`,
      today, sqlNow(),
    );
  } catch {}
  return { count: getRPGState().self_destruct_count, date: today };
}

export function setCurrentMood(mood: string): void {
  db.runSync(`UPDATE rpg_state SET current_mood = ? WHERE id = 1`, mood);
}

export type CustomMood = { name: string; color: string; passive_effect: string | null; mp_rate: number };

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
      `SELECT name, color, passive_effect, mp_rate FROM custom_moods WHERE is_active = 1 ORDER BY id ASC`,
    );
  } catch { return []; }
}

export function clearLevelUpPending(): void {
  db.runSync(`UPDATE rpg_state SET level_up_pending = 0 WHERE id = 1`);
}

export function applyXP(xp: number): { levelUp: boolean; newLevel?: number; state: RPGState } {
  const state = getRPGState();

  // Block XP gain when in death state (HP=0 or any health bar=0)
  if (isInDeathState()) return { levelUp: false, state };
  let { current_level, total_xp, xp_to_next_level } = state;

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
  const today = new Date().toISOString().split('T')[0];
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
  // HP regen: 10% of XP gained, capped at hp_max
  const hpRegen = Math.floor(xp * 0.1);

  db.runSync(
    `UPDATE rpg_state SET
       current_level = ?, total_xp = ?, xp_to_next_level = ?,
       title = ?, streak_days = ?, last_active_date = ?,
       ap = COALESCE(ap, 0) + ?,
       coins = COALESCE(coins, 0) + ?,
       hp = MIN(COALESCE(hp_max, 100), COALESCE(hp, 100) + ?),
       level_up_pending = CASE WHEN ? > 0 THEN ? ELSE level_up_pending END,
       spendable_xp    = COALESCE(spendable_xp, 0) + ?,
       total_xp_earned = COALESCE(total_xp_earned, 0) + ?
     WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    title, streak_days, today,
    apGained, coinsGained, hpRegen,
    levelsGained, levelUp ? current_level : 0,
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

export function purchaseStreakFreeze(): 'ok' | 'insufficient_coins' {
  const COST = 50;
  const state = getRPGState();
  if ((state.coins ?? 0) < COST) return 'insufficient_coins';
  db.runSync(
    'UPDATE rpg_state SET coins = coins - ?, streak_freezes = streak_freezes + 1 WHERE id = 1',
    COST,
  );
  triggerCurrencyRefresh();
  return 'ok';
}
