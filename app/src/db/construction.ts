import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getConstructionDef } from '../engine/ConstructionCatalog';

export type SanctuaryConstruction = {
  id: number;
  object_id: number;
  item_type: string;
  started_at: string;
  finish_at: string;
  is_complete: boolean;
};

export type StartConstructionResult = 
  | { ok: true; constructionId: number }
  | { ok: false; reason: 'db_error' | 'no_def' };

export function startConstruction(objectId: number, itemType: string): StartConstructionResult {
  const def = getConstructionDef(itemType);
  if (!def) {
    return { ok: false, reason: 'no_def' };
  }

  const now = new Date();
  const finishTime = new Date(now.getTime() + def.buildTimeMinutes * 60000);
  
  // Format dates for SQLite
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatSqlDate = (d: Date) => 
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  try {
    const result = db.runSync(
      `INSERT INTO sanctuary_constructions (object_id, item_type, started_at, finish_at, is_complete)
       VALUES (?, ?, ?, ?, 0)`,
      objectId,
      itemType,
      formatSqlDate(now),
      formatSqlDate(finishTime)
    );
    return { ok: true, constructionId: result.lastInsertRowId };
  } catch (e) {
    console.warn('Failed to start construction', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function getActiveConstructions(): SanctuaryConstruction[] {
  try {
    const rows = db.getAllSync<{
      id: number;
      object_id: number;
      item_type: string;
      started_at: string;
      finish_at: string;
      is_complete: number;
    }>('SELECT * FROM sanctuary_constructions WHERE is_complete = 0');
    
    return rows.map(r => ({
      ...r,
      is_complete: r.is_complete === 1,
    }));
  } catch (e) {
    console.warn('Failed to fetch active constructions', e);
    return [];
  }
}

export function getConstructionForObject(objectId: number): SanctuaryConstruction | null {
  try {
    const row = db.getFirstSync<{
      id: number;
      object_id: number;
      item_type: string;
      started_at: string;
      finish_at: string;
      is_complete: number;
    }>('SELECT * FROM sanctuary_constructions WHERE object_id = ? LIMIT 1', objectId);
    
    if (!row) return null;
    return {
      ...row,
      is_complete: row.is_complete === 1,
    };
  } catch {
    return null;
  }
}

export function checkAndCompleteConstructions(): number {
  const now = sqlNow(); // Local time matching SQLite
  try {
    const result = db.runSync(
      `UPDATE sanctuary_constructions 
       SET is_complete = 1 
       WHERE is_complete = 0 AND finish_at <= ?`,
      now
    );
    return result.changes;
  } catch (e) {
    console.warn('Failed to complete constructions', e);
    return 0;
  }
}

export function removeConstruction(objectId: number): boolean {
  try {
    const result = db.runSync('DELETE FROM sanctuary_constructions WHERE object_id = ?', objectId);
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to remove construction', e);
    return false;
  }
}
