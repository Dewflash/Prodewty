import { db } from './schema';
import { getRPGState } from './rpg';
import { sqlNow } from '../utils/date';
import { getCropForSeed } from '../engine/RpgObjectCatalog';
import { addSkillPoints } from './skills';

export type FarmingPlot = {
  id: number;
  row: number;
  col: number;
  is_watered: boolean;
  planted_seed_id: string | null;
  growth_stage: number;
  planted_at: string | null;
};

// Async Write Queue to serialize database writes
class DBQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async enqueue<T>(op: () => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await op();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const op = this.queue.shift();
      if (op) {
        try {
          await op();
        } catch (e) {
          // Handled in enqueue promise
        }
      }
    }
    this.processing = false;
  }
}

export const dbQueue = new DBQueue();

// Cost to till, plant, water
const TILL_COST = 2;
const PLANT_COST = 1;
const WATER_COST = 1;

export async function tillSoil(row: number, col: number): Promise<'ok' | 'no_energy' | 'occupied' | 'db_error'> {
  return dbQueue.enqueue(() => {
    const rpg = getRPGState();
    if (rpg.energy < TILL_COST) return 'no_energy';

    // Check if anything is already on this grid space
    const objectExists = db.getFirstSync<{ id: number }>('SELECT id FROM sanctuary_objects WHERE row = ? AND col = ?', row, col);
    const resourceExists = db.getFirstSync<{ id: number }>('SELECT id FROM resource_nodes WHERE row = ? AND col = ?', row, col);
    const plotExists = db.getFirstSync<{ id: number }>('SELECT id FROM farming_plots WHERE row = ? AND col = ?', row, col);

    if (objectExists || resourceExists || plotExists) return 'occupied';

    try {
      db.execSync('BEGIN TRANSACTION');
      db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1', TILL_COST);
      db.runSync('INSERT INTO farming_plots (row, col) VALUES (?, ?)', row, col);

      // 5% chance to find an artifact
      if (Math.random() < 0.05) {
        db.runSync(
          `INSERT INTO user_inventory (item_id, quantity) VALUES ('rpg_dwarvish_helm', 1)
           ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`
        );
      }

      db.execSync('COMMIT');
      
      addSkillPoints('farming', 2);
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}

export async function plantSeed(row: number, col: number, seedId: string): Promise<'ok' | 'no_energy' | 'no_plot' | 'occupied' | 'no_seed' | 'db_error'> {
  return dbQueue.enqueue(() => {
    const rpg = getRPGState();
    if (rpg.energy < PLANT_COST) return 'no_energy';

    try {
      db.execSync('BEGIN TRANSACTION');
      
      const plot = db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col);
      if (!plot) {
        db.execSync('ROLLBACK');
        return 'no_plot';
      }
      if (plot.planted_seed_id) {
        db.execSync('ROLLBACK');
        return 'occupied';
      }

      const inventoryCheck = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity > 0 LIMIT 1', seedId);
      if (!inventoryCheck) {
        db.execSync('ROLLBACK');
        return 'no_seed';
      }

      db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?', seedId);
      db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1', PLANT_COST);
      db.runSync('UPDATE farming_plots SET planted_seed_id = ?, growth_stage = 0, planted_at = ? WHERE id = ?', seedId, sqlNow(), plot.id);
      
      db.execSync('COMMIT');
      
      addSkillPoints('farming', 3);
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}

export async function waterPlot(row: number, col: number): Promise<'ok' | 'no_energy' | 'no_plot' | 'already_watered' | 'db_error'> {
  return dbQueue.enqueue(() => {
    const rpg = getRPGState();
    if (rpg.energy < WATER_COST) return 'no_energy';

    try {
      db.execSync('BEGIN TRANSACTION');
      
      const plot = db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col);
      if (!plot) {
        db.execSync('ROLLBACK');
        return 'no_plot';
      }
      if (plot.is_watered) {
        db.execSync('ROLLBACK');
        return 'already_watered';
      }

      db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1', WATER_COST);
      db.runSync('UPDATE farming_plots SET is_watered = 1 WHERE id = ?', plot.id);
      
      db.execSync('COMMIT');
      
      addSkillPoints('farming', 1);
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}

export function processOvernightFarming(newSeason?: string): void {
  try {
    db.execSync('BEGIN TRANSACTION');
    
    // Watered plots grow their crop
    const plots = db.getAllSync<FarmingPlot & { crop_item_id: string | null; current_stage: number }>('SELECT *, planted_seed_id as crop_item_id, growth_stage as current_stage FROM farming_plots');
    
    for (const p of plots) {
      if (!p.crop_item_id) {
        db.runSync('UPDATE farming_plots SET is_watered = 0 WHERE id = ?', p.id);
        continue;
      }

      const def = getCropForSeed(p.crop_item_id);
      
      // If season changed and crop is out of season, it dies (we'll just remove it for now)
      if (newSeason && def && !def.preferredSeasons.includes(newSeason as any)) {
        db.runSync('UPDATE farming_plots SET planted_seed_id = NULL, growth_stage = 0, is_watered = 0 WHERE id = ?', p.id);
        continue;
      }

      if (p.is_watered && def) {
        // Growth happens
        const maxStage = 2; // RpgGrowthStage max is 2
        if (p.current_stage < maxStage) {
          db.runSync(
            'UPDATE farming_plots SET growth_stage = growth_stage + 1, is_watered = 0 WHERE id = ?',
            p.id
          );
        } else {
          // Already fully grown, just un-water
          db.runSync('UPDATE farming_plots SET is_watered = 0 WHERE id = ?', p.id);
        }
      } else {
        // Not watered, no growth, just un-water just in case
        db.runSync('UPDATE farming_plots SET is_watered = 0 WHERE id = ?', p.id);
      }
    }
    
    db.execSync('COMMIT');
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to process overnight farming', e);
  }
}

export async function harvestPlot(row: number, col: number): Promise<'ok' | 'no_plot' | 'not_ready' | 'db_error'> {
  return dbQueue.enqueue(() => {
    try {
      db.execSync('BEGIN TRANSACTION');
      
      const plot = db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col);
      if (!plot || !plot.planted_seed_id) {
        db.execSync('ROLLBACK');
        return 'no_plot';
      }

      const cropDef = getCropForSeed(plot.planted_seed_id);
      if (!cropDef || plot.growth_stage < 2) {
        db.execSync('ROLLBACK');
        return 'not_ready';
      }

      // Determine yield
      const yieldAmount = Math.random() < 0.2 ? 2 : 1; // 20% chance for double crop
      const harvestItemId = cropDef.harvest.drops[0]?.itemId;
      
      if (harvestItemId) {
        db.runSync(
          `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
           ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
          harvestItemId, yieldAmount
        );
      }

      if (cropDef.harvest.coins > 0) {
        db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', cropDef.harvest.coins);
      }

      // Reset plot
      db.runSync('UPDATE farming_plots SET planted_seed_id = NULL, growth_stage = 0, is_watered = 0, planted_at = NULL WHERE id = ?', plot.id);
      
      db.execSync('COMMIT');
      
      addSkillPoints('farming', 15);
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}




export function processOvernightGrowth(): void {
  // Every night, if a plot is watered and has a seed, increase its growth stage.
  // Then reset all water status to 0.
  try {
    db.execSync('BEGIN TRANSACTION');
    
    db.runSync(`
      UPDATE farming_plots 
      SET growth_stage = growth_stage + 1
      WHERE is_watered = 1 AND planted_seed_id IS NOT NULL
    `);

    db.runSync('UPDATE farming_plots SET is_watered = 0');
    
    db.execSync('COMMIT');
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to process overnight crop growth', e);
  }
}
