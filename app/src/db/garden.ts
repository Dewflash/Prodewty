import { db } from './schema';
import { sqlNow } from '../utils/date';
import { recordRpgDiscovery } from './rpgDiscovery';

export type GrowthStage = 0 | 1 | 2;

export type GardenPlot = {
  id: number;
  seed_item_id: string;
  crop_id: string;
  row: number;
  col: number;
  planted_at: string;
  growth_stage: GrowthStage;
  updated_at: string;
};

export type UserInventoryItem = {
  id: number;
  item_id: string;
  quantity: number;
};

export type PlantSeedResult =
  | { ok: true; plotId: number }
  | { ok: false; reason: 'no_seed' | 'occupied' | 'db_error' };

export type HarvestDrop = {
  itemId: string;
  quantity: number;
};

export type HarvestPlotResult =
  | { ok: true; coins: number; drops: HarvestDrop[] }
  | { ok: false; reason: 'no_plot' | 'db_error' };

export type AdvancePlotResult =
  | { ok: true; stage: GrowthStage }
  | { ok: false; reason: 'no_plot' | 'no_item' | 'db_error' };

// --- Garden Plots ---

export function getGardenPlots(): GardenPlot[] {
  try {
    return db.getAllSync<GardenPlot>('SELECT * FROM garden_plots ORDER BY row ASC, col ASC');
  } catch {
    return [];
  }
}

export function getGardenPlotAt(row: number, col: number): GardenPlot | null {
  try {
    return db.getFirstSync<GardenPlot>(
      'SELECT * FROM garden_plots WHERE row = ? AND col = ? LIMIT 1',
      row, col,
    ) ?? null;
  } catch {
    return null;
  }
}

export function insertGardenPlot(seedItemId: string, cropId: string, row: number, col: number): PlantSeedResult {
  const now = sqlNow();
  try {
    const result = db.runSync(
      `INSERT INTO garden_plots (seed_item_id, crop_id, row, col, planted_at, growth_stage, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      seedItemId, cropId, row, col, now, now,
    );
    return { ok: true, plotId: result.lastInsertRowId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes('unique')) return { ok: false, reason: 'occupied' };
    console.warn('Failed to insert garden plot', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function plantSeed(seedItemId: string, cropId: string, row: number, col: number): PlantSeedResult {
  const now = sqlNow();
  try {
    db.execSync('BEGIN TRANSACTION');
    const seedUpdate = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
      seedItemId,
    );
    if (seedUpdate.changes <= 0) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'no_seed' };
    }

    const result = db.runSync(
      `INSERT INTO garden_plots (seed_item_id, crop_id, row, col, planted_at, growth_stage, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      seedItemId, cropId, row, col, now, now,
    );
    db.execSync('COMMIT');
    return { ok: true, plotId: result.lastInsertRowId };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes('unique')) return { ok: false, reason: 'occupied' };
    console.warn('Failed to plant seed', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function removePlant(id: number): void {
  db.runSync('DELETE FROM garden_plots WHERE id = ?', id);
}

export function updatePlantGrowth(id: number, stage: GrowthStage): void {
  db.runSync(
    `UPDATE garden_plots
     SET growth_stage = ?, updated_at = ?
     WHERE id = ?`,
    stage, sqlNow(), id,
  );
}

export function harvestGardenPlot(id: number, coins: number, drops: HarvestDrop[]): HarvestPlotResult {
  try {
    db.execSync('BEGIN TRANSACTION');
    const plot = db.getFirstSync<{ id: number }>('SELECT id FROM garden_plots WHERE id = ? LIMIT 1', id);
    if (!plot) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'no_plot' };
    }

    if (coins > 0) {
      db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', coins);
    }

    drops.forEach(drop => {
      if (drop.quantity <= 0) return;
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
        drop.itemId, drop.quantity,
      );
      recordRpgDiscovery(drop.itemId, 'harvest');
    });

    db.runSync('DELETE FROM garden_plots WHERE id = ?', id);
    db.execSync('COMMIT');
    return { ok: true, coins, drops };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to harvest garden plot', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function advanceGardenPlotWithInventoryItem(
  plotId: number,
  itemId: string,
  nextStage: GrowthStage,
): AdvancePlotResult {
  try {
    db.execSync('BEGIN TRANSACTION');
    const plot = db.getFirstSync<{ id: number }>('SELECT id FROM garden_plots WHERE id = ? LIMIT 1', plotId);
    if (!plot) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'no_plot' };
    }

    const itemUpdate = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
      itemId,
    );
    if (itemUpdate.changes <= 0) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'no_item' };
    }

    db.runSync(
      `UPDATE garden_plots
       SET growth_stage = ?, updated_at = ?
       WHERE id = ?`,
      nextStage, sqlNow(), plotId,
    );
    db.execSync('COMMIT');
    return { ok: true, stage: nextStage };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to advance garden plot', e);
    return { ok: false, reason: 'db_error' };
  }
}

// Backward-compatible wrapper for older callers that used x/y naming.
export function plantItem(itemId: string, x: number, y: number): void {
  insertGardenPlot(itemId, `${itemId}_crop`, y, x);
}

// --- Inventory ---

export function getInventory(): UserInventoryItem[] {
  try {
    return db.getAllSync<UserInventoryItem>(
      'SELECT id, item_id, quantity FROM user_inventory WHERE quantity > 0 ORDER BY item_id ASC',
    );
  } catch {
    return [];
  }
}

export function getInventoryQuantity(itemId: string): number {
  try {
    const row = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ?',
      itemId,
    );
    return row?.quantity ?? 0;
  } catch {
    return 0;
  }
}

export function addInventoryItem(itemId: string, amount: number = 1): void {
  db.runSync(
    `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
     ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
    itemId, amount,
  );
  recordRpgDiscovery(itemId, 'inventory');
}

export function useInventoryItem(itemId: string, amount: number = 1): boolean {
  const result = db.runSync(
    'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ? AND quantity >= ?',
    amount, itemId, amount,
  );
  return result.changes > 0;
}
