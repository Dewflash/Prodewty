import { db } from './schema';
import { sqlNow } from '../utils/date';
import { grantSkillPoints } from './skills';

// Research mastery accrual (RPG_PROGRESSION_LATTICE.md D3): the first time an
// item is ever discovered grants Research points. Wired here (the single choke
// point every discovery flows through) rather than at each call site. System
// bootstrap/flag rows (item ids under the "system." namespace) are internal
// bookkeeping, never real discoveries, so they don't grant.
const RESEARCH_POINTS_PER_DISCOVERY = 3;

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
    // Detect a genuine first-discovery (the row didn't exist before this call)
    // so Research mastery accrues exactly once per item. Checked before the
    // upsert; the two run in the same synchronous tick.
    const isFirst = !db.getFirstSync<{ item_id: string }>(
      'SELECT item_id FROM rpg_discoveries WHERE item_id = ? LIMIT 1', itemId,
    );

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

    if (isFirst && !itemId.startsWith('system.')) {
      grantSkillPoints('research', RESEARCH_POINTS_PER_DISCOVERY);
    }
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
