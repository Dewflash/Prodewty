import { db } from './schema';
import { getRPGState } from './rpg';

export type SkillType = 'farming' | 'mining' | 'combat' | 'foraging' | 'fishing';

export const POINTS_PER_MASTERY = 100;

export type SkillState = {
  farming_mastery: number;
  mining_mastery: number;
  combat_mastery: number;
  foraging_mastery: number;
  fishing_mastery: number;
  farming_points: number;
  mining_points: number;
  combat_points: number;
  foraging_points: number;
  fishing_points: number;
};

// Points fill each category's mastery track. Mastery starts at 1.
export function calculateMasteryLevel(points: number): number {
  return Math.floor(Math.max(0, points) / POINTS_PER_MASTERY) + 1;
}

export function getSkillState(): SkillState {
  const rpg = getRPGState();
  const farming_points = rpg.farming_points || 0;
  const mining_points = rpg.mining_points || 0;
  const combat_points = rpg.combat_points || 0;
  const foraging_points = rpg.foraging_points || 0;
  const fishing_points = rpg.fishing_points || 0;

  return {
    farming_points,
    mining_points,
    combat_points,
    foraging_points,
    fishing_points,
    farming_mastery: calculateMasteryLevel(farming_points),
    mining_mastery: calculateMasteryLevel(mining_points),
    combat_mastery: calculateMasteryLevel(combat_points),
    foraging_mastery: calculateMasteryLevel(foraging_points),
    fishing_mastery: calculateMasteryLevel(fishing_points),
  };
}

export function addSkillPoints(skill: SkillType, amount: number): void {
  if (amount <= 0) return;

  try {
    const colName = `${skill}_points`;
    db.runSync(`UPDATE rpg_state SET ${colName} = ${colName} + ? WHERE id = 1`, amount);
  } catch (e) {
    console.warn(`Failed to add ${skill} points`, e);
  }
}

// Certain actions check if a user's category mastery is high enough.
export function hasRequiredMastery(skill: SkillType, requiredMastery: number): boolean {
  const state = getSkillState();
  switch (skill) {
    case 'farming': return state.farming_mastery >= requiredMastery;
    case 'mining': return state.mining_mastery >= requiredMastery;
    case 'combat': return state.combat_mastery >= requiredMastery;
    case 'foraging': return state.foraging_mastery >= requiredMastery;
    case 'fishing': return state.fishing_mastery >= requiredMastery;
  }
  return false;
}
