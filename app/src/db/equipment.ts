import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getEquipmentDef, EquipmentSlot } from '../engine/EquipmentCatalog';

export type PlayerEquipment = {
  slot: EquipmentSlot;
  item_id: string | null;
  equipped_at: string;
};

export function getEquipment(slot: EquipmentSlot): PlayerEquipment | null {
  try {
    const row = db.getFirstSync<PlayerEquipment>(
      'SELECT slot, item_id, equipped_at FROM player_equipment WHERE slot = ? LIMIT 1',
      slot
    );
    return row ?? null;
  } catch {
    return null;
  }
}

export function getAllEquipment(): Record<EquipmentSlot, PlayerEquipment | null> {
  const result: Record<EquipmentSlot, PlayerEquipment | null> = {
    weapon: null,
    armor: null,
    accessory: null,
    tool: null,
  };

  try {
    const rows = db.getAllSync<PlayerEquipment>('SELECT slot, item_id, equipped_at FROM player_equipment');
    for (const row of rows) {
      if (row.slot in result) {
        result[row.slot as EquipmentSlot] = row;
      }
    }
  } catch (e) {
    console.warn('Failed to get all equipment', e);
  }

  return result;
}

export function equipItem(itemId: string): 'ok' | 'no_item' | 'invalid_equipment' | 'db_error' {
  const def = getEquipmentDef(itemId);
  if (!def) return 'invalid_equipment';

  try {
    db.execSync('BEGIN TRANSACTION');

    // Check if player has the item in inventory
    const inventoryCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity > 0 LIMIT 1',
      itemId
    );
    
    if (!inventoryCheck || inventoryCheck.quantity <= 0) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    // Get currently equipped item in this slot (if any)
    const currentEquip = db.getFirstSync<{ item_id: string | null }>(
      'SELECT item_id FROM player_equipment WHERE slot = ? LIMIT 1',
      def.slot
    );

    // Unequip current item: add it back to inventory
    if (currentEquip && currentEquip.item_id) {
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
        currentEquip.item_id
      );
    }

    // Equip new item: remove from inventory
    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?',
      itemId
    );

    // Update equipment slot
    db.runSync(
      'UPDATE player_equipment SET item_id = ?, equipped_at = ? WHERE slot = ?',
      itemId, sqlNow(), def.slot
    );

    // Apply permanent health bonus if any
    if (currentEquip && currentEquip.item_id) {
      const currentDef = getEquipmentDef(currentEquip.item_id);
      if (currentDef?.stats.maxHp) {
        db.runSync('UPDATE rpg_state SET hp_max = MAX(10, hp_max - ?) WHERE id = 1', currentDef.stats.maxHp);
        db.runSync('UPDATE rpg_state SET hp = MIN(hp, hp_max) WHERE id = 1');
      }
    }

    if (def.stats.maxHp) {
      db.runSync('UPDATE rpg_state SET hp_max = hp_max + ? WHERE id = 1', def.stats.maxHp);
      db.runSync('UPDATE rpg_state SET hp = hp + ? WHERE id = 1', def.stats.maxHp);
    }

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to equip item', e);
    return 'db_error';
  }
}

export function unequipItem(slot: EquipmentSlot): 'ok' | 'empty_slot' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const currentEquip = db.getFirstSync<{ item_id: string | null }>(
      'SELECT item_id FROM player_equipment WHERE slot = ? LIMIT 1',
      slot
    );

    if (!currentEquip || !currentEquip.item_id) {
      db.execSync('ROLLBACK');
      return 'empty_slot';
    }

    // Add back to inventory
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      currentEquip.item_id
    );

    // Clear slot
    db.runSync(
      'UPDATE player_equipment SET item_id = NULL, equipped_at = ? WHERE slot = ?',
      sqlNow(), slot
    );

    // Remove permanent health bonus if any
    const currentDef = getEquipmentDef(currentEquip.item_id);
    if (currentDef?.stats.maxHp) {
      db.runSync('UPDATE rpg_state SET hp_max = MAX(10, hp_max - ?) WHERE id = 1', currentDef.stats.maxHp);
      db.runSync('UPDATE rpg_state SET hp = MIN(hp, hp_max) WHERE id = 1');
    }

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to unequip item', e);
    return 'db_error';
  }
}
