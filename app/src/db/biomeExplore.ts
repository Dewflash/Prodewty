import { db } from './schema';
import { getBiomeTree } from '../engine/BiomeTreeCatalog';
import { RPG_WOOD_ITEM_ID } from '../engine/RpgItemIds';

export type ChopTreeResult = { wood: number; seedItemId: string | null };

// Biome trees are repeatable forage (same convention as Sanctuary's trees —
// confirmed earlier this session that those never deplete, just a short
// cooldown). No persisted node state needed for this first pass.
export function chopBiomeTree(zoneId: string): ChopTreeResult | null {
  const tree = getBiomeTree(zoneId);
  if (!tree) return null;

  const wood = tree.woodMin + Math.floor(Math.random() * (tree.woodMax - tree.woodMin + 1));
  db.runSync(
    `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
     ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
    RPG_WOOD_ITEM_ID, wood,
  );

  let seedItemId: string | null = null;
  if (Math.random() < tree.seedChance) {
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      tree.seedItemId,
    );
    seedItemId = tree.seedItemId;
  }

  return { wood, seedItemId };
}
