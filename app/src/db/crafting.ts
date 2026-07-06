import { db } from './schema';
import { getCraftingRecipe } from '../engine/CraftingCatalog';
import { sqlNow } from '../utils/date';
import { grantSkillPoints } from './skills';
import { getComputedStats } from './game';
import { applyFocusTimerReduction } from '../engine/StatEffects';

export type CraftingJob = {
  id: number;
  recipe_id: string;
  started_at: string;
  completes_at: string;
  building_object_id: number | null;
  is_claimed: boolean;
};

export function getActiveCraftingJobs(): CraftingJob[] {
  try {
    const rows = db.getAllSync<{
      id: number;
      recipe_id: string;
      started_at: string;
      completes_at: string;
      building_object_id: number | null;
      is_claimed: number;
    }>('SELECT * FROM crafting_queue WHERE is_claimed = 0');
    return rows.map(r => ({ ...r, is_claimed: r.is_claimed === 1 }));
  } catch (e) {
    console.warn('Failed to fetch active crafting jobs', e);
    return [];
  }
}

export function startCrafting(recipeId: string, buildingObjectId: number | null = null): 'ok' | 'no_recipe' | 'missing_ingredients' | 'building_busy' | 'db_error' {
  const recipe = getCraftingRecipe(recipeId);
  if (!recipe) return 'no_recipe';

  try {
    db.execSync('BEGIN TRANSACTION');

    // If recipe requires a building, ensure it's not busy
    if (recipe.requiredBuilding) {
      if (!buildingObjectId) {
        db.execSync('ROLLBACK');
        return 'building_busy';
      }

      // Check if building is processing something else
      const busy = db.getFirstSync<{ id: number }>(
        'SELECT id FROM crafting_queue WHERE building_object_id = ? AND is_claimed = 0',
        buildingObjectId
      );
      if (busy) {
        db.execSync('ROLLBACK');
        return 'building_busy';
      }
      
      // We should technically also verify that buildingObjectId actually points to the correct requiredBuilding type
      // in sanctuary_objects, but we'll assume the caller (UI) filters this correctly for now.
    }

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

    const now = new Date();
    // Focus → craft speed (StatEffects.applyFocusTimerReduction): shave 1% off
    // the job duration per FOC point, capped at 30%. Applied to whole minutes
    // so a job still always takes at least a minute.
    const focTotal = getComputedStats().foc;
    const effectiveMinutes = applyFocusTimerReduction(recipe.timeMinutes, focTotal);
    const completesAt = new Date(now.getTime() + effectiveMinutes * 60 * 1000);

    db.runSync(
      `INSERT INTO crafting_queue (recipe_id, started_at, completes_at, building_object_id, is_claimed)
       VALUES (?, ?, ?, ?, 0)`,
      recipeId, sqlNow(now), sqlNow(completesAt), buildingObjectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to start crafting', e);
    return 'db_error';
  }
}

export function claimCrafting(jobId: number): 'ok' | 'not_ready' | 'no_job' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const job = db.getFirstSync<CraftingJob>(
      'SELECT * FROM crafting_queue WHERE id = ? AND is_claimed = 0',
      jobId
    );

    if (!job) {
      db.execSync('ROLLBACK');
      return 'no_job';
    }

    const nowStr = sqlNow();
    if (job.completes_at > nowStr) {
      db.execSync('ROLLBACK');
      return 'not_ready';
    }

    const recipe = getCraftingRecipe(job.recipe_id);
    if (!recipe) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    // Add to inventory
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      recipe.outputItemId, recipe.outputQuantity
    );

    // Mark claimed
    db.runSync('UPDATE crafting_queue SET is_claimed = 1 WHERE id = ?', jobId);

    db.execSync('COMMIT');

    // Mastery accrual (RPG_PROGRESSION_LATTICE.md D3): Furnace smelts feed
    // Mining; every other claimed craft feeds Crafting. Both go through
    // grantSkillPoints so the stat→earn multiplier applies.
    if (recipe.requiredBuilding === 'Furnace') {
      grantSkillPoints('mining', 10);
    } else {
      grantSkillPoints('crafting', 8);
    }

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim crafting job', e);
    return 'db_error';
  }
}
