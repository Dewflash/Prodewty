import { db } from './schema';
import { calculateXP, xpRequiredForLevel, titleForLevel, CATEGORY_TO_ATTRIBUTE } from '../services/xpEngine';

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
};

export function getRPGState(): RPGState {
  return db.getFirstSync<RPGState>('SELECT * FROM rpg_state WHERE id = 1')!;
}

export function applyXP(xp: number, category: string): { levelUp: boolean; state: RPGState } {
  const state = getRPGState();
  let { current_level, total_xp, xp_to_next_level, unallocated_points } = state;

  total_xp += xp;
  let levelUp = false;

  while (total_xp >= xp_to_next_level) {
    total_xp -= xp_to_next_level;
    current_level += 1;
    xp_to_next_level = xpRequiredForLevel(current_level);
    unallocated_points += 3;
    levelUp = true;
  }

  const title = titleForLevel(current_level);
  const attribute = CATEGORY_TO_ATTRIBUTE[category.toLowerCase()] ?? 'focus';
  const newAttrVal = (state[attribute] as number) + 1;

  const today = new Date().toISOString().split('T')[0];
  let streak_days = state.streak_days;
  if (state.last_active_date === today) {
    // same day, no change
  } else if (state.last_active_date) {
    const last = new Date(state.last_active_date);
    const diff = (new Date(today).getTime() - last.getTime()) / 86400000;
    streak_days = diff === 1 ? streak_days + 1 : 1;
  } else {
    streak_days = 1;
  }

  db.runSync(
    `UPDATE rpg_state SET
      current_level = ?, total_xp = ?, xp_to_next_level = ?,
      unallocated_points = ?, ${attribute} = ?,
      title = ?, streak_days = ?, last_active_date = ?
    WHERE id = 1`,
    current_level, total_xp, xp_to_next_level,
    unallocated_points, newAttrVal,
    title, streak_days, today,
  );

  return { levelUp, state: getRPGState() };
}
