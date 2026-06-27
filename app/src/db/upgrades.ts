import { db } from './schema';
import { getPlaceableItem } from '../engine/RpgObjectCatalog';
import { startConstruction } from './construction';

export type UpgradeDefinition = {
  itemType: string;
  level: number;
  cost: { itemId: string, quantity: number }[];
  constructionType: string;
};

// Map of building type -> level -> upgrade definitions
export const UPGRADE_CATALOG: Record<string, Record<number, UpgradeDefinition>> = {
  'Barn': {
    2: {
      itemType: 'Barn',
      level: 2,
      cost: [
        { itemId: 'rpg_wood', quantity: 100 },
        { itemId: 'rpg_stone', quantity: 50 },
      ],
      constructionType: 'Barn_Upgrade_2'
    },
    3: {
      itemType: 'Barn',
      level: 3,
      cost: [
        { itemId: 'rpg_wood', quantity: 200 },
        { itemId: 'rpg_stone', quantity: 150 },
        { itemId: 'rpg_iron_bar', quantity: 10 },
      ],
      constructionType: 'Barn_Upgrade_3'
    }
  }
};

export function getUpgradeDef(itemType: string, level: number): UpgradeDefinition | null {
  return UPGRADE_CATALOG[itemType]?.[level] || null;
}

export function startUpgrade(objectId: number): 'ok' | 'no_object' | 'max_level' | 'no_resources' | 'db_error' {
  const obj = db.getFirstSync<{ type: string, level: number }>('SELECT type, level FROM sanctuary_objects WHERE id = ?', objectId);
  if (!obj) return 'no_object';

  const nextLevel = obj.level + 1;
  const upgradeDef = getUpgradeDef(obj.type, nextLevel);
  
  if (!upgradeDef) return 'max_level';

  try {
    db.execSync('BEGIN TRANSACTION');

    // Check inventory
    for (const cost of upgradeDef.cost) {
      const inventory = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = ?', cost.itemId);
      if (!inventory || inventory.quantity < cost.quantity) {
        db.execSync('ROLLBACK');
        return 'no_resources';
      }
    }

    // Deduct resources
    for (const cost of upgradeDef.cost) {
      db.runSync('UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?', cost.quantity, cost.itemId);
    }

    // Start construction timer using the construction table
    const result = startConstruction(objectId, upgradeDef.constructionType);
    
    if (!result.ok) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to start upgrade', e);
    return 'db_error';
  }
}

export function completeUpgrade(objectId: number): boolean {
  try {
    // Actually applying the upgrade is updating the level of the object
    const result = db.runSync('UPDATE sanctuary_objects SET level = level + 1 WHERE id = ?', objectId);
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to complete upgrade', e);
    return false;
  }
}
