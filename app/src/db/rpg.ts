import { db } from './schema';
import { xpRequiredForLevel, titleForLevel } from '../services/xpEngine';

export type RPGState = {
  current_level: number;
  total_xp: number;
  xp_to_next_level: number;
  unallocated_points: number; // legacy — kept for DB compat, use `ap` instead
  // 7-stat AP portions (auto-increment added dynamically in getComputedStats)
  strength: number;   // STR AP portion
  wisdom: number;     // WIS AP portion
  focus: number;      // FOC AP portion
  agility: number;    // AGI AP portion
  resilience: number; // SPR AP portion
  per_stat: number;   // PER AP portion
  sta_stat: number;   // STA AP portion
  title: string;
  streak_days: number;
  last_active_date: string | null;
  highest_xp_attained: number;
  coins: number;
  ap: number;         // Ability Points — earned on level-up, spent on 7 stats
  streak_freezes: number;
  hp: number;
  hp_max: number;
  mp: number;
  job: string;
};

export function getRPGState(): RPGState {
  return db.getFirstSync<RPGState>('SELECT * FROM rpg_state WHERE id = 1')!;
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

export function applyXP(xp: number, _categoryName: string): { levelUp: boolean; newLevel?: number; state: RPGState } {
  const state = getRPGState();
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
       hp = MIN(COALESCE(hp_max, 100), COALESCE(hp, 100) + ?)
     WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    title, streak_days, today,
    apGained, coinsGained, hpRegen,
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
