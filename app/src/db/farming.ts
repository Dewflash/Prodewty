import { db } from './schema';
import { getRPGState } from './rpg';
import { sqlNow } from '../utils/date';
import { getCropForSeed } from '../engine/RpgObjectCatalog';
import { addSkillPoints } from './skills';
import { activeGardenCellSet, type ZoneRecordLike, type ZoneType, type ZoneState } from '../engine/ZoneLogic';

export type FarmingPlot = {
  id: number;
  row: number;
  col: number;
  is_watered: boolean;
  planted_seed_id: string | null;
  growth_stage: number;
  planted_at: string | null;
  is_fertilized: boolean;
  auto_water_charges: number;
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

export async function applyFertilizer(row: number, col: number): Promise<'ok' | 'no_plot' | 'already_fertilized' | 'no_item' | 'db_error'> {
  return dbQueue.enqueue(() => {
    try {
      db.execSync('BEGIN TRANSACTION');

      const plot = db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col);
      if (!plot) {
        db.execSync('ROLLBACK');
        return 'no_plot';
      }
      if (plot.is_fertilized) {
        db.execSync('ROLLBACK');
        return 'already_fertilized';
      }

      const inventoryCheck = db.getFirstSync<{ quantity: number }>(
        "SELECT quantity FROM user_inventory WHERE item_id = 'rpg_fertiliser' AND quantity > 0 LIMIT 1",
      );
      if (!inventoryCheck) {
        db.execSync('ROLLBACK');
        return 'no_item';
      }

      db.runSync("UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = 'rpg_fertiliser'");
      db.runSync('UPDATE farming_plots SET is_fertilized = 1 WHERE id = ?', plot.id);

      db.execSync('COMMIT');
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}

export async function useSprinkler(row: number, col: number): Promise<'ok' | 'no_plot' | 'no_item' | 'db_error'> {
  return dbQueue.enqueue(() => {
    try {
      db.execSync('BEGIN TRANSACTION');

      const plot = db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col);
      if (!plot) {
        db.execSync('ROLLBACK');
        return 'no_plot';
      }

      const inventoryCheck = db.getFirstSync<{ quantity: number }>(
        "SELECT quantity FROM user_inventory WHERE item_id = 'rpg_sprinkler' AND quantity > 0 LIMIT 1",
      );
      if (!inventoryCheck) {
        db.execSync('ROLLBACK');
        return 'no_item';
      }

      db.runSync("UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = 'rpg_sprinkler'");
      db.runSync('UPDATE farming_plots SET auto_water_charges = auto_water_charges + 3 WHERE id = ?', plot.id);

      db.execSync('COMMIT');
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}

// Cells that belong to an ACTIVE Garden zone (Phase 2). Food crops only
// grow inside an active Garden; if the Garden is breached (a perimeter
// piece removed) its cells drop out of this set and any crops inside
// freeze — they don't die or advance — until the Garden is restored.
// Computed at night from sanctuary_zones rather than stored per-plot, so
// there's no schema change and no zone_id to keep in sync on every till.
// The actual set-building is the unit-tested activeGardenCellSet (see
// ZoneLogic.test.ts) — this just loads the rows from the DB.
function getActiveGardenCells(): Set<string> {
  try {
    const rows = db.getAllSync<{ id: number; type: string; state: string; interior_cells: string; perimeter_cells: string }>(
      'SELECT id, type, state, interior_cells, perimeter_cells FROM sanctuary_zones',
    );
    const zones: ZoneRecordLike[] = rows.map(r => ({
      id: r.id,
      type: r.type as ZoneType,
      state: r.state as ZoneState,
      interiorCells: JSON.parse(r.interior_cells),
      perimeterCells: JSON.parse(r.perimeter_cells),
    }));
    return activeGardenCellSet(zones);
  } catch (e) {
    console.warn('Failed to read active garden cells', e);
    return new Set<string>();
  }
}

export function processOvernightFarming(newSeason?: string): void {
  try {
    db.execSync('BEGIN TRANSACTION');

    const activeGardenCells = getActiveGardenCells();

    // Watered plots grow their crop
    const plots = db.getAllSync<FarmingPlot & { crop_item_id: string | null; current_stage: number }>('SELECT *, planted_seed_id as crop_item_id, growth_stage as current_stage FROM farming_plots');

    for (const p of plots) {
      if (!p.crop_item_id) {
        db.runSync('UPDATE farming_plots SET is_watered = 0 WHERE id = ?', p.id);
        continue;
      }

      // Freeze growth if this plot is not inside an active Garden zone
      // (e.g. its Garden was breached). Keep the water flag intact so it
      // resumes growing the moment the Garden is restored — no progress
      // lost, none gained.
      if (!activeGardenCells.has(`${p.row}:${p.col}`)) {
        continue;
      }

      const def = getCropForSeed(p.crop_item_id);
      
      // If season changed and crop is out of season, it dies (we'll just remove it for now)
      if (newSeason && def && !def.preferredSeasons.includes(newSeason as any)) {
        db.runSync('UPDATE farming_plots SET planted_seed_id = NULL, growth_stage = 0, is_watered = 0 WHERE id = ?', p.id);
        continue;
      }

      // A Sprinkler's auto_water_charges count as watered for that night,
      // without needing manual waterPlot — one charge burns per night.
      const wateredByCharge = !p.is_watered && p.auto_water_charges > 0;
      const chargeSpend = wateredByCharge ? 'auto_water_charges = auto_water_charges - 1, ' : '';

      if ((p.is_watered || wateredByCharge) && def) {
        // Growth happens
        const maxStage = 2; // RpgGrowthStage max is 2
        if (p.current_stage < maxStage) {
          db.runSync(
            `UPDATE farming_plots SET ${chargeSpend}growth_stage = growth_stage + 1, is_watered = 0 WHERE id = ?`,
            p.id
          );
        } else {
          // Already fully grown, just un-water
          db.runSync(`UPDATE farming_plots SET ${chargeSpend}is_watered = 0 WHERE id = ?`, p.id);
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

      // Determine yield — Fertiliser guarantees the double-crop outcome
      // instead of leaving it to the usual 20% chance.
      const yieldAmount = plot.is_fertilized || Math.random() < 0.2 ? 2 : 1;
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
      db.runSync('UPDATE farming_plots SET planted_seed_id = NULL, growth_stage = 0, is_watered = 0, is_fertilized = 0, planted_at = NULL WHERE id = ?', plot.id);
      
      db.execSync('COMMIT');
      
      addSkillPoints('farming', 15);
      return 'ok';
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      return 'db_error';
    }
  });
}




// NOTE: a second overnight-growth function (processOvernightGrowth) was
// removed here 2026-06-30. It was dead code (never called — sleepOvernight
// uses processOvernightFarming) and, worse, it advanced growth with no
// maxStage cap, no season check, and no Garden zone gate — so wiring it
// would have silently defeated the Phase 2 Garden freeze. processOvernight-
// Farming above is the single source of truth for nightly crop growth.
