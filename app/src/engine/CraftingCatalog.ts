export type CraftingRecipe = {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  timeMinutes: number;
  ingredients: { itemId: string; quantity: number }[];
  requiredBuilding?: string; // e.g., 'Furnace', 'Loom'
};

export const CRAFTING_CATALOG: Record<string, CraftingRecipe> = {
  'recipe_iron_bar': {
    recipeId: 'recipe_iron_bar',
    outputItemId: 'rpg_iron_bar',
    outputQuantity: 1,
    timeMinutes: 30, // Takes 30 real minutes
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
    timeMinutes: 60,
    ingredients: [
      { itemId: 'rpg_wool', quantity: 3 }
    ],
    requiredBuilding: 'Loom'
  },
  'recipe_wood_plank': {
    recipeId: 'recipe_wood_plank',
    outputItemId: 'rpg_wood_plank',
    outputQuantity: 2,
    timeMinutes: 5,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 2 }
    ]
  },

  // Decorative Sanctuary objects — ported from rpg.tsx's old instant-craft
  // list (2026-06-28). No station required, unlike the resource recipes
  // above — these were never described as production-line goods.
  'recipe_woodland_planter': {
    recipeId: 'recipe_woodland_planter',
    outputItemId: 'Bush_simple1_1',
    outputQuantity: 1,
    timeMinutes: 10,
    ingredients: [
      { itemId: 'rpg_wood', quantity: 4 },
      { itemId: 'rpg_leaves', quantity: 3 },
    ],
  },
  'recipe_crystal_lamp': {
    recipeId: 'recipe_crystal_lamp',
    outputItemId: 'Blue_crystal4',
    outputQuantity: 1,
    timeMinutes: 15,
    ingredients: [
      { itemId: 'rpg_crystal_shards', quantity: 4 },
      { itemId: 'rpg_wood', quantity: 2 },
    ],
  },
  'recipe_temple_chest': {
    recipeId: 'recipe_temple_chest',
    outputItemId: 'Temple_animated_chest',
    outputQuantity: 1,
    timeMinutes: 20,
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
