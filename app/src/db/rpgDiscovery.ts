import { db } from './schema';
import { sqlNow } from '../utils/date';

export type RpgDiscoverySource =
  | 'bootstrap'
  | 'buy'
  | 'forage'
  | 'harvest'
  | 'inspect'
  | 'inventory'
  | 'loot'
  | 'plant'
  | 'place';

export type RpgDiscoveryRow = {
  item_id: string;
  first_seen_at: string;
  last_seen_at: string;
  source: RpgDiscoverySource | string;
  seen_count: number;
};

export function recordRpgDiscovery(itemId: string | null | undefined, source: RpgDiscoverySource): void {
  if (!itemId) return;
  const now = sqlNow();
  try {
    db.runSync(
      `INSERT INTO rpg_discoveries (item_id, first_seen_at, last_seen_at, source, seen_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(item_id) DO UPDATE SET
         last_seen_at = excluded.last_seen_at,
         source = excluded.source,
         seen_count = COALESCE(seen_count, 0) + 1`,
      itemId,
      now,
      now,
      source,
    );
  } catch (e) {
    console.warn('Failed to record RPG discovery', e);
  }
}

export function recordRpgDiscoveries(
  items: readonly { itemId: string | null | undefined; quantity?: number }[],
  source: RpgDiscoverySource,
): void {
  items.forEach(item => {
    if ((item.quantity ?? 1) <= 0) return;
    recordRpgDiscovery(item.itemId, source);
  });
}

export function getRpgDiscoveries(): RpgDiscoveryRow[] {
  try {
    return db.getAllSync<RpgDiscoveryRow>('SELECT * FROM rpg_discoveries ORDER BY first_seen_at ASC');
  } catch {
    return [];
  }
}
