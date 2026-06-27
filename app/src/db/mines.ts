import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getCurrentZone } from './zones';

const MINE_ROWS = 15;
const MINE_COLS = 15;

export type MineFloor = {
  id: number;
  level: number;
  ladder_found: boolean;
  generated_at: string;
};

export type MineEntity = {
  id: number;
  floor_level: number;
  type: string;
  row: number;
  col: number;
  health: number;
  max_health: number;
  state: 'idle' | 'aggro';
};

export function getOrGenerateMineFloor(level: number): MineFloor | null {
  if (level < 1 || level > 120) return null;
  if (getCurrentZone() !== 'mountain') return null;

  try {
    let floor = db.getFirstSync<MineFloor>('SELECT * FROM mine_floors WHERE level = ?', level);
    
    if (!floor) {
      db.execSync('BEGIN TRANSACTION');
      
      db.runSync(
        'INSERT INTO mine_floors (level, ladder_found, generated_at) VALUES (?, 0, ?)',
        level, sqlNow()
      );
      
      floor = db.getFirstSync<MineFloor>('SELECT * FROM mine_floors WHERE level = ?', level);

      // Generate entities
      const numRocks = 15 + Math.floor(Math.random() * 10);
      const numEnemies = Math.floor(level / 10) + Math.floor(Math.random() * 3);

      for (let i = 0; i < numRocks; i++) {
        const type = Math.random() < 0.1 ? 'Copper_Node' : 'Boulder';
        spawnEntity(level, type, 3);
      }

      for (let i = 0; i < numEnemies; i++) {
        spawnEntity(level, 'Slime', 10);
      }
      
      db.execSync('COMMIT');
    }
    
    return floor;
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to generate mine floor', e);
    return null;
  }
}

function spawnEntity(level: number, type: string, maxHealth: number) {
  let row = 0, col = 0;
  // very basic collision avoidance could go here, but for now just random
  row = Math.floor(Math.random() * MINE_ROWS);
  col = Math.floor(Math.random() * MINE_COLS);

  db.runSync(
    `INSERT INTO mine_entities (floor_level, type, row, col, health, max_health)
     VALUES (?, ?, ?, ?, ?, ?)`,
    level, type, row, col, maxHealth, maxHealth
  );
}

export function resetMinesOvernight(): void {
  try {
    db.execSync('BEGIN TRANSACTION');
    db.runSync('DELETE FROM mine_floors');
    db.runSync('DELETE FROM mine_entities');
    db.execSync('COMMIT');
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
  }
}
