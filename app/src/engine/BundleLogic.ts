// Pure bundle donation/completion math (Wave 4). No React / SQLite / asset
// imports so BundleCatalog.test.ts can exercise it directly. rpg.tsx supplies
// the persisted donation totals + the player's backpack quantity; this decides
// how much a single Donate press may transfer and whether a bundle is complete.

import type { BundleDefinition } from './BundleCatalog';

// How much of one item a Donate press should move: as many as the player holds,
// but never more than the item still needs. Never negative.
export function donatableAmount(
  required: number,
  alreadyDonated: number,
  ownedInBackpack: number,
): number {
  const remaining = Math.max(0, required - Math.max(0, alreadyDonated));
  return Math.max(0, Math.min(remaining, Math.max(0, ownedInBackpack)));
}

// Whether an item's donated total meets its requirement.
export function isItemComplete(required: number, donated: number): boolean {
  return Math.max(0, donated) >= required;
}

// Whether every required item in a bundle is fully donated. `donatedByItem`
// maps item id → donated total (missing = 0).
export function isBundleComplete(
  def: BundleDefinition,
  donatedByItem: Record<string, number>,
): boolean {
  return def.requiredItems.every(req =>
    isItemComplete(req.quantity, donatedByItem[req.itemId] ?? 0),
  );
}

// Fraction 0..1 of a bundle's total required quantity that's been donated —
// drives a progress read-out. Guards against an empty (all-zero) bundle.
export function bundleProgressFraction(
  def: BundleDefinition,
  donatedByItem: Record<string, number>,
): number {
  const totalRequired = def.requiredItems.reduce((sum, r) => sum + r.quantity, 0);
  if (totalRequired <= 0) return 1;
  const totalDonated = def.requiredItems.reduce(
    (sum, r) => sum + Math.min(r.quantity, Math.max(0, donatedByItem[r.itemId] ?? 0)),
    0,
  );
  return Math.min(1, totalDonated / totalRequired);
}
