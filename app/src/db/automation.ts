import { db } from './schema';
import { sqlNow } from '../utils/date';

export type AutomationGenerator = {
  id: number;
  object_id: number;
  generator_type: string;
  last_collected_at: string;
  accumulated_quantity: number;
};

// Map of generator types to their production rates
export const GENERATOR_CATALOG: Record<string, { itemId: string; amountPerHour: number; maxCapacity: number }> = {
  'Water_well': { itemId: 'rpg_water_drops', amountPerHour: 1, maxCapacity: 24 },
  'Crystal_geode': { itemId: 'rpg_crystal_shards', amountPerHour: 0.5, maxCapacity: 12 }, // 1 every 2 hours
};

export function registerGenerator(objectId: number, generatorType: string): boolean {
  try {
    db.runSync(
      `INSERT INTO sanctuary_generators (object_id, generator_type, last_collected_at, accumulated_quantity)
       VALUES (?, ?, ?, 0)`,
      objectId, generatorType, sqlNow()
    );
    return true;
  } catch (e) {
    console.warn('Failed to register generator', e);
    return false;
  }
}

export function tickGenerators(): number {
  // In a real implementation, this would be called periodically.
  // It calculates the time difference since last_collected_at and updates accumulated_quantity.
  
  try {
    const generators = db.getAllSync<AutomationGenerator>('SELECT * FROM sanctuary_generators');
    let updatedCount = 0;
    
    const now = new Date();

    for (const gen of generators) {
      const def = GENERATOR_CATALOG[gen.generator_type];
      if (!def) continue;

      const lastCollected = new Date(gen.last_collected_at);
      const hoursPassed = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
      
      const newAccumulation = Math.floor(hoursPassed * def.amountPerHour);
      
      if (newAccumulation > gen.accumulated_quantity) {
        const cappedQuantity = Math.min(newAccumulation, def.maxCapacity);
        
        db.runSync(
          'UPDATE sanctuary_generators SET accumulated_quantity = ? WHERE id = ?',
          cappedQuantity, gen.id
        );
        updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (e) {
    console.warn('Failed to tick generators', e);
    return 0;
  }
}

export function collectGenerator(objectId: number): 'ok' | 'no_generator' | 'empty' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const gen = db.getFirstSync<AutomationGenerator>(
      'SELECT * FROM sanctuary_generators WHERE object_id = ?',
      objectId
    );
    
    if (!gen) {
      db.execSync('ROLLBACK');
      return 'no_generator';
    }
    
    if (gen.accumulated_quantity <= 0) {
      db.execSync('ROLLBACK');
      return 'empty';
    }

    const def = GENERATOR_CATALOG[gen.generator_type];
    if (!def) {
      db.execSync('ROLLBACK');
      return 'db_error'; // Invalid definition
    }

    // Add to inventory
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      def.itemId, gen.accumulated_quantity
    );

    // Reset generator
    db.runSync(
      'UPDATE sanctuary_generators SET last_collected_at = ?, accumulated_quantity = 0 WHERE id = ?',
      sqlNow(), gen.id
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to collect generator', e);
    return 'db_error';
  }
}
