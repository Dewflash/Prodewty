import { db } from './schema';
import { xpRequiredForLevel, titleForLevel } from '../services/xpEngine';

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
  revival_count: number;
  // v15
  vigor: number;
  last_vigor_date: string | null;
};

export function getRPGState(): RPGState {
  return db.getFirstSync<RPGState>('SELECT * FROM rpg_state WHERE id = 1')!;
}

// Called on app open — increments vigor if no self-destruct today
export function checkVigor(): void {
  try {
    const state = getRPGState();
    const today = new Date().toISOString().split('T')[0];
    const lastVigor = (state as any).last_vigor_date as string | null;
    if (lastVigor === today) return; // already incremented today
    const lastSD = state.last_self_destruct ?? '';
    if (lastSD === today) return; // self-destructed today — no vigor gain
    db.runSync(`UPDATE rpg_state SET vigor = vigor + 1, last_vigor_date = ? WHERE id = 1`, today);
  } catch {}
}

export function getAnima(): number {
  try {
    const state = getRPGState();
    return ((state as any).vigor ?? 0) - (state.self_destruct_count ?? 0);
  } catch { return 0; }
}

// Coin multiplier: debuff when anima < -10 (blight far exceeds vigor)
export function getCoinMultiplier(): number {
  return getAnima() < -10 ? 0.8 : 1.0;
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
      db.runSync('UPDATE rpg_state SET streak_freezes = streak_freezes - 1 WHERE id = 1');
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
  db.runSync(
    `UPDATE rpg_state SET self_destruct_count = self_destruct_count + 1, last_self_destruct = ? WHERE id = 1`,
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
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  try {
    db.runSync(
      `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at, categories, xp_awarded, mood_rating)
       VALUES ('', '', 'daily', 'self_destruct', ?, ?, '[]', 0, 0)`,
      today, ts,
    );
  } catch {}
  const state = getRPGState();
  return { count: state.self_destruct_count, date: today };
}

export function setCurrentMood(mood: string): void {
  db.runSync(`UPDATE rpg_state SET current_mood = ? WHERE id = 1`, mood);
}

export function clearLevelUpPending(): void {
  db.runSync(`UPDATE rpg_state SET level_up_pending = 0 WHERE id = 1`);
}

export function applyXP(xp: number, _categoryName: string): { levelUp: boolean; newLevel?: number; state: RPGState } {
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
  const apGained    = levelsGained * 10;
  // Coins: rare drop on level-up (20% chance per level gained)
  const coinsGained = Array.from({ length: levelsGained }).reduce<number>((acc) => acc + (Math.random() < 0.2 ? 10 : 0), 0);
  // HP regen: 10% of XP gained, capped at hp_max
  const hpRegen = Math.floor(xp * 0.1);

  db.runSync(
    `UPDATE rpg_state SET
       current_level = ?, total_xp = ?, xp_to_next_level = ?,
       title = ?, streak_days = ?, last_active_date = ?,
       ap = COALESCE(ap, 0) + ?,
       coins = COALESCE(coins, 0) + ?,
       hp = MIN(COALESCE(hp_max, 100), COALESCE(hp, 100) + ?),
       level_up_pending = CASE WHEN ? > 0 THEN ? ELSE level_up_pending END
     WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    title, streak_days, today,
    apGained, coinsGained, hpRegen,
    levelsGained, levelUp ? current_level : 0,
  );
  try {
    db.runSync(
      'UPDATE rpg_state SET highest_xp_attained = MAX(COALESCE(highest_xp_attained, 0), ?) WHERE id = 1',
      newHighest,
    );
  } catch {}

  return { levelUp, newLevel: levelUp ? current_level : undefined, state: getRPGState() };
}

export function spendXP(amount: number): 'ok' | 'insufficient' {
  const state = getRPGState();
  if (state.total_xp < amount) return 'insufficient';
  db.runSync('UPDATE rpg_state SET total_xp = total_xp - ? WHERE id = 1', amount);
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
  return 'ok';
}
