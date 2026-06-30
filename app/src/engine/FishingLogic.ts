// Pure, dependency-free fishing logic (Phase 3A). Extracted so the
// eligibility filter and catch-success math can be unit-tested in
// isolation; rpg.tsx's fishing flow calls these, so the tested code is the
// shipped code. No React/SQLite/asset imports — only plain data + an
// injectable rng so tests are deterministic.

import { FISH_CATALOG, type FishDefinition } from './FishCatalog';
import type { ToolTier } from './ToolCatalog';

export type Rng = () => number; // returns [0,1); inject Math.random in prod

// Fish that can bite right now: zone + season + hour-of-day all match the
// fish's catalog windows. timeRange is [startHour, endHour) in 24h.
export function eligibleFish(zone: string, season: string, hour: number): FishDefinition[] {
  return Object.values(FISH_CATALOG).filter(f =>
    f.allowedZones.includes(zone as any) &&
    f.seasons.includes(season) &&
    hour >= f.timeRange[0] && hour < f.timeRange[1],
  );
}

// Pick one of the eligible fish, weighted toward EASIER fish (lower
// difficulty = more common). Returns null if nothing's biting.
export function rollFish(eligible: FishDefinition[], rng: Rng): FishDefinition | null {
  if (eligible.length === 0) return null;
  const weights = eligible.map(f => Math.max(1, 101 - f.difficulty)); // easy≈100, hard≈20
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = rng() * total;
  for (let i = 0; i < eligible.length; i++) {
    pick -= weights[i];
    if (pick < 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

const TIER_BONUS: Record<ToolTier, number> = { Basic: 0, Copper: 0.15, Iron: 0.28, Gold: 0.4 };

// Probability of landing a hooked fish, given the rod tier and the fish's
// difficulty. Harder fish drop the odds; better rods raise them. Clamped
// so even a Basic rod on a hard fish has a chance, and a great rod on an
// easy fish isn't a guaranteed 100%.
export function catchChance(rodTier: ToolTier, difficulty: number): number {
  const raw = 0.9 - (difficulty / 100) * 0.65 + (TIER_BONUS[rodTier] ?? 0);
  return Math.min(0.95, Math.max(0.15, raw));
}

// Did the player land the fish? Requires they reeled within the bite
// window AND pass the catch roll. Pure given an injected rng.
export function resolveCatch(
  rodTier: ToolTier,
  fish: FishDefinition,
  reeledInWindow: boolean,
  rng: Rng,
): boolean {
  if (!reeledInWindow) return false;
  return rng() < catchChance(rodTier, fish.difficulty);
}
