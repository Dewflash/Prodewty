import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getBuildingDef } from '../engine/BuildingCatalog';

export type SanctuaryConstruction = {
  id: number;
  object_id: number;
  item_type: string;
  started_at: string;
  finish_at: string;
  is_complete: boolean;
  level: number;
  target_level: number;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatSqlDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

export type StartConstructionResult = 
  | { ok: true; constructionId: number }
  | { ok: false; reason: 'db_error' | 'no_def' };

export function startConstruction(objectId: number, itemType: string): StartConstructionResult {
  const def = getBuildingDef(itemType);
  if (!def) {
    return { ok: false, reason: 'no_def' };
  }

  const now = new Date();
  const finishTime = new Date(now.getTime() + def.buildTimeMinutes * 60000);

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

type ConstructionRow = {
  id: number;
  object_id: number;
  item_type: string;
  started_at: string;
  finish_at: string;
  is_complete: number;
  level: number;
  target_level: number;
};

function mapConstructionRow(r: ConstructionRow): SanctuaryConstruction {
  return { ...r, is_complete: r.is_complete === 1 };
}

export function getActiveConstructions(): SanctuaryConstruction[] {
  try {
    const rows = db.getAllSync<ConstructionRow>('SELECT * FROM sanctuary_constructions WHERE is_complete = 0');
    return rows.map(mapConstructionRow);
  } catch (e) {
    console.warn('Failed to fetch active constructions', e);
    return [];
  }
}

export function getConstructionForObject(objectId: number): SanctuaryConstruction | null {
  try {
    const row = db.getFirstSync<ConstructionRow>(
      'SELECT * FROM sanctuary_constructions WHERE object_id = ? LIMIT 1', objectId,
    );
    if (!row) return null;
    return mapConstructionRow(row);
  } catch {
    return null;
  }
}

export type StartUpgradeResult =
  | { ok: true; targetLevel: number }
  | { ok: false; reason: 'no_construction' | 'not_complete' | 'db_error' };

// Re-runs the two-phase timed build to bump a COMPLETED building to targetLevel.
// Reuses the existing construction row (object_id is UNIQUE): flips it back to
// in-progress with a fresh finish_at and records target_level, which
// checkAndCompleteConstructions applies on completion. Callers gate the
// prerequisite/cost and deduct materials BEFORE calling this.
export function startUpgrade(objectId: number, itemType: string, targetLevel: number): StartUpgradeResult {
  const def = getBuildingDef(itemType);
  const buildMinutes = def?.buildTimeMinutes ?? 60;
  try {
    const existing = getConstructionForObject(objectId);
    if (!existing) return { ok: false, reason: 'no_construction' };
    if (!existing.is_complete) return { ok: false, reason: 'not_complete' };

    const now = new Date();
    const finishTime = new Date(now.getTime() + buildMinutes * 60000);
    db.runSync(
      `UPDATE sanctuary_constructions
       SET is_complete = 0, started_at = ?, finish_at = ?, target_level = ?
       WHERE object_id = ?`,
      formatSqlDate(now), formatSqlDate(finishTime), targetLevel, objectId,
    );
    return { ok: true, targetLevel };
  } catch (e) {
    console.warn('Failed to start upgrade', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function checkAndCompleteConstructions(): number {
  const now = sqlNow(); // Local time matching SQLite
  try {
    // Apply any in-flight upgrade's target_level as the row completes, then
    // clear target_level. level := max(current, target_level) so an initial
    // build (target_level 0) stays at level 1.
    const result = db.runSync(
      `UPDATE sanctuary_constructions
       SET is_complete = 1,
           level = MAX(level, target_level),
           target_level = 0
       WHERE is_complete = 0 AND finish_at <= ?`,
      now,
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
