import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getDynamicSellPrice } from '../engine/MarketEngine';

export type ShippingItem = {
  id: number;
  item_id: string;
  quantity: number;
  added_at: string;
  sold: boolean;
};

// Deposit an item from inventory into the shipping bin
export function depositToShippingBin(itemId: string, quantity: number): 'ok' | 'no_item' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const inventoryCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ? LIMIT 1',
      itemId, quantity
    );

    if (!inventoryCheck) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?',
      quantity, itemId
    );

    db.runSync(
      'INSERT INTO shipping_bin (item_id, quantity, added_at, sold) VALUES (?, ?, ?, 0)',
      itemId, quantity, sqlNow()
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to deposit to shipping bin', e);
    return 'db_error';
  }
}

// Process the shipping bin (typically called overnight)
export function processShippingBin(): { itemsSold: number; totalRevenue: number } {
  try {
    db.execSync('BEGIN TRANSACTION');

    const itemsToSell = db.getAllSync<{ id: number; item_id: string; quantity: number }>(
      'SELECT id, item_id, quantity FROM shipping_bin WHERE sold = 0'
    );

    let totalRevenue = 0;
    let itemsSold = 0;

    for (const item of itemsToSell) {
      const sellPrice = getDynamicSellPrice(item.item_id);
      const revenue = sellPrice * item.quantity;
      
      totalRevenue += revenue;
      itemsSold += item.quantity;

      db.runSync('UPDATE shipping_bin SET sold = 1 WHERE id = ?', item.id);
    }

    if (totalRevenue > 0) {
      db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', totalRevenue);
    }

    db.execSync('COMMIT');
    return { itemsSold, totalRevenue };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to process shipping bin', e);
    return { itemsSold: 0, totalRevenue: 0 };
  }
}
