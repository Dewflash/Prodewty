import { db } from './schema';
import { getEnemyDef } from '../engine/EnemyCatalog';
import { getRPGState } from './rpg';
import { addSkillPoints } from './skills';
import { MineEntity } from './mines';

// We swing a weapon at a specific coordinate
export function swingWeapon(floorLevel: number, row: number, col: number, weaponDamage: number): 'miss' | 'hit' | 'killed' | 'no_energy' | 'db_error' {
  try {
    const rpg = getRPGState();
    if (rpg.energy < 1) return 'no_energy';

    db.execSync('BEGIN TRANSACTION');
    
    db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - 1) WHERE id = 1');

    const entity = db.getFirstSync<MineEntity>(
      'SELECT * FROM mine_entities WHERE floor_level = ? AND row = ? AND col = ?',
      floorLevel, row, col
    );

    if (!entity) {
      db.execSync('COMMIT');
      return 'miss';
    }

    const def = getEnemyDef(entity.type);
    if (!def) {
      // It might be a rock, handled by hitResourceNode instead of swingWeapon, 
      // but if we hit it with a sword it just misses or clinks.
      db.execSync('COMMIT');
      return 'miss';
    }

    const newHealth = entity.health - weaponDamage;

    if (newHealth <= 0) {
      // Enemy killed
      db.runSync('DELETE FROM mine_entities WHERE id = ?', entity.id);
      
      // Drops
      for (const drop of def.drops) {
        if (Math.random() < drop.chance) {
          const qty = Math.floor(Math.random() * drop.max) + 1;
          db.runSync(
            `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
             ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
            drop.itemId, qty
          );
        }
      }

      // Small chance for a geode drop
      if (Math.random() < 0.1) {
        db.runSync(
          `INSERT INTO user_inventory (item_id, quantity) VALUES ('rpg_geode', 1)
           ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`
        );
      }

      db.execSync('COMMIT');
      
      addSkillPoints('combat', def.points);
      return 'killed';
    } else {
      // Just hit
      // We could add knockback by updating row/col, but skip for simplicity
      db.runSync('UPDATE mine_entities SET health = ?, state = "aggro" WHERE id = ?', newHealth, entity.id);
      db.execSync('COMMIT');
      return 'hit';
    }
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}
