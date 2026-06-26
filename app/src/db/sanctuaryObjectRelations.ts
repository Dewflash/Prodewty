import { db } from './schema';
import { sqlNow } from '../utils/date';

export type SanctuaryObjectRelationKind = 'lever_opens_gate' | 'lever_disarms_trap';

export type SanctuaryObjectRelation = {
  source_object_id: number;
  target_object_id: number;
  relation_kind: SanctuaryObjectRelationKind;
  source_item_id: string;
  target_item_id: string;
  created_at: string;
  updated_at: string;
};

export type SanctuaryObjectRelationWriteResult =
  | { ok: true }
  | { ok: false; reason: 'self_relation' | 'db_error' };

export function upsertSanctuaryObjectRelation(
  sourceObjectId: number,
  targetObjectId: number,
  relationKind: SanctuaryObjectRelationKind,
  sourceItemId: string,
  targetItemId: string,
): SanctuaryObjectRelationWriteResult {
  if (sourceObjectId === targetObjectId) {
    return { ok: false, reason: 'self_relation' };
  }

  const now = sqlNow();
  try {
    db.runSync(
      `INSERT INTO sanctuary_object_relations
         (source_object_id, target_object_id, relation_kind, source_item_id, target_item_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_object_id, target_object_id, relation_kind) DO UPDATE SET
         source_item_id = excluded.source_item_id,
         target_item_id = excluded.target_item_id,
         updated_at = excluded.updated_at`,
      sourceObjectId,
      targetObjectId,
      relationKind,
      sourceItemId,
      targetItemId,
      now,
      now,
    );
    return { ok: true };
  } catch (e) {
    console.warn('Failed to upsert sanctuary object relation', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function getSanctuaryObjectRelations(
  sourceObjectId: number,
  relationKind?: SanctuaryObjectRelationKind,
): SanctuaryObjectRelation[] {
  try {
    if (relationKind) {
      return db.getAllSync<SanctuaryObjectRelation>(
        `SELECT *
         FROM sanctuary_object_relations
         WHERE source_object_id = ? AND relation_kind = ?
         ORDER BY target_object_id ASC`,
        sourceObjectId,
        relationKind,
      );
    }

    return db.getAllSync<SanctuaryObjectRelation>(
      `SELECT *
       FROM sanctuary_object_relations
       WHERE source_object_id = ?
       ORDER BY relation_kind ASC, target_object_id ASC`,
      sourceObjectId,
    );
  } catch (e) {
    console.warn('Failed to load sanctuary object relations', e);
    return [];
  }
}

export function deleteSanctuaryObjectRelationsForObject(objectId: number): boolean {
  try {
    db.runSync(
      `DELETE FROM sanctuary_object_relations
       WHERE source_object_id = ? OR target_object_id = ?`,
      objectId,
      objectId,
    );
    return true;
  } catch (e) {
    console.warn('Failed to delete sanctuary object relations', e);
    return false;
  }
}
