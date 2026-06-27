import { db } from './schema';
import { ALL_MINERALS } from '../engine/ArtifactCatalog';
import { getRPGState } from './rpg';

const GEODE_BREAK_COST = 25; // 25 coins to break a geode at Blacksmith

export function breakGeode(): 'ok' | 'no_geodes' | 'no_coins' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const geodeCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = "rpg_geode" AND quantity >= 1'
    );

    if (!geodeCheck) {
      db.execSync('ROLLBACK');
      return 'no_geodes';
    }

    const rpg = getRPGState();
    if (rpg.coins < GEODE_BREAK_COST) {
      db.execSync('ROLLBACK');
      return 'no_coins';
    }

    // Deduct coins and geode
    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', GEODE_BREAK_COST);
    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = "rpg_geode"');

    // Pick random mineral
    const mineralId = ALL_MINERALS[Math.floor(Math.random() * ALL_MINERALS.length)];

    // Give mineral
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      mineralId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}
