// Town Hall bundles v1 (RPG_ARCHITECTURE.md "The Bundle System" + Wave 4 of
// RPG_PROGRESSION_LATTICE.md). Stardew community-center-style: donate a fixed
// set of items to the Village Hearth (Town Hall) to permanently unlock a perk.
//
// Pure, dependency-free content + reward definitions — no React / SQLite / asset
// imports — so BundleCatalog.test.ts can prove every required item id exists in
// the item catalog and every reward is well-formed. rpg.tsx reads these defs,
// tracks per-item donation progress in rpg_bundle_progress, and applies the
// reward (coins + one of the three perks) on completion.
//
// Item-id discipline: every required id below is obtainable in the LIVE game
// today (Wave 1-3 baseline) — forage/chop drops, farming harvest, pond fishing,
// woodworking-table craft, Furnace smelt. Validated in BundleCatalog.test.ts.

export type BundleRewardPerk =
  // Bundle 1 — permanent +10% sell prices ("Hearth Blessing").
  | 'hearth_sell_bonus'
  // Bundle 2 — permanent +20 effective energy_max.
  | 'bundle_energy_bonus'
  // Bundle 3 — a daily free random seed claimable at the Town Hall.
  | 'hearth_free_seed_day';

export type BundleRequiredItem = {
  itemId: string;
  quantity: number;
};

export type BundleReward = {
  coins: number;
  perk: BundleRewardPerk;
  // For bundle_energy_bonus: how much flat energy_max the perk grants. Ignored
  // by the other perks (they're boolean flags / day-buckets).
  energyBonus?: number;
  // Human-readable perk summary shown in the donation panel + completion toast.
  perkLabel: string;
};

export type BundleDefinition = {
  id: string;
  name: string;
  description: string;
  requiredItems: BundleRequiredItem[];
  reward: BundleReward;
};

// Trading mastery granted on completing any bundle (Wave 4 work order).
export const BUNDLE_TRADING_POINTS = 15;

// The energy_max granted by the Hearth Provisions bundle's perk.
export const BUNDLE_ENERGY_BONUS = 20;

export const BUNDLE_CATALOG: Record<string, BundleDefinition> = {
  // ── Forage Bundle ── the earliest bundle: raw gathered materials only.
  bundle_forage: {
    id: 'bundle_forage',
    name: 'Wildwood Bundle',
    description: 'Offer the hearth what the land freely gives — wood, stone, and leaves.',
    requiredItems: [
      { itemId: 'rpg_wood', quantity: 20 },
      { itemId: 'rpg_stone', quantity: 15 },
      { itemId: 'rpg_leaves', quantity: 10 },
    ],
    reward: {
      coins: 250,
      perk: 'hearth_sell_bonus',
      perkLabel: 'Hearth Blessing · +10% sell prices',
    },
  },

  // ── Harvest Bundle ── the fruits of farming + fishing.
  bundle_harvest: {
    id: 'bundle_harvest',
    name: 'Harvest Bundle',
    description: 'Share the season\'s yield — turnips from the garden and carp from the pond.',
    requiredItems: [
      { itemId: 'rpg_turnip', quantity: 8 },
      { itemId: 'rpg_carp', quantity: 4 },
    ],
    reward: {
      coins: 400,
      perk: 'bundle_energy_bonus',
      energyBonus: BUNDLE_ENERGY_BONUS,
      perkLabel: `Hearth Provisions · +${BUNDLE_ENERGY_BONUS} energy`,
    },
  },

  // ── Craft Bundle ── worked goods: planks (woodworking table) + bars (Furnace).
  bundle_craft: {
    id: 'bundle_craft',
    name: 'Artisan Bundle',
    description: 'Prove the village can make things — planks from the table, iron from the forge.',
    requiredItems: [
      { itemId: 'rpg_wood_plank', quantity: 6 },
      { itemId: 'rpg_iron_bar', quantity: 3 },
    ],
    reward: {
      coins: 500,
      perk: 'hearth_free_seed_day',
      perkLabel: 'Town Larder · a free seed each day',
    },
  },
};

// The seeds the Town Larder perk (bundle 3) can hand out — one at random per
// logical day. All three are live crop seeds the shop already sells.
export const FREE_SEED_POOL: string[] = [
  'rpg_turnip_seed',
  'rpg_cabbage_seed',
  'rpg_pumpkin_seed',
];

export function getBundleDef(bundleId: string): BundleDefinition | null {
  return BUNDLE_CATALOG[bundleId] ?? null;
}

export function getAllBundles(): BundleDefinition[] {
  return Object.values(BUNDLE_CATALOG);
}
