import { db } from './schema';
import { getRPGState } from './rpg';

// 11 canonical masteries (per RPG_ARCHITECTURE.md) + foraging, kept as a
// bonus/extra category tied to the existing forage feature even though
// it isn't in the canonical 11. 'attacking' in the architecture doc is
// this module's 'combat' — same concept, no rename to avoid touching
// every existing combat/museum call site.
export type SkillType =
  | 'farming' | 'mining' | 'combat' | 'foraging' | 'fishing'
  | 'crafting' | 'livestock' | 'language' | 'trading' | 'hunting'
  | 'surviving' | 'research';

export const ALL_SKILLS: SkillType[] = [
  'farming', 'mining', 'combat', 'foraging', 'fishing',
  'crafting', 'livestock', 'language', 'trading', 'hunting',
  'surviving', 'research',
];

export const POINTS_PER_MASTERY = 100;

// Bronze/Silver/Gold tiers (RPG_ARCHITECTURE.md's Discovery/Understanding
// ladder) — every 3 mastery levels is the next tier. Tunable; retune
// freely without touching call sites, they only ever ask for a tier name.
export const LEVELS_PER_TIER = 3;
export type MasteryTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
const TIER_NAMES: MasteryTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function getMasteryTier(level: number): MasteryTier {
  const tierIndex = Math.min(
    TIER_NAMES.length - 1,
    Math.floor(Math.max(1, level) - 1) / LEVELS_PER_TIER | 0,
  );
  return TIER_NAMES[tierIndex];
}

export type SkillState = Record<`${SkillType}_points`, number> & Record<`${SkillType}_mastery`, number>;

// Points fill each category's mastery track. Mastery starts at 1.
export function calculateMasteryLevel(points: number): number {
  return Math.floor(Math.max(0, points) / POINTS_PER_MASTERY) + 1;
}

export function getSkillState(): SkillState {
  const rpg = getRPGState() as unknown as Record<string, number | undefined>;
  const state = {} as SkillState;

  for (const skill of ALL_SKILLS) {
    const points = rpg[`${skill}_points`] || 0;
    (state as any)[`${skill}_points`] = points;
    (state as any)[`${skill}_mastery`] = calculateMasteryLevel(points);
  }

  return state;
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

export function getMasteryLevel(skill: SkillType): number {
  const state = getSkillState();
  return (state as any)[`${skill}_mastery`] ?? 1;
}

// Certain actions check if a user's category mastery is high enough.
export function hasRequiredMastery(skill: SkillType, requiredMastery: number): boolean {
  return getMasteryLevel(skill) >= requiredMastery;
}
