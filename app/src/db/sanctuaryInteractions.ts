import { db } from './schema';
import { sqlNow } from '../utils/date';

export type SanctuaryObjectInteractionKind = 'inspect' | 'toggle_lever' | 'disable_trap' | 'rattle_gate';

export type SanctuaryObjectInteractionResult =
  | { ok: true; isFirst: boolean; count: number }
  | { ok: false; reason: 'db_error' };

export function markSanctuaryObjectInteraction(
  objectId: number,
  itemId: string,
  interactionKind: SanctuaryObjectInteractionKind,
): SanctuaryObjectInteractionResult {
  const now = sqlNow();
  try {
    const previous = db.getFirstSync<{ count: number }>(
      `SELECT count
       FROM sanctuary_object_interactions
       WHERE object_id = ? AND interaction_kind = ?
       LIMIT 1`,
      objectId,
      interactionKind,
    );

    db.runSync(
      `INSERT INTO sanctuary_object_interactions (object_id, interaction_kind, item_id, count, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(object_id, interaction_kind) DO UPDATE SET
         item_id = excluded.item_id,
         count = sanctuary_object_interactions.count + 1,
         updated_at = excluded.updated_at`,
      objectId,
      interactionKind,
      itemId,
      now,
      now,
    );

    return {
      ok: true,
      isFirst: !previous,
      count: (previous?.count ?? 0) + 1,
    };
  } catch (e) {
    console.warn('Failed to record sanctuary object interaction', e);
    return { ok: false, reason: 'db_error' };
  }
}

export function deleteSanctuaryObjectInteractions(objectId: number): boolean {
  try {
    db.runSync('DELETE FROM sanctuary_object_interactions WHERE object_id = ?', objectId);
    return true;
  } catch (e) {
    console.warn('Failed to delete sanctuary object interactions', e);
    return false;
  }
}
