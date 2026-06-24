import { db } from './schema';
import { sqlNow } from '../utils/date';

export type GardenPlot = {
  id: number;
  item_id: string;
  grid_x: number;
  grid_y: number;
  planted_at: string;
  growth_stage: number;
};

export type UserInventoryItem = {
  id: number;
  item_id: string;
  quantity: number;
};

// --- Garden Plots ---

export function getGardenPlots(): GardenPlot[] {
  try {
    return db.getAllSync<GardenPlot>('SELECT * FROM garden_plots');
  } catch { return []; }
}

export function plantItem(itemId: string, x: number, y: number): void {
  const now = sqlNow();
  db.runSync(
    'INSERT INTO garden_plots (item_id, grid_x, grid_y, planted_at, growth_stage) VALUES (?, ?, ?, ?, ?)',
    itemId, x, y, now, 0
  );
}

export function removePlant(id: number): void {
  db.runSync('DELETE FROM garden_plots WHERE id = ?', id);
}

export function updatePlantGrowth(id: number, stage: number): void {
  db.runSync('UPDATE garden_plots SET growth_stage = ? WHERE id = ?', stage, id);
}

// --- Inventory ---

export function getInventory(): UserInventoryItem[] {
  try {
    return db.getAllSync<UserInventoryItem>('SELECT * FROM user_inventory WHERE quantity > 0');
  } catch { return []; }
}

export function getInventoryQuantity(itemId: string): number {
  try {
    const row = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = ?', itemId);
    return row?.quantity ?? 0;
  } catch { return 0; }
}

export function addInventoryItem(itemId: string, amount: number = 1): void {
  db.runSync(`
    INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
    ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `, itemId, amount);
}

export function useInventoryItem(itemId: string, amount: number = 1): boolean {
  const current = getInventoryQuantity(itemId);
  if (current < amount) return false;
  
  db.runSync('UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?', amount, itemId);
  return true;
}
