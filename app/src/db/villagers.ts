import { db } from './schema';
import { sqlNow, localDateStr } from '../utils/date';
import { getVillagerDef, getGiftPoints } from '../engine/VillagerCatalog';

export type Villager = {
  id: number;
  villager_type: string;
  name: string;
  house_object_id: number | null;
  home_row: number;
  home_col: number;
  current_row: number;
  current_col: number;
  schedule: string;
  is_active: boolean;
};

export type VillagerRelationship = {
  villager_id: number;
  friendship_points: number;
  friendship_level: number;
  last_gift_at: string | null;
  gifts_today: number;
  last_gift_reset: string | null;
  total_gifts_given: number;
};

export function spawnVillager(villagerType: string, houseObjectId: number, homeRow: number, homeCol: number): boolean {
  const def = getVillagerDef(villagerType);
  if (!def) return false;

  try {
    db.execSync('BEGIN TRANSACTION');
    
    const result = db.runSync(
      `INSERT INTO villagers (villager_type, name, house_object_id, home_row, home_col, current_row, current_col)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      villagerType, def.name, houseObjectId, homeRow, homeCol, homeRow, homeCol
    );

    db.runSync(
      `INSERT INTO villager_relationships (villager_id) VALUES (?)`,
      result.lastInsertRowId
    );

    db.execSync('COMMIT');
    return true;
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to spawn villager', e);
    return false;
  }
}

export function getAllVillagers(): (Villager & VillagerRelationship)[] {
  try {
    const rows = db.getAllSync<any>(`
      SELECT v.*, r.friendship_points, r.friendship_level, r.last_gift_at, r.gifts_today, r.last_gift_reset, r.total_gifts_given
      FROM villagers v
      JOIN villager_relationships r ON v.id = r.villager_id
      WHERE v.is_active = 1
    `);
    return rows.map(r => ({
      ...r,
      is_active: r.is_active === 1,
    }));
  } catch {
    return [];
  }
}

export function giveGift(villagerId: number, itemId: string): 'ok' | 'no_villager' | 'no_item' | 'limit_reached' | 'db_error' {
  const today = localDateStr();
  
  try {
    db.execSync('BEGIN TRANSACTION');

    const villager = db.getFirstSync<any>(`
      SELECT v.villager_type, r.gifts_today, r.last_gift_reset
      FROM villagers v
      JOIN villager_relationships r ON v.id = r.villager_id
      WHERE v.id = ?
    `, villagerId);

    if (!villager) {
      db.execSync('ROLLBACK');
      return 'no_villager';
    }

    // Check daily limit
    let currentGiftsToday = villager.gifts_today;
    if (villager.last_gift_reset !== today) {
      currentGiftsToday = 0;
    }
    
    if (currentGiftsToday >= 2) {
      db.execSync('ROLLBACK');
      return 'limit_reached';
    }

    // Consume item
    const itemUpdate = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
      itemId
    );
    
    if (itemUpdate.changes <= 0) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    // Calculate points
    const def = getVillagerDef(villager.villager_type);
    const preference = def?.giftPreferences[itemId] || 'neutral';
    const points = getGiftPoints(preference);

    const now = sqlNow();
    db.runSync(`
      UPDATE villager_relationships
      SET friendship_points = MAX(0, friendship_points + ?),
          friendship_level = (MAX(0, friendship_points + ?) / 250), 
          last_gift_at = ?,
          gifts_today = ? + 1,
          last_gift_reset = ?,
          total_gifts_given = total_gifts_given + 1,
          updated_at = ?
      WHERE villager_id = ?
    `, points, points, now, currentGiftsToday, today, now, villagerId);

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to give gift', e);
    return 'db_error';
  }
}
