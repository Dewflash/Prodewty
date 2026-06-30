// Pure catch math for Net critter-catching (Phase 3B). Mirrors the
// fishing approach: an injectable rng so it's deterministically testable,
// and rpg/biome screens call these so the tested code ships.

export type Rng = () => number;

// Net "quality" raises odds (room for crafted Net tiers later). 0 = basic.
export function netCatchChance(difficulty: number, netBonus = 0): number {
  const raw = 0.85 - (difficulty / 100) * 0.6 + netBonus;
  return Math.min(0.9, Math.max(0.2, raw));
}

// Did the swing land the critter? Requires the player be in range (caller
// checks proximity) and pass the roll. Pure given injected rng.
export function resolveNetCatch(difficulty: number, rng: Rng, netBonus = 0): boolean {
  return rng() < netCatchChance(difficulty, netBonus);
}
