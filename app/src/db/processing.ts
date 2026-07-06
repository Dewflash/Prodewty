import { db } from './schema';
import { getProcessingRecipe } from '../engine/ProcessingCatalog';
import { sqlNow } from '../utils/date';
import { grantSkillPoints } from './skills';
import { getComputedStats } from './game';
import { applyFocusTimerReduction } from '../engine/StatEffects';

// Wave 5b — Processors v1 (RPG_PROGRESSION_LATTICE.md Wave 5). Mirrors
// db/crafting.ts exactly: a timed job (start → wait → claim) that consumes an
// input item and yields a higher-value artisan good, one active job per station
// object. Artisan goods sit between crafting and livestock, so claiming feeds
// BOTH masteries (crafting 6 + livestock 2) through grantSkillPoints so the
// stat→earn multiplier applies.

export type ProcessingJob = {
  id: number;
  recipe_id: string;
  station_object_id: number | null;
  started_at: string;
  completes_at: string;
  is_claimed: boolean;
};

export function getActiveProcessingJobs(): ProcessingJob[] {
  try {
    const rows = db.getAllSync<{
      id: number;
      recipe_id: string;
      station_object_id: number | null;
      started_at: string;
      completes_at: string;
      is_claimed: number;
    }>('SELECT * FROM rpg_processing_queue WHERE is_claimed = 0');
    return rows.map(r => ({ ...r, is_claimed: r.is_claimed === 1 }));
  } catch (e) {
    console.warn('Failed to fetch active processing jobs', e);
    return [];
  }
}

export function startProcessing(
  recipeId: string,
  stationObjectId: number,
): 'ok' | 'no_recipe' | 'no_station' | 'missing_ingredients' | 'station_busy' | 'db_error' {
  const recipe = getProcessingRecipe(recipeId);
  if (!recipe) return 'no_recipe';
  if (!stationObjectId) return 'no_station';

  try {
    db.execSync('BEGIN TRANSACTION');

    // One active job per station object — the caller passes the placed station's
    // sanctuary_objects id; we refuse if that station is already processing.
    const busy = db.getFirstSync<{ id: number }>(
      'SELECT id FROM rpg_processing_queue WHERE station_object_id = ? AND is_claimed = 0',
      stationObjectId,
    );
    if (busy) {
      db.execSync('ROLLBACK');
      return 'station_busy';
    }

    // Check input.
    const inv = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ? LIMIT 1',
      recipe.inputItemId, recipe.inputQuantity,
    );
    if (!inv) {
      db.execSync('ROLLBACK');
      return 'missing_ingredients';
    }

    // Deduct input.
    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?',
      recipe.inputQuantity, recipe.inputItemId,
    );

    const now = new Date();
    // Focus → processing speed (StatEffects.applyFocusTimerReduction): shave 1%
    // off the job duration per FOC point, capped at 30%. Same as crafting.
    const focTotal = getComputedStats().foc;
    const effectiveMinutes = applyFocusTimerReduction(recipe.timeMinutes, focTotal);
    const completesAt = new Date(now.getTime() + effectiveMinutes * 60 * 1000);

    db.runSync(
      `INSERT INTO rpg_processing_queue (recipe_id, station_object_id, started_at, completes_at, is_claimed)
       VALUES (?, ?, ?, ?, 0)`,
      recipeId, stationObjectId, sqlNow(now), sqlNow(completesAt),
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to start processing', e);
    return 'db_error';
  }
}

export function claimProcessing(jobId: number): 'ok' | 'not_ready' | 'no_job' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const job = db.getFirstSync<ProcessingJob>(
      'SELECT * FROM rpg_processing_queue WHERE id = ? AND is_claimed = 0',
      jobId,
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

    const recipe = getProcessingRecipe(job.recipe_id);
    if (!recipe) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    // Add output to inventory.
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      recipe.outputItemId, recipe.outputQuantity,
    );

    // Mark claimed.
    db.runSync('UPDATE rpg_processing_queue SET is_claimed = 1 WHERE id = ?', jobId);

    db.execSync('COMMIT');

    // Mastery accrual (RPG_PROGRESSION_LATTICE.md D3): artisan goods bridge
    // Crafting and Livestock, so both accrue. Both go through grantSkillPoints
    // so the stat→earn multiplier applies.
    grantSkillPoints('crafting', 6);
    grantSkillPoints('livestock', 2);

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim processing job', e);
    return 'db_error';
  }
}
