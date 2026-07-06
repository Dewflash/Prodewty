// System-B livestock store (RPG_PROGRESSION_LATTICE.md Wave 5 — livestock v1).
// The single mastery with no accrual path gets its cozy Stardew loop here: buy an
// animal into a completed Coop/Barn, feed + pet it daily, collect the produce it
// makes overnight. Transactional where economy-changing (buy deducts coins;
// collect adds inventory + grants Livestock mastery). Day-keyed via
// dayBoundary.logicalToday() so feed/pet are once/day and the nightly readiness
// pass is idempotent per logical day.
//
// The legacy livestock.ts/animals.ts (rpg_animals) tables are treated as MISSING
// per the gap audit and are never touched here — this file owns rpg_livestock
// exclusively. Content (animal defs, prices, produce, happiness/capacity math)
// comes from the pure, tested engine/LivestockLogic.ts.

import { db } from './schema';
import { sqlNow } from '../utils/date';
import { logicalToday, logicalYesterday } from './dayBoundary';
import { grantSkillPoints } from './skills';
import {
  getLivestockDef,
  getLivestockDefByObjectType,
  applyFeedHappiness,
  applyPetHappiness,
  applyMissedFeedHappiness,
  isProduceReady,
  produceQuantity,
  buildingCapacity,
  hasFreeCapacity,
  buildingHousesAnimal,
  type LivestockBuilding,
} from '../engine/LivestockLogic';

// The feed item is HAY (rpg_hay): the canonical animal_feed resource, obtainable
// today because RpgObjectCatalog's RPG_MATERIAL_SHOP_CATALOG makes every `kind:
// 'resource'` item (hay included) directly purchasable in the Shop — buying one
// adds it straight to inventory. There is no wheat/other crop item in the
// catalog, so hay is the correct and only sensible feed. Consumes 1 per feed.
export const LIVESTOCK_FEED_ITEM_ID = 'rpg_hay';

// Livestock mastery points granted per produce collection (work order). The SPR
// stat multiplier is applied inside grantSkillPoints (masteryEarnMultiplier).
export const LIVESTOCK_COLLECT_POINTS = 4;

export type LivestockRow = {
  id: number;
  animal_type: string;
  building_object_id: number | null;
  object_id: number | null;
  name: string | null;
  happiness: number;
  fed_day: string | null;
  petted_day: string | null;
  last_produce_day: string | null;
  born_at: string | null;
};

// ─── Reads ──────────────────────────────────────────────────────────────────

export function getAllLivestock(): LivestockRow[] {
  try {
    return db.getAllSync<LivestockRow>('SELECT * FROM rpg_livestock');
  } catch {
    return [];
  }
}

export function getLivestockById(id: number): LivestockRow | null {
  try {
    return db.getFirstSync<LivestockRow>('SELECT * FROM rpg_livestock WHERE id = ?', id) ?? null;
  } catch {
    return null;
  }
}

// Resolve the livestock row for a placed animal world object (tapped in-world).
export function getLivestockByObjectId(objectId: number): LivestockRow | null {
  try {
    return db.getFirstSync<LivestockRow>('SELECT * FROM rpg_livestock WHERE object_id = ?', objectId) ?? null;
  } catch {
    return null;
  }
}

export function countLivestockForBuilding(buildingObjectId: number): number {
  try {
    return db.getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM rpg_livestock WHERE building_object_id = ?',
      buildingObjectId,
    )?.n ?? 0;
  } catch {
    return 0;
  }
}

// ─── Buy (transactional; economy-changing) ──────────────────────────────────
export type BuyAnimalResult =
  | { ok: true; livestockId: number }
  | { ok: false; reason: 'unknown_animal' | 'wrong_building' | 'no_capacity' | 'insufficient_coins' | 'db_error' };

// Buys `animalType` into the completed Coop/Barn identified by buildingObjectId
// (which the caller resolves + confirms complete). Validates the building houses
// this animal, has free capacity at its level, and the player can afford it;
// deducts coins and inserts the rpg_livestock row atomically. The caller places
// the animal's world object (near the building) and links it — this is the state
// half only, so both halves share one flow but the coin spend stays transactional.
export function buyAnimal(
  animalType: string,
  building: LivestockBuilding,
  buildingObjectId: number,
  buildingLevel: number,
): BuyAnimalResult {
  const def = getLivestockDef(animalType);
  if (!def) return { ok: false, reason: 'unknown_animal' };
  if (!buildingHousesAnimal(building, def.animalType)) return { ok: false, reason: 'wrong_building' };

  try {
    db.execSync('BEGIN TRANSACTION');

    const currentCount = db.getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM rpg_livestock WHERE building_object_id = ?',
      buildingObjectId,
    )?.n ?? 0;
    if (!hasFreeCapacity(currentCount, buildingLevel)) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'no_capacity' };
    }

    const coins = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1')?.coins ?? 0;
    if (coins < def.buyPrice) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'insufficient_coins' };
    }

    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', def.buyPrice);
    const result = db.runSync(
      `INSERT INTO rpg_livestock (animal_type, building_object_id, name, born_at)
       VALUES (?, ?, ?, ?)`,
      def.animalType, buildingObjectId, def.name, sqlNow(),
    );

    db.execSync('COMMIT');
    return { ok: true, livestockId: result.lastInsertRowId };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to buy animal', e);
    return { ok: false, reason: 'db_error' };
  }
}

// Link the animal's placed world object to its rpg_livestock row. Called by the
// caller (rpg.tsx) right after it inserts the animal's sanctuary_objects row, so
// tapping the in-world animal resolves its livestock state via
// getLivestockByObjectId. Kept separate from buyAnimal because the world-object
// insert is UI-side (needs a free tile near the building) — buyAnimal owns the
// coin spend + row, this stitches the object id in.
export function linkLivestockObject(livestockId: number, objectId: number): void {
  try {
    db.runSync('UPDATE rpg_livestock SET object_id = ? WHERE id = ?', objectId, livestockId);
  } catch (e) {
    console.warn('Failed to link livestock object', e);
  }
}

// Remove a livestock row when its world object is removed (e.g. player stashes
// the animal). Keeps capacity accounting honest.
export function removeLivestockByObjectId(objectId: number): void {
  try {
    db.runSync('DELETE FROM rpg_livestock WHERE object_id = ?', objectId);
  } catch (e) {
    console.warn('Failed to remove livestock', e);
  }
}

// ─── Feed (once/day; consumes 1 hay) ────────────────────────────────────────
export type FeedResult =
  | { ok: true; happiness: number }
  | { ok: false; reason: 'no_animal' | 'already_fed' | 'no_feed' | 'db_error' };

export function feedAnimal(livestockId: number): FeedResult {
  const today = logicalToday();
  try {
    db.execSync('BEGIN TRANSACTION');
    const row = db.getFirstSync<LivestockRow>('SELECT * FROM rpg_livestock WHERE id = ?', livestockId);
    if (!row) { db.execSync('ROLLBACK'); return { ok: false, reason: 'no_animal' }; }
    if (row.fed_day === today) { db.execSync('ROLLBACK'); return { ok: false, reason: 'already_fed' }; }

    const consumed = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
      LIVESTOCK_FEED_ITEM_ID,
    );
    if (consumed.changes <= 0) { db.execSync('ROLLBACK'); return { ok: false, reason: 'no_feed' }; }

    const happiness = applyFeedHappiness(row.happiness);
    db.runSync('UPDATE rpg_livestock SET happiness = ?, fed_day = ? WHERE id = ?', happiness, today, livestockId);
    db.execSync('COMMIT');
    return { ok: true, happiness };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to feed animal', e);
    return { ok: false, reason: 'db_error' };
  }
}

// ─── Pet (once/day; +happiness only, no cost) ───────────────────────────────
export type PetResult =
  | { ok: true; happiness: number }
  | { ok: false; reason: 'no_animal' | 'already_petted' | 'db_error' };

export function petAnimal(livestockId: number): PetResult {
  const today = logicalToday();
  try {
    const row = db.getFirstSync<LivestockRow>('SELECT * FROM rpg_livestock WHERE id = ?', livestockId);
    if (!row) return { ok: false, reason: 'no_animal' };
    if (row.petted_day === today) return { ok: false, reason: 'already_petted' };

    const happiness = applyPetHappiness(row.happiness);
    db.runSync('UPDATE rpg_livestock SET happiness = ?, petted_day = ? WHERE id = ?', happiness, today, livestockId);
    return { ok: true, happiness };
  } catch (e) {
    console.warn('Failed to pet animal', e);
    return { ok: false, reason: 'db_error' };
  }
}

// ─── Collect produce (transactional; grants Livestock mastery) ──────────────
export type CollectResult =
  | { ok: true; produceItemId: string; produceName: string; quantity: number }
  | { ok: false; reason: 'no_animal' | 'not_ready' | 'already_collected' | 'db_error' };

// Produce is available on a logical day when the overnight pass set
// last_produce_day to today (fed yesterday AND happy enough). Collecting adds the
// produce to inventory, clears last_produce_day (so it's once/day), and grants
// Livestock mastery points. Quantity is doubled for a very happy animal.
export function collectProduce(livestockId: number): CollectResult {
  const today = logicalToday();
  try {
    db.execSync('BEGIN TRANSACTION');
    const row = db.getFirstSync<LivestockRow>('SELECT * FROM rpg_livestock WHERE id = ?', livestockId);
    if (!row) { db.execSync('ROLLBACK'); return { ok: false, reason: 'no_animal' }; }
    const def = getLivestockDef(row.animal_type);
    if (!def) { db.execSync('ROLLBACK'); return { ok: false, reason: 'no_animal' }; }
    if (row.last_produce_day !== today) { db.execSync('ROLLBACK'); return { ok: false, reason: 'not_ready' }; }

    const quantity = produceQuantity(row.happiness);
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      def.produceItemId, quantity,
    );
    // Clearing last_produce_day marks it collected for the day (readiness only
    // re-arms on the next overnight pass).
    db.runSync('UPDATE rpg_livestock SET last_produce_day = NULL WHERE id = ?', livestockId);
    db.execSync('COMMIT');

    // Mastery accrual (lattice D3) — SPR multiplier applied inside grantSkillPoints.
    grantSkillPoints('livestock', LIVESTOCK_COLLECT_POINTS);
    return { ok: true, produceItemId: def.produceItemId, produceName: def.produceName, quantity };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to collect produce', e);
    return { ok: false, reason: 'db_error' };
  }
}

// ─── Overnight processing (idempotent per logical day) ──────────────────────
// Called from db/time.ts sleep path alongside processOvernightFarming. For each
// animal, on a NEW logical day:
//  • If it was fed the previous day AND is happy enough → arm produce (set
//    last_produce_day = today) if not already collected.
//  • If it was NOT fed the previous day → decay happiness.
// Idempotency: a per-day marker (last_produce_day OR a happiness-decay guard) is
// insufficient alone because decay must run once even when no produce arms. We
// guard the WHOLE pass with a day bucket stored on rpg_state so re-invocation on
// the same logical day is a no-op — mirroring how villager first-chats are
// day-keyed. The guard column is created lazily here (no migration needed) to
// keep this self-contained.
export function processOvernightLivestock(): void {
  const today = logicalToday();
  const yesterday = logicalYesterday();
  try {
    // Lazy guard column (idempotency): last day this pass ran. If it already ran
    // for `today`, do nothing.
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN livestock_overnight_day TEXT`); } catch {}
    const guard = db.getFirstSync<{ livestock_overnight_day: string | null }>(
      'SELECT livestock_overnight_day FROM rpg_state WHERE id = 1',
    );
    if (guard?.livestock_overnight_day === today) return; // already processed today

    const animals = db.getAllSync<LivestockRow>('SELECT * FROM rpg_livestock');
    db.execSync('BEGIN TRANSACTION');
    for (const animal of animals) {
      const fedYesterday = animal.fed_day === yesterday;
      if (fedYesterday) {
        // Arm produce for today if the animal is happy enough and hasn't already
        // been armed/collected for today.
        if (isProduceReady(true, animal.happiness) && animal.last_produce_day !== today) {
          db.runSync('UPDATE rpg_livestock SET last_produce_day = ? WHERE id = ?', today, animal.id);
        }
      } else {
        // Missed a feed day → happiness decays.
        const happiness = applyMissedFeedHappiness(animal.happiness);
        db.runSync('UPDATE rpg_livestock SET happiness = ? WHERE id = ?', happiness, animal.id);
      }
    }
    db.runSync('UPDATE rpg_state SET livestock_overnight_day = ? WHERE id = 1', today);
    db.execSync('COMMIT');
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to process overnight livestock', e);
  }
}

// Convenience re-exports for rpg.tsx (object → animal resolution uses the object
// TYPE, since the placed animal's sanctuary_objects.type is its objectType).
export { getLivestockDefByObjectType, getLivestockDef, buildingCapacity };
