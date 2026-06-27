import { db } from './schema';
import { getCookingRecipe } from '../engine/CookingCatalog';
import { addSkillPoints } from './skills';

export function cookRecipe(recipeId: string): 'ok' | 'no_recipe' | 'missing_ingredients' | 'db_error' {
  const recipe = getCookingRecipe(recipeId);
  if (!recipe) return 'no_recipe';

  try {
    db.execSync('BEGIN TRANSACTION');

    // Check ingredients
    for (const ingredient of recipe.ingredients) {
      const inv = db.getFirstSync<{ quantity: number }>(
        'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ? LIMIT 1',
        ingredient.itemId, ingredient.quantity
      );
      if (!inv) {
        db.execSync('ROLLBACK');
        return 'missing_ingredients';
      }
    }

    // Deduct ingredients
    for (const ingredient of recipe.ingredients) {
      db.runSync(
        'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?',
        ingredient.quantity, ingredient.itemId
      );
    }

    // Add cooked food
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      recipe.outputItemId
    );

    db.execSync('COMMIT');

    addSkillPoints('farming', 5);

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to cook recipe', e);
    return 'db_error';
  }
}
