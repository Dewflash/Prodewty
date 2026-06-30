// Biome critters catchable with a Net (Phase 3B). Each is a plain
// inventory item with a sell price (loop: catch → sell → coins, same as
// fish), so nothing here is speculative content with no sink. Livestock
// husbandry (a separate caught-animals system) comes with Phase 4 — these
// are small wild critters, not farm animals.

export type CritterDefinition = {
  itemId: string;
  name: string;
  biome: string;        // ZoneId the critter spawns in
  catchDifficulty: number; // 1-100, higher = harder to net
  sellPrice: number;
  featherIcon: string;  // placeholder art until real sprites
};

export const CRITTER_CATALOG: Record<string, CritterDefinition> = {
  rpg_forest_beetle: { itemId: 'rpg_forest_beetle', name: 'Forest Beetle', biome: 'forest', catchDifficulty: 12, sellPrice: 14, featherIcon: 'circle' },
  rpg_wild_rabbit: { itemId: 'rpg_wild_rabbit', name: 'Wild Rabbit', biome: 'forest', catchDifficulty: 45, sellPrice: 38, featherIcon: 'github' },
  rpg_sand_crab: { itemId: 'rpg_sand_crab', name: 'Sand Crab', biome: 'beach', catchDifficulty: 20, sellPrice: 22, featherIcon: 'aperture' },
  rpg_dune_lizard: { itemId: 'rpg_dune_lizard', name: 'Dune Lizard', biome: 'desert', catchDifficulty: 55, sellPrice: 50, featherIcon: 'zap' },
  rpg_rock_marmot: { itemId: 'rpg_rock_marmot', name: 'Rock Marmot', biome: 'mountain', catchDifficulty: 60, sellPrice: 60, featherIcon: 'hexagon' },
};

export function crittersForBiome(biome: string): CritterDefinition[] {
  return Object.values(CRITTER_CATALOG).filter(c => c.biome === biome);
}

export function getCritterDef(itemId: string): CritterDefinition | null {
  return CRITTER_CATALOG[itemId] ?? null;
}
