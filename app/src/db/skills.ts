import { db } from './schema';
import { getRPGState } from './rpg';
import { getComputedStats } from './game';

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

// ─── Stat→mastery earn multiplier (RPG_PROGRESSION_LATTICE.md D2) ────────────
// "Stats power, masteries permit." The 7 real-life stats never gate content;
// instead each mastery earns points faster when its LINKED stats are high.
// Mapping is RPG_ARCHITECTURE.md's Real-Life Stats ↔ Mastery table, keyed by
// GameStats keys (str/agi/foc/wis/spr/per/sta — note the legacy UI inversion:
// the player's "Resilience"/RES is `sta`, "Spirituality"/SPR is `spr`):
//   Strength     → attacking(=combat), mining
//   Agility      → hunting, fishing, mining
//   Resilience   → surviving, hunting, fishing, mining   (GameStats `sta`)
//   Perception   → research
//   Spirituality → livestock, language                    (GameStats `spr`)
//   Wisdom       → research, language, trading
//   Focus        → crafting, farming
export type StatKey = 'str' | 'agi' | 'foc' | 'wis' | 'spr' | 'per' | 'sta';

export const STAT_MASTERY_LINKS: Record<StatKey, SkillType[]> = {
  str: ['combat', 'mining'],
  agi: ['hunting', 'fishing', 'mining'],
  sta: ['surviving', 'hunting', 'fishing', 'mining'],
  per: ['research'],
  spr: ['livestock', 'language'],
  wis: ['research', 'language', 'trading'],
  foc: ['crafting', 'farming'],
};

// Which stats boost a given mastery (reverse of STAT_MASTERY_LINKS).
export function linkedStatsForSkill(skill: SkillType): StatKey[] {
  return (Object.keys(STAT_MASTERY_LINKS) as StatKey[]).filter(k =>
    STAT_MASTERY_LINKS[k].includes(skill),
  );
}

// +2% earned points per linked stat point (AP + activity-earned _auto totals),
// capped at 2.0× (so at most double). Pure enough to test by injecting stats.
export const MASTERY_EARN_BONUS_PER_STAT = 0.02;
export const MASTERY_EARN_MULTIPLIER_CAP = 2.0;

export function masteryEarnMultiplierFromStats(
  skill: SkillType,
  stats: Record<StatKey, number>,
): number {
  const linkedSum = linkedStatsForSkill(skill).reduce((acc, k) => acc + (stats[k] ?? 0), 0);
  const raw = 1 + MASTERY_EARN_BONUS_PER_STAT * Math.max(0, linkedSum);
  return Math.min(MASTERY_EARN_MULTIPLIER_CAP, raw);
}

// Live wrapper: reads the player's full stat totals via getComputedStats().
export function masteryEarnMultiplier(skill: SkillType): number {
  const s = getComputedStats();
  return masteryEarnMultiplierFromStats(skill, {
    str: s.str, agi: s.agi, foc: s.foc, wis: s.wis, spr: s.spr, per: s.per, sta: s.sta,
  });
}

// Grants mastery points with the stat→earn multiplier applied. basePoints is
// the raw action value (the farming point scale: small actions 1-3, big
// payoffs 10-15). Result is floored; a base of ≥1 always grants at least 1.
export function grantSkillPoints(skill: SkillType, basePoints: number): void {
  if (basePoints <= 0) return;
  const scaled = Math.floor(basePoints * masteryEarnMultiplier(skill));
  addSkillPoints(skill, Math.max(1, scaled));
}

export function getMasteryLevel(skill: SkillType): number {
  const state = getSkillState();
  return (state as any)[`${skill}_mastery`] ?? 1;
}

// Certain actions check if a user's category mastery is high enough.
export function hasRequiredMastery(skill: SkillType, requiredMastery: number): boolean {
  return getMasteryLevel(skill) >= requiredMastery;
}
