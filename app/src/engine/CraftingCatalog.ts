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
  }
};

export function getCraftingRecipe(recipeId: string): CraftingRecipe | null {
  return CRAFTING_CATALOG[recipeId] || null;
}
