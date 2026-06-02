import { db } from './schema';
import { xpRequiredForLevel, titleForLevel, CATEGORY_TO_ATTRIBUTE } from '../services/xpEngine';

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
  title: string;
  streak_days: number;
  last_active_date: string | null;
  highest_xp_attained: number;
  coins: number;
  gp: number;
  streak_freezes: number;
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
    if (daysMissed === 1) return; // only missed today, streak safe until tomorrow
    if (daysMissed === 2 && (state.streak_freezes ?? 0) > 0) {
      // Auto-consume one freeze to cover the missed day
      db.runSync('UPDATE rpg_state SET streak_freezes = streak_freezes - 1 WHERE id = 1');
    } else if (daysMissed > 1) {
      db.runSync('UPDATE rpg_state SET streak_days = 0 WHERE id = 1');
    }
  } catch {}
}

export function applyXP(xp: number, categoryName: string): { levelUp: boolean; newLevel?: number; state: RPGState } {
  const state = getRPGState();
  let { current_level, total_xp, xp_to_next_level, unallocated_points } = state;

  total_xp += xp;
  const newHighest = Math.max(state.highest_xp_attained ?? 0, total_xp);
  let levelUp = false;
  let levelsGained = 0;

  while (total_xp >= xp_to_next_level) {
    total_xp -= xp_to_next_level;
    current_level += 1;
    xp_to_next_level = xpRequiredForLevel(current_level);
    unallocated_points += 3;
    levelsGained++;
    levelUp = true;
  }

  const title = titleForLevel(current_level);
  const catRow = db.getFirstSync<{ attribute: string }>(
    'SELECT attribute FROM categories WHERE lower(name) = ? LIMIT 1',
    categoryName.toLowerCase(),
  );
  const attribute = (catRow?.attribute ?? CATEGORY_TO_ATTRIBUTE[categoryName.toLowerCase()] ?? 'focus') as keyof RPGState;
  const newAttrVal = (state[attribute] as number) + 1;

  const today = new Date().toISOString().split('T')[0];
  let { streak_days } = state;
  if (state.last_active_date === today) {
    // same day — no streak change
  } else if (state.last_active_date) {
    const diff = (new Date(today).getTime() - new Date(state.last_active_date).getTime()) / 86400000;
    streak_days = diff === 1 ? streak_days + 1 : 1;
  } else {
    streak_days = 1;
  }

  const gpGained = levelsGained * 10; // 10 GP per level up

  db.runSync(
    `UPDATE rpg_state SET
       current_level = ?, total_xp = ?, xp_to_next_level = ?,
       unallocated_points = ?, ${String(attribute)} = ?,
       title = ?, streak_days = ?, last_active_date = ?,
       gp = COALESCE(gp, 0) + ?
     WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    unallocated_points, newAttrVal,
    title, streak_days, today,
    gpGained,
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
