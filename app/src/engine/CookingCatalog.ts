export type CookingRecipe = {
  recipeId: string;
  outputItemId: string; // The food item (must exist in FOOD_CATALOG in food.ts)
  ingredients: { itemId: string; quantity: number }[];
};

export const COOKING_CATALOG: Record<string, CookingRecipe> = {
  'recipe_salad': {
    recipeId: 'recipe_salad',
    outputItemId: 'rpg_salad', // Assume this exists or will be added to food.ts
    ingredients: [
      { itemId: 'rpg_cabbage', quantity: 1 },
      { itemId: 'rpg_turnip', quantity: 1 }
    ]
  },
  'recipe_omelet': {
    recipeId: 'recipe_omelet',
    outputItemId: 'rpg_omelet',
    ingredients: [
      { itemId: 'rpg_egg', quantity: 2 },
      { itemId: 'rpg_milk', quantity: 1 }
    ]
  }
};

export function getCookingRecipe(recipeId: string): CookingRecipe | null {
  return COOKING_CATALOG[recipeId] || null;
}
