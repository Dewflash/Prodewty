// Wave 5b — Processors v1 (RPG_PROGRESSION_LATTICE.md Wave 5). Pure, dependency-
// free catalog of the Factory-role artisan stations that turn livestock produce
// (rpg_milk / rpg_egg / rpg_wool, shipped in Wave 5a) into higher-value artisan
// goods on a timed job. Kept import-free (no RpgObjectCatalog / RpgAssetRegistry)
// so its ids can be validated by source-text scan in a plain-node *.test.ts — the
// PNG require() chain those modules pull in would otherwise kill tsx.
//
// Recipe content/values are ported from the legacy System-A ProcessorCatalog.ts
// (the flows/tables there are off-limits, but the numbers are reusable), with the
// Loom time raised to 60min per the work order. Each recipe is keyed to a station
// TYPE — the BuildingCatalog station def `type` (CheesePress/Loom) — so the live
// game resolves a placed station straight to its recipe.
//
// Processing v1 is TWO rustic refining recipes only (owner scope call, this
// wave): milk→cheese and wool→cloth. The Mayonnaise Machine (egg→mayonnaise) is
// intentionally NOT wired — a "mayonnaise machine" is an industrial Stardew-ism
// off-theme for a rustic cozy sanctuary. Its BuildingCatalog object stays
// placeable-but-inert (as before this wave), pending a future kitchen/cooking
// reflavor. Eggs' v1 sink is selling + Town Hall bundles.

export type ProcessingRecipe = {
  recipeId: string;
  // BuildingCatalog station def `type` this recipe runs on.
  stationType: 'CheesePress' | 'Loom';
  inputItemId: string;
  inputQuantity: number;
  outputItemId: string;
  outputQuantity: number;
  timeMinutes: number;
};

export const PROCESSING_CATALOG: Record<string, ProcessingRecipe> = {
  // Cheese Press: milk → cheese (35 → 70 coins, 2×). 45min.
  process_cheese: {
    recipeId: 'process_cheese',
    stationType: 'CheesePress',
    inputItemId: 'rpg_milk',
    inputQuantity: 1,
    outputItemId: 'rpg_cheese',
    outputQuantity: 1,
    timeMinutes: 45,
  },
  // Loom: wool → cloth (40 → 90 coins, 2.25×). 60min (raised from legacy 45).
  process_cloth: {
    recipeId: 'process_cloth',
    stationType: 'Loom',
    inputItemId: 'rpg_wool',
    inputQuantity: 1,
    outputItemId: 'rpg_cloth',
    outputQuantity: 1,
    timeMinutes: 60,
  },
};

export function getAllProcessingRecipes(): ProcessingRecipe[] {
  return Object.values(PROCESSING_CATALOG);
}

export function getProcessingRecipe(recipeId: string): ProcessingRecipe | null {
  return PROCESSING_CATALOG[recipeId] ?? null;
}

// The recipe a placed station runs, resolved from its BuildingCatalog `type`.
export function getProcessingRecipeForStation(stationType: string): ProcessingRecipe | null {
  return getAllProcessingRecipes().find(r => r.stationType === stationType) ?? null;
}
