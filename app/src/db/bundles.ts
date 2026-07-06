import { db } from './schema';
import {
  getBundleDef,
  getAllBundles,
  FREE_SEED_POOL,
  BUNDLE_TRADING_POINTS,
  type BundleDefinition,
} from '../engine/BundleCatalog';
import { donatableAmount, isBundleComplete } from '../engine/BundleLogic';

// ─── Town Hall bundle persistence (Wave 4) ──────────────────────────────────
// Progress is keyed by bundle_id (NOT the Town Hall object id) so it survives
// the building being relocated/rebuilt. The perk is applied to rpg_state on
// completion; grantSkillPoints('trading', 15) is done by the caller (rpg.tsx)
// so the HUD-juice mastery signal fires there.

export type BundleItemProgress = {
  itemId: string;
  required: number;
  donated: number;
};

export type BundleView = {
  def: BundleDefinition;
  items: BundleItemProgress[];
  completed: boolean;
};

function getDonatedByItem(bundleId: string): Record<string, number> {
  try {
    const rows = db.getAllSync<{ item_id: string; quantity_donated: number }>(
      'SELECT item_id, quantity_donated FROM rpg_bundle_progress WHERE bundle_id = ?',
      bundleId,
    );
    const out: Record<string, number> = {};
    rows.forEach(r => { out[r.item_id] = r.quantity_donated; });
    return out;
  } catch {
    return {};
  }
}

export function isBundleCompleted(bundleId: string): boolean {
  try {
    return !!db.getFirstSync<{ bundle_id: string }>(
      'SELECT bundle_id FROM rpg_bundles_completed WHERE bundle_id = ?',
      bundleId,
    );
  } catch {
    return false;
  }
}

// Full view of every bundle: per-item donated/required + completion flag.
export function getBundleViews(): BundleView[] {
  return getAllBundles().map(def => {
    const donatedByItem = getDonatedByItem(def.id);
    return {
      def,
      completed: isBundleCompleted(def.id),
      items: def.requiredItems.map(req => ({
        itemId: req.itemId,
        required: req.quantity,
        donated: donatedByItem[req.itemId] ?? 0,
      })),
    };
  });
}

export type DonateResult =
  | { ok: true; donated: number; bundleCompleted: boolean; def: BundleDefinition }
  | { ok: false; reason: 'no_bundle' | 'nothing_to_donate' | 'db_error' };

// Donate as much of `itemId` from the backpack as the bundle still needs.
// Transactional: consumes from user_inventory and bumps rpg_bundle_progress
// together. When the final item completes the bundle, records the completion
// ledger row and applies the perk to rpg_state (coins + one of the three perks).
// Trading mastery is granted by the caller so the mastery-gain signal fires in
// the React tree (HUD fly-ups / level-up banner).
export function donateToBundle(bundleId: string, itemId: string): DonateResult {
  const def = getBundleDef(bundleId);
  if (!def) return { ok: false, reason: 'no_bundle' };
  const req = def.requiredItems.find(r => r.itemId === itemId);
  if (!req) return { ok: false, reason: 'no_bundle' };

  try {
    db.execSync('BEGIN TRANSACTION');

    const alreadyRow = db.getFirstSync<{ quantity_donated: number }>(
      'SELECT quantity_donated FROM rpg_bundle_progress WHERE bundle_id = ? AND item_id = ?',
      bundleId, itemId,
    );
    const alreadyDonated = alreadyRow?.quantity_donated ?? 0;
    const owned = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ?', itemId,
    )?.quantity ?? 0;

    const amount = donatableAmount(req.quantity, alreadyDonated, owned);
    if (amount <= 0) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'nothing_to_donate' };
    }

    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?',
      amount, itemId,
    );
    db.runSync(
      `INSERT INTO rpg_bundle_progress (bundle_id, item_id, quantity_donated)
       VALUES (?, ?, ?)
       ON CONFLICT(bundle_id, item_id) DO UPDATE SET quantity_donated = quantity_donated + excluded.quantity_donated`,
      bundleId, itemId, amount,
    );

    // Re-read totals to decide completion (inside the same transaction).
    const donatedByItem = getDonatedByItem(bundleId);
    const nowComplete = isBundleComplete(def, donatedByItem) && !isBundleCompleted(bundleId);

    if (nowComplete) {
      db.runSync(
        `INSERT OR IGNORE INTO rpg_bundles_completed (bundle_id) VALUES (?)`,
        bundleId,
      );
      applyBundlePerk(def);
    }

    db.execSync('COMMIT');
    return { ok: true, donated: amount, bundleCompleted: nowComplete, def };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to donate to bundle', e);
    return { ok: false, reason: 'db_error' };
  }
}

// Applies a bundle's reward to rpg_state. Called INSIDE donateToBundle's
// transaction. Coins always granted; the perk column depends on reward.perk.
function applyBundlePerk(def: BundleDefinition): void {
  const reward = def.reward;
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', reward.coins);
  switch (reward.perk) {
    case 'hearth_sell_bonus':
      db.runSync('UPDATE rpg_state SET hearth_sell_bonus = 1 WHERE id = 1');
      break;
    case 'bundle_energy_bonus':
      db.runSync(
        'UPDATE rpg_state SET bundle_energy_bonus = bundle_energy_bonus + ? WHERE id = 1',
        reward.energyBonus ?? 0,
      );
      break;
    case 'hearth_free_seed_day':
      // Enable the daily-seed perk by clearing the day bucket so the first claim
      // (day-keyed) becomes available immediately. NULL = "claimable now".
      db.runSync('UPDATE rpg_state SET hearth_free_seed_day = NULL WHERE id = 1');
      break;
  }
}

// Perk read-outs for the effect call sites (rpg.tsx).
export function hasHearthSellBonus(): boolean {
  try {
    return (db.getFirstSync<{ hearth_sell_bonus: number }>(
      'SELECT hearth_sell_bonus FROM rpg_state WHERE id = 1',
    )?.hearth_sell_bonus ?? 0) === 1;
  } catch {
    return false;
  }
}

export function getBundleEnergyBonus(): number {
  try {
    return db.getFirstSync<{ bundle_energy_bonus: number }>(
      'SELECT bundle_energy_bonus FROM rpg_state WHERE id = 1',
    )?.bundle_energy_bonus ?? 0;
  } catch {
    return 0;
  }
}

// Whether the Town Larder perk (bundle 3) has been earned at all.
export function hasFreeSeedPerk(): boolean {
  return isBundleCompleted('bundle_craft');
}

export type FreeSeedClaimResult =
  | { ok: true; seedId: string }
  | { ok: false; reason: 'not_unlocked' | 'already_claimed_today' | 'db_error' };

// Claims the daily free seed at the Town Hall (day-keyed like villager chats).
// `today` is the caller's logicalToday() string. One seed per logical day.
export function claimDailyFreeSeed(today: string): FreeSeedClaimResult {
  if (!hasFreeSeedPerk()) return { ok: false, reason: 'not_unlocked' };
  try {
    const lastDay = db.getFirstSync<{ hearth_free_seed_day: string | null }>(
      'SELECT hearth_free_seed_day FROM rpg_state WHERE id = 1',
    )?.hearth_free_seed_day ?? null;
    if (lastDay === today) return { ok: false, reason: 'already_claimed_today' };

    const seedId = FREE_SEED_POOL[Math.floor(Math.random() * FREE_SEED_POOL.length)];
    db.execSync('BEGIN TRANSACTION');
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      seedId,
    );
    db.runSync('UPDATE rpg_state SET hearth_free_seed_day = ? WHERE id = 1', today);
    db.execSync('COMMIT');
    return { ok: true, seedId };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim free seed', e);
    return { ok: false, reason: 'db_error' };
  }
}

export { BUNDLE_TRADING_POINTS };
