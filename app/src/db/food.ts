import { db } from './schema';

export type FoodDefinition = {
  itemId: string;
  energyRestore: number;
  hpRestore: number;
};

export const FOOD_CATALOG: Record<string, FoodDefinition> = {
  'rpg_turnip': { itemId: 'rpg_turnip', energyRestore: 15, hpRestore: 5 },
  'rpg_cabbage': { itemId: 'rpg_cabbage', energyRestore: 25, hpRestore: 10 },
  'rpg_pumpkin': { itemId: 'rpg_pumpkin', energyRestore: 40, hpRestore: 20 },
  'rpg_cheese': { itemId: 'rpg_cheese', energyRestore: 50, hpRestore: 25 },
  'rpg_egg': { itemId: 'rpg_egg', energyRestore: 10, hpRestore: 2 },
  'rpg_milk': { itemId: 'rpg_milk', energyRestore: 20, hpRestore: 10 },
  'rpg_salad': { itemId: 'rpg_salad', energyRestore: 60, hpRestore: 30 },
  'rpg_omelet': { itemId: 'rpg_omelet', energyRestore: 70, hpRestore: 35 },
};

export function getFoodDef(itemId: string): FoodDefinition | null {
  return FOOD_CATALOG[itemId] || null;
}

export function consumeFood(itemId: string): 'ok' | 'no_item' | 'not_food' | 'db_error' {
  const def = getFoodDef(itemId);
  if (!def) return 'not_food';

  try {
    db.execSync('BEGIN TRANSACTION');

    const inventoryCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity > 0 LIMIT 1',
      itemId
    );

    if (!inventoryCheck || inventoryCheck.quantity <= 0) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    // Deduct item
    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?',
      itemId
    );

    // Restore energy and HP
    if (def.energyRestore > 0) {
      db.runSync(
        'UPDATE rpg_state SET energy = MIN(energy_max, energy + ?) WHERE id = 1',
        def.energyRestore
      );
    }
    
    if (def.hpRestore > 0) {
      db.runSync(
        'UPDATE rpg_state SET hp = MIN(hp_max, hp + ?) WHERE id = 1',
        def.hpRestore
      );
    }

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to consume food', e);
    return 'db_error';
  }
}
