export type CraftingRecipe = {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  timeMinutes: number;
  ingredients: { itemId: string; quantity: number }[];
  requiredBuilding?: string; // e.g., 'Furnace', 'Loom'
};

// All times dropped to 0.1min (6s) for testing (2026-06-30) — real timings
// (iron bar was 30min, cloth 60min, etc.) need restoring before launch.
export const CRAFTING_CATALOG: Record<string, CraftingRecipe> = {
  'recipe_iron_bar': {
    recipeId: 'recipe_iron_bar',
    outputItemId: 'rpg_iron_bar',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_stone', quantity: 5 },
      { itemId: 'rpg_coal', quantity: 1 }
    ],
    requiredBuilding: 'Furnace'
  },
  'recipe_cloth': {
    recipeId: 'recipe_cloth',
    outputItemId: 'rpg_cloth',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wool', quantity: 3 }
    ],
    requiredBuilding: 'Loom'
  },
  'recipe_fertiliser': {
    recipeId: 'recipe_fertiliser',
    outputItemId: 'rpg_fertiliser',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_hay', quantity: 3 },
      { itemId: 'rpg_leaves', quantity: 2 },
    ],
    requiredBuilding: 'FertiliserMixer',
  },
  'recipe_sprinkler': {
    recipeId: 'recipe_sprinkler',
    outputItemId: 'rpg_sprinkler',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_copper_bar', quantity: 1 },
      { itemId: 'rpg_wood', quantity: 3 },
    ],
    requiredBuilding: 'IrrigationBench',
  },
  'recipe_stick': {
    recipeId: 'recipe_stick',
    outputItemId: 'rpg_stick',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_wood', quantity: 1 }],
  },
  'recipe_wooden_pole': {
    recipeId: 'recipe_wooden_pole',
    outputItemId: 'rpg_wooden_pole',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_stick', quantity: 3 }],
  },
  'recipe_brick': {
    recipeId: 'recipe_brick',
    outputItemId: 'rpg_brick',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 1 },
      { itemId: 'rpg_stone', quantity: 1 },
      { itemId: 'rpg_mud', quantity: 1 },
    ],
  },
  'recipe_stone_wall': {
    recipeId: 'recipe_stone_wall',
    outputItemId: 'rpg_stone_wall',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_stone', quantity: 1 }],
  },
  'recipe_door': {
    recipeId: 'recipe_door',
    outputItemId: 'rpg_door',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 2 },
      { itemId: 'rpg_metal', quantity: 1 },
    ],
  },
  'recipe_rope': {
    recipeId: 'recipe_rope',
    outputItemId: 'rpg_rope',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_stick', quantity: 2 }],
  },
  'recipe_gate': {
    recipeId: 'recipe_gate',
    outputItemId: 'rpg_gate',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 1 },
      { itemId: 'rpg_stick', quantity: 1 },
    ],
  },
  'recipe_wood_plank': {
    recipeId: 'recipe_wood_plank',
    outputItemId: 'rpg_wood_plank',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 2 }
    ]
  },

  // Sanctuary spec (2026-06-30) — all hand-craftable (no requiredBuilding).
  // The Woodworking Table is the bootstrap "first craft": wood only.
  'recipe_woodworking_table': {
    recipeId: 'recipe_woodworking_table',
    outputItemId: 'rpg_woodworking_table',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_wood', quantity: 8 }],
  },
  'recipe_bed': {
    recipeId: 'recipe_bed',
    outputItemId: 'rpg_bed',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 5 },
      { itemId: 'rpg_straw', quantity: 3 },
    ],
  },
  'recipe_wooden_pike': {
    recipeId: 'recipe_wooden_pike',
    outputItemId: 'rpg_wooden_pike',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_wood', quantity: 3 }],
  },
  'recipe_wooden_fence': {
    recipeId: 'recipe_wooden_fence',
    outputItemId: 'rpg_wooden_fence',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 1 },
      { itemId: 'rpg_stick', quantity: 2 },
    ],
  },
  'recipe_straw': {
    recipeId: 'recipe_straw',
    outputItemId: 'rpg_straw',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_hay', quantity: 1 }],
  },
  'recipe_wood_panel': {
    recipeId: 'recipe_wood_panel',
    outputItemId: 'rpg_wood_panel',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_wood_plank', quantity: 2 }],
  },
  'recipe_stone_slab': {
    recipeId: 'recipe_stone_slab',
    outputItemId: 'rpg_stone_slab',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_stone', quantity: 2 }],
  },
  'recipe_wood_tile': {
    recipeId: 'recipe_wood_tile',
    outputItemId: 'rpg_wood_tile',
    outputQuantity: 2,
    timeMinutes: 0.1,
    ingredients: [{ itemId: 'rpg_wood_plank', quantity: 1 }],
  },

  // Decorative Sanctuary objects — ported from rpg.tsx's old instant-craft
  // list (2026-06-28). No station required, unlike the resource recipes
  // above — these were never described as production-line goods.
  'recipe_woodland_planter': {
    recipeId: 'recipe_woodland_planter',
    outputItemId: 'Bush_simple1_1',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 4 },
      { itemId: 'rpg_leaves', quantity: 3 },
    ],
  },
  'recipe_crystal_lamp': {
    recipeId: 'recipe_crystal_lamp',
    outputItemId: 'Blue_crystal4',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_crystal_shards', quantity: 4 },
      { itemId: 'rpg_wood', quantity: 2 },
    ],
  },
  'recipe_temple_chest': {
    recipeId: 'recipe_temple_chest',
    outputItemId: 'Temple_animated_chest',
    outputQuantity: 1,
    timeMinutes: 0.1,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 6 },
      { itemId: 'rpg_crystal_shards', quantity: 2 },
    ],
  },
};

export function getAllCraftingRecipes(): CraftingRecipe[] {
  return Object.values(CRAFTING_CATALOG);
}

export function getCraftingRecipe(recipeId: string): CraftingRecipe | null {
  return CRAFTING_CATALOG[recipeId] || null;
}
