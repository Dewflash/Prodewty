import { db } from './schema';
import { getRPGState } from './rpg';
import { canPlaceObject } from './grid';
import { addSkillPoints } from './skills';

export type ResourceNode = {
  id: number;
  type: string;
  row: number;
  col: number;
  health: number;
  max_health: number;
};

export type ResourceDef = {
  type: string;
  maxHealth: number;
  dropItemId: string;
  dropQuantity: number;
  skillType: 'foraging' | 'mining';
  pointsReward: number;
  energyCost: number;
};

export const RESOURCE_CATALOG: Record<string, ResourceDef> = {
  'Oak_Tree': { type: 'Oak_Tree', maxHealth: 3, dropItemId: 'rpg_wood', dropQuantity: 5, skillType: 'foraging', pointsReward: 15, energyCost: 2 },
  'Pine_Tree': { type: 'Pine_Tree', maxHealth: 3, dropItemId: 'rpg_wood', dropQuantity: 5, skillType: 'foraging', pointsReward: 15, energyCost: 2 },
  'Boulder': { type: 'Boulder', maxHealth: 5, dropItemId: 'rpg_stone', dropQuantity: 5, skillType: 'mining', pointsReward: 20, energyCost: 3 },
  'Weed': { type: 'Weed', maxHealth: 1, dropItemId: 'rpg_fiber', dropQuantity: 1, skillType: 'foraging', pointsReward: 2, energyCost: 1 },
};

export function spawnResourceNode(type: string, row: number, col: number): boolean {
  const def = RESOURCE_CATALOG[type];
  if (!def) return false;

  // Check if grid is free. Here we use canPlaceObject, assuming resource nodes use the same footprint logic.
  // Actually, we should check if ANY object is there.
  const objectExists = db.getFirstSync<{ id: number }>(
    'SELECT id FROM sanctuary_objects WHERE row = ? AND col = ?', row, col
  );
  if (objectExists) return false;
  
  const nodeExists = db.getFirstSync<{ id: number }>(
    'SELECT id FROM resource_nodes WHERE row = ? AND col = ?', row, col
  );
  if (nodeExists) return false;

  try {
    db.runSync(
      'INSERT INTO resource_nodes (type, row, col, health, max_health) VALUES (?, ?, ?, ?, ?)',
      type, row, col, def.maxHealth, def.maxHealth
    );
    return true;
  } catch (e) {
    console.warn('Failed to spawn resource node', e);
    return false;
  }
}

export function hitResourceNode(nodeId: number): 'ok' | 'destroyed' | 'no_energy' | 'no_node' | 'wrong_zone' | 'db_error' {
  try {
    const { getCurrentZone } = require('./zones');
    const currentZone = getCurrentZone();
    if (currentZone !== 'farm' && currentZone !== 'forest') {
      return 'wrong_zone';
    }

    db.execSync('BEGIN TRANSACTION');

    const node = db.getFirstSync<ResourceNode>('SELECT * FROM resource_nodes WHERE id = ?', nodeId);
    if (!node) {
      db.execSync('ROLLBACK');
      return 'no_node';
    }

    const def = RESOURCE_CATALOG[node.type];
    if (!def) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    const rpg = getRPGState();
    if (rpg.energy < def.energyCost) {
      db.execSync('ROLLBACK');
      return 'no_energy';
    }

    db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1', def.energyCost);

    // Damage node
    const newHealth = node.health - 1;

    if (newHealth <= 0) {
      // Node destroyed, give drops and category points
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
        def.dropItemId, def.dropQuantity
      );

      db.runSync('DELETE FROM resource_nodes WHERE id = ?', nodeId);
      
      db.execSync('COMMIT');
      
      addSkillPoints(def.skillType, def.pointsReward);
      
      return 'destroyed';
    } else {
      db.runSync('UPDATE resource_nodes SET health = ? WHERE id = ?', newHealth, nodeId);
      db.execSync('COMMIT');
      return 'ok';
    }
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to hit resource node', e);
    return 'db_error';
  }
}

export function resetOvernightResources(): void {
  try {
    // Basic respawn logic could go here, or handled by SpawningEngine
  } catch (e) {
    console.warn('Failed to reset overnight resources', e);
  }
}
