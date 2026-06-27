import { db } from './schema';
import { sqlNow } from '../utils/date';
import { generateBiome, BiomeLayout } from '../engine/BiomeGenerator';
import { getBiomeDef } from '../engine/BiomeCatalog';

export type ExplorationZone = {
  id: number;
  zone_type: string;
  seed: number;
  layout: BiomeLayout;
  discovered_at: string;
  status: string;
  floor_number: number;
  difficulty: number;
};

export type ZoneProgress = {
  id: number;
  zone_id: number;
  rooms_cleared: number;
  enemies_killed: number;
  chests_opened: number;
  total_coins: number;
  updated_at: string;
};

export function startExploration(zoneType: string, floorNumber: number = 1): ExplorationZone | null {
  const def = getBiomeDef(zoneType);
  if (!def) return null;

  const seed = Math.floor(Math.random() * 1000000);
  const layout = generateBiome(zoneType, seed, floorNumber);
  const layoutJson = JSON.stringify(layout);

  try {
    db.execSync('BEGIN TRANSACTION');
    
    // Create zone
    const zoneResult = db.runSync(
      `INSERT INTO exploration_zones (zone_type, seed, layout, floor_number, difficulty)
       VALUES (?, ?, ?, ?, ?)`,
      zoneType, seed, layoutJson, floorNumber, def.baseDifficulty
    );
    const zoneId = zoneResult.lastInsertRowId;

    // Create progress tracker
    db.runSync(
      `INSERT INTO zone_progress (zone_id) VALUES (?)`,
      zoneId
    );

    db.execSync('COMMIT');
    
    return getExplorationZone(zoneId);
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to start exploration', e);
    return null;
  }
}

export function getExplorationZone(zoneId: number): ExplorationZone | null {
  try {
    const row = db.getFirstSync<any>('SELECT * FROM exploration_zones WHERE id = ?', zoneId);
    if (!row) return null;
    
    return {
      ...row,
      layout: JSON.parse(row.layout)
    };
  } catch {
    return null;
  }
}

export function getActiveExplorationZone(): ExplorationZone | null {
  try {
    const row = db.getFirstSync<any>('SELECT * FROM exploration_zones WHERE status = ? LIMIT 1', 'active');
    if (!row) return null;
    
    return {
      ...row,
      layout: JSON.parse(row.layout)
    };
  } catch {
    return null;
  }
}

export function getZoneProgress(zoneId: number): ZoneProgress | null {
  try {
    const row = db.getFirstSync<ZoneProgress>('SELECT * FROM zone_progress WHERE zone_id = ?', zoneId);
    return row ?? null;
  } catch {
    return null;
  }
}

export function updateZoneProgress(
  zoneId: number, 
  updates: { rooms_cleared?: number, enemies_killed?: number, chests_opened?: number, coins?: number }
): boolean {
  try {
    const updatesStr: string[] = [];
    const params: any[] = [];

    if (updates.rooms_cleared) {
      updatesStr.push('rooms_cleared = rooms_cleared + ?');
      params.push(updates.rooms_cleared);
    }
    if (updates.enemies_killed) {
      updatesStr.push('enemies_killed = enemies_killed + ?');
      params.push(updates.enemies_killed);
    }
    if (updates.chests_opened) {
      updatesStr.push('chests_opened = chests_opened + ?');
      params.push(updates.chests_opened);
    }
    if (updates.coins) {
      updatesStr.push('total_coins = total_coins + ?');
      params.push(updates.coins);
    }

    if (updatesStr.length === 0) return true;

    updatesStr.push('updated_at = ?');
    params.push(sqlNow());
    params.push(zoneId);

    const result = db.runSync(
      `UPDATE zone_progress SET ${updatesStr.join(', ')} WHERE zone_id = ?`,
      ...params
    );
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to update zone progress', e);
    return false;
  }
}

export function finishExploration(zoneId: number, status: 'completed' | 'failed' | 'abandoned'): boolean {
  try {
    const result = db.runSync('UPDATE exploration_zones SET status = ? WHERE id = ?', status, zoneId);
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to finish exploration', e);
    return false;
  }
}

export function claimZoneLoot(zoneId: number, lootKey: string, itemId: string, quantity: number): boolean {
  try {
    db.execSync('BEGIN TRANSACTION');
    
    db.runSync(
      'INSERT INTO zone_loot_claims (zone_id, loot_key) VALUES (?, ?)',
      zoneId, lootKey
    );
    
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      itemId, quantity
    );

    db.execSync('COMMIT');
    return true;
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes('UNIQUE constraint')) {
      console.warn('Failed to claim zone loot', e);
    }
    return false;
  }
}
