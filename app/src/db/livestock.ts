import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getLivestockDef } from '../engine/LivestockCatalog';

export type SanctuaryLivestock = {
  id: number;
  object_id: number;
  animal_type: string;
  name: string;
  happiness: number;
  last_fed_at: string | null;
  fed_until: string | null;
  last_yield_at: string | null;
  yield_ready: boolean;
  times_fed: number;
  times_yielded: number;
};

export function registerLivestock(objectId: number, animalType: string): boolean {
  try {
    db.runSync(
      `INSERT INTO sanctuary_livestock (object_id, animal_type) VALUES (?, ?)`,
      objectId, animalType
    );
    return true;
  } catch (e) {
    console.warn('Failed to register livestock', e);
    return false;
  }
}

export function getLivestock(objectId: number): SanctuaryLivestock | null {
  try {
    const row = db.getFirstSync<{
      id: number;
      object_id: number;
      animal_type: string;
      name: string;
      happiness: number;
      last_fed_at: string | null;
      fed_until: string | null;
      last_yield_at: string | null;
      yield_ready: number;
      times_fed: number;
      times_yielded: number;
    }>('SELECT * FROM sanctuary_livestock WHERE object_id = ? LIMIT 1', objectId);

    if (!row) return null;
    return { ...row, yield_ready: row.yield_ready === 1 };
  } catch {
    return null;
  }
}

export function getAllLivestock(): SanctuaryLivestock[] {
  try {
    const rows = db.getAllSync<{
      id: number;
      object_id: number;
      animal_type: string;
      name: string;
      happiness: number;
      last_fed_at: string | null;
      fed_until: string | null;
      last_yield_at: string | null;
      yield_ready: number;
      times_fed: number;
      times_yielded: number;
    }>('SELECT * FROM sanctuary_livestock');
    return rows.map(r => ({ ...r, yield_ready: r.yield_ready === 1 }));
  } catch {
    return [];
  }
}

export function feedLivestock(objectId: number): 'ok' | 'already_fed' | 'no_animal' | 'no_food' | 'db_error' {
  const livestock = getLivestock(objectId);
  if (!livestock) return 'no_animal';

  const def = getLivestockDef(livestock.animal_type);
  if (!def) return 'no_animal';

  try {
    db.execSync('BEGIN TRANSACTION');
    
    // Check if we have the food
    const itemUpdate = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
      def.feedItemId
    );
    
    if (itemUpdate.changes <= 0) {
      db.execSync('ROLLBACK');
      return 'no_food';
    }

    const now = new Date();
    // They are fed for their yield cooldown duration
    const fedUntil = new Date(now.getTime() + def.yieldCooldownMinutes * 60000);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatSqlDate = (d: Date) => 
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    db.runSync(
      `UPDATE sanctuary_livestock 
       SET last_fed_at = ?, fed_until = ?, times_fed = times_fed + 1, happiness = MIN(100, happiness + 5)
       WHERE object_id = ?`,
      formatSqlDate(now),
      formatSqlDate(fedUntil),
      objectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to feed livestock', e);
    return 'db_error';
  }
}

export function checkLivestockYields(): number {
  const now = sqlNow();
  try {
    const result = db.runSync(
      `UPDATE sanctuary_livestock 
       SET yield_ready = 1 
       WHERE yield_ready = 0 AND fed_until IS NOT NULL AND fed_until <= ?`,
      now
    );
    return result.changes;
  } catch (e) {
    console.warn('Failed to check livestock yields', e);
    return 0;
  }
}

export function collectLivestockYield(objectId: number): 'ok' | 'not_ready' | 'db_error' {
  const livestock = getLivestock(objectId);
  if (!livestock || !livestock.yield_ready) return 'not_ready';

  const def = getLivestockDef(livestock.animal_type);
  if (!def) return 'db_error';

  try {
    db.execSync('BEGIN TRANSACTION');

    // Give items
    def.drops.forEach(drop => {
      if (Math.random() <= drop.chance) {
        const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
        if (qty > 0) {
          db.runSync(
            `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
             ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
            drop.itemId, qty
          );
        }
      }
    });

    const now = sqlNow();
    db.runSync(
      `UPDATE sanctuary_livestock 
       SET yield_ready = 0, last_yield_at = ?, fed_until = NULL, times_yielded = times_yielded + 1
       WHERE object_id = ?`,
      now, objectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to collect livestock yield', e);
    return 'db_error';
  }
}
