// Per RPG_ARCHITECTURE.md's Buildings model: a building is an empty shell
// with a `role`; stations (Furnace, Loom, ...) are placed *inside* a
// completed building and only work if their `requiredBuildingRole`
// matches that building's `role`. Coop/Barn are a separate, unrelated
// concept — real livestock housing, not part of the 6-role container
// model — and have no role/requiredBuildingRole.
export type BuildingRole = 'Workshop' | 'Factory' | 'ToolShed' | 'Market' | 'TownHall' | 'Library';

export type BuildingType =
  | 'Coop' | 'Barn' | 'Furnace' | 'Loom' | 'CheesePress' | 'MayonnaiseMachine'
  | 'FertiliserMixer' | 'IrrigationBench' | 'VendorStall'
  | 'Workshop' | 'Factory' | 'ToolShed' | 'Market' | 'TownHall' | 'Library';

export type BuildingDefinition = {
  id: string;
  name: string;
  type: BuildingType;
  priceCoins: number;
  priceWood: number;
  priceStone: number;
  colWidth: number;
  colHeight: number;
  // Set on the 6 empty-shell buildings only.
  role?: BuildingRole;
  // Set on stations placed inside a building (Furnace, Loom, etc.) —
  // the target building's `role` must match this to be a valid spot.
  requiredBuildingRole?: BuildingRole;
};

// Real building/station costs are live (Wave 4 economy truth). Historically a
// TESTING flag zeroed these while iterating on big-building placement; it is now
// false so the coin/material economy is honest.
const TESTING_FREE_BUILDINGS = false;

const BUILDING_CATALOG_BASE: Record<string, BuildingDefinition> = {
  rpg_coop: {
    id: 'rpg_coop',
    name: 'Chicken Coop',
    type: 'Coop',
    priceCoins: 4000,
    priceWood: 300,
    priceStone: 100,
    colWidth: 6,
    colHeight: 3,
  },
  rpg_barn: {
    id: 'rpg_barn',
    name: 'Barn',
    type: 'Barn',
    priceCoins: 6000,
    priceWood: 350,
    priceStone: 150,
    colWidth: 7,
    colHeight: 4,
  },

  // ── Stations — placed inside a matching building, see requiredBuildingRole ──
  rpg_furnace: {
    id: 'rpg_furnace',
    name: 'Furnace',
    type: 'Furnace',
    priceCoins: 250,
    priceWood: 0,
    priceStone: 20,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'Workshop',
  },
  rpg_loom: {
    id: 'rpg_loom',
    name: 'Loom',
    type: 'Loom',
    priceCoins: 250,
    priceWood: 60,
    priceStone: 0,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'Factory',
  },
  rpg_cheese_press: {
    id: 'rpg_cheese_press',
    name: 'Cheese Press',
    type: 'CheesePress',
    priceCoins: 200,
    priceWood: 45,
    priceStone: 0,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'Factory',
  },
  rpg_mayonnaise_machine: {
    id: 'rpg_mayonnaise_machine',
    name: 'Mayonnaise Machine',
    type: 'MayonnaiseMachine',
    priceCoins: 200,
    priceWood: 40,
    priceStone: 0,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'Factory',
  },
  rpg_fertiliser_mixer: {
    id: 'rpg_fertiliser_mixer',
    name: 'Fertiliser Mixer',
    type: 'FertiliserMixer',
    priceCoins: 180,
    priceWood: 50,
    priceStone: 10,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'ToolShed',
  },
  rpg_irrigation_bench: {
    id: 'rpg_irrigation_bench',
    name: 'Irrigation Bench',
    type: 'IrrigationBench',
    priceCoins: 220,
    priceWood: 40,
    priceStone: 30,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'ToolShed',
  },
  rpg_vendor_stall: {
    id: 'rpg_vendor_stall',
    name: 'Vendor Stall',
    type: 'VendorStall',
    priceCoins: 300,
    priceWood: 60,
    priceStone: 20,
    colWidth: 1,
    colHeight: 1,
    requiredBuildingRole: 'Market',
  },

  // ── The 6 empty-shell buildings ──────────────────────────────────────────
  rpg_blacksmith_hut: {
    id: 'rpg_blacksmith_hut',
    name: 'Blacksmith Hut',
    type: 'Workshop',
    priceCoins: 1500,
    priceWood: 200,
    priceStone: 100,
    colWidth: 5,
    colHeight: 5,
    role: 'Workshop',
  },
  rpg_artisan_mill: {
    id: 'rpg_artisan_mill',
    name: 'Artisan Mill',
    type: 'Factory',
    priceCoins: 1800,
    priceWood: 220,
    priceStone: 120,
    colWidth: 6,
    colHeight: 6,
    role: 'Factory',
  },
  rpg_tool_shed: {
    id: 'rpg_tool_shed',
    name: "Tinker's Hollow",
    type: 'ToolShed',
    priceCoins: 1200,
    priceWood: 180,
    priceStone: 60,
    colWidth: 4,
    colHeight: 4,
    role: 'ToolShed',
  },
  rpg_wanderers_bazaar: {
    id: 'rpg_wanderers_bazaar',
    name: "Wanderer's Bazaar",
    type: 'Market',
    priceCoins: 2200,
    priceWood: 200,
    priceStone: 150,
    colWidth: 6,
    colHeight: 6,
    role: 'Market',
  },
  rpg_village_hearth: {
    id: 'rpg_village_hearth',
    name: 'Village Hearth',
    type: 'TownHall',
    // Wave 4 economy-truth audit: the Hearth is the spec'd cheapest/earliest
    // building (no prerequisites). With a fresh 50-coin start and free
    // forage/mining, 150 coins + 40 wood + 20 stone is reachable in an early
    // session (was 300/100/20 — the 100-wood ask was a ~70-chop grind for a
    // first build). Still the cheapest shell by every axis.
    priceCoins: 150,
    priceWood: 40,
    priceStone: 20,
    colWidth: 5,
    colHeight: 5,
    role: 'TownHall',
  },
  rpg_forgotten_chamber: {
    id: 'rpg_forgotten_chamber',
    name: 'Forgotten Chamber',
    type: 'Library',
    priceCoins: 2000,
    priceWood: 150,
    priceStone: 180,
    colWidth: 5,
    colHeight: 5,
    role: 'Library',
  },
};

export const BUILDING_CATALOG: Record<string, BuildingDefinition> = TESTING_FREE_BUILDINGS
  ? Object.fromEntries(
      Object.entries(BUILDING_CATALOG_BASE).map(([id, def]) => [
        id,
        { ...def, priceCoins: 0, priceWood: 0, priceStone: 0 },
      ]),
    )
  : BUILDING_CATALOG_BASE;

export function getBuildingDef(id: string): BuildingDefinition | null {
  return BUILDING_CATALOG[id] || null;
}

// ─── Building levels & upgrades (RPG_PROGRESSION_LATTICE.md D6) ──────────────
// An upgrade re-runs the two-phase timed construction (construction.ts) to
// level+1. Requirements are per (role, targetLevel): a material/coin cost plus
// an optional prerequisite predicate + human-readable label. The predicate is
// pure — the caller (rpg.tsx) passes in the player's live mastery levels — so
// this stays DB-free and unit-testable.

export type UpgradeMaterialCost = { itemId: string; quantity: number };

export type UpgradeContext = {
  // Mastery LEVELS keyed by skill name (rpg.tsx supplies getMasteryLevel).
  masteryLevel: (skill: string) => number;
};

export type BuildingUpgradeDef = {
  targetLevel: number;
  coins: number;
  materials: UpgradeMaterialCost[];
  // Optional gate. When present and prerequisiteMet() is false, the upgrade is
  // blocked and requirementLabel is shown (existing toast style).
  requirementLabel?: string;
  prerequisiteMet?: (ctx: UpgradeContext) => boolean;
};

// Max building level per role (this wave). Library reaches 3; the rest cap at 2.
export const MAX_BUILDING_LEVEL: Record<BuildingRole, number> = {
  Library: 3,
  Workshop: 2,
  Factory: 2,
  ToolShed: 2,
  Market: 2,
  TownHall: 2,
};

// Mastery LEVEL thresholds (skills.ts LEVELS_PER_TIER = 3, so Silver = lvl 4,
// Gold = lvl 7). Duplicated as constants here to avoid a skills.ts import in
// this pure catalog; kept in sync with skills.ts getMasteryTier boundaries.
const MASTERY_SILVER_LEVEL = 4;
const MASTERY_GOLD_LEVEL = 7;

// role → (targetLevel → upgrade def). Only roles/levels with real data ship;
// getUpgradeDef returns null for anything undefined (e.g. TownHall is defined
// but unused by UI this wave; Library lvl 3 exists but needs Research Gold).
const BUILDING_UPGRADES_BASE: Record<BuildingRole, Record<number, BuildingUpgradeDef>> = {
  Library: {
    2: {
      targetLevel: 2,
      coins: 0,
      materials: [
        { itemId: 'rpg_wood', quantity: 20 },
        { itemId: 'rpg_stone', quantity: 10 },
      ],
      requirementLabel: 'Needs Language Silver',
      prerequisiteMet: ctx => ctx.masteryLevel('language') >= MASTERY_SILVER_LEVEL,
    },
    3: {
      targetLevel: 3,
      coins: 0,
      materials: [
        { itemId: 'rpg_wood', quantity: 40 },
        { itemId: 'rpg_stone', quantity: 30 },
        { itemId: 'rpg_crystal_shards', quantity: 5 },
      ],
      requirementLabel: 'Needs Research Gold',
      prerequisiteMet: ctx => ctx.masteryLevel('research') >= MASTERY_GOLD_LEVEL,
    },
  },
  Workshop: {
    2: { targetLevel: 2, coins: 800, materials: [{ itemId: 'rpg_wood', quantity: 30 }, { itemId: 'rpg_stone', quantity: 20 }] },
  },
  Factory: {
    2: { targetLevel: 2, coins: 1000, materials: [{ itemId: 'rpg_wood', quantity: 40 }, { itemId: 'rpg_stone', quantity: 20 }] },
  },
  ToolShed: {
    2: { targetLevel: 2, coins: 600, materials: [{ itemId: 'rpg_wood', quantity: 25 }, { itemId: 'rpg_stone', quantity: 10 }] },
  },
  Market: {
    2: { targetLevel: 2, coins: 1200, materials: [{ itemId: 'rpg_wood', quantity: 30 }, { itemId: 'rpg_stone', quantity: 30 }] },
  },
  // Defined but unused this wave (bundle pages arrive in Wave 4).
  TownHall: {
    2: { targetLevel: 2, coins: 500, materials: [{ itemId: 'rpg_wood', quantity: 20 }, { itemId: 'rpg_stone', quantity: 10 }] },
  },
};

// Same TESTING_FREE zeroing the shop/build catalog uses: while testing, drop
// coin+material costs so upgrades can be exercised freely (prerequisites still
// apply — those are the actual progression gates, not the costs).
function zeroCosts(
  base: Record<BuildingRole, Record<number, BuildingUpgradeDef>>,
): Record<BuildingRole, Record<number, BuildingUpgradeDef>> {
  const out = {} as Record<BuildingRole, Record<number, BuildingUpgradeDef>>;
  for (const role of Object.keys(base) as BuildingRole[]) {
    const levels = base[role];
    const zeroed: Record<number, BuildingUpgradeDef> = {};
    for (const lvl of Object.keys(levels)) {
      zeroed[Number(lvl)] = { ...levels[Number(lvl)], coins: 0, materials: [] };
    }
    out[role] = zeroed;
  }
  return out;
}

export const BUILDING_UPGRADES: Record<BuildingRole, Record<number, BuildingUpgradeDef>> =
  TESTING_FREE_BUILDINGS ? zeroCosts(BUILDING_UPGRADES_BASE) : BUILDING_UPGRADES_BASE;

// The upgrade def taking a building of `role` from currentLevel → currentLevel+1,
// or null if already maxed / no data for that step.
export function getUpgradeDef(role: BuildingRole, currentLevel: number): BuildingUpgradeDef | null {
  const target = currentLevel + 1;
  if (target > (MAX_BUILDING_LEVEL[role] ?? 1)) return null;
  return BUILDING_UPGRADES[role]?.[target] ?? null;
}

// Flavor suffix for a building's current level, e.g. "Forgotten Chamber · Lv 2".
// Library levels carry the doc's flavor (Understanding → Wisdom); other roles
// just show the number.
export function buildingLevelLabel(role: BuildingRole | undefined, level: number): string {
  if (level <= 1) return `Lv ${level}`;
  if (role === 'Library') {
    if (level === 2) return 'Lv 2 · Understanding';
    if (level >= 3) return 'Lv 3 · Wisdom';
  }
  return `Lv ${level}`;
}

export function isStation(def: BuildingDefinition): boolean {
  return !!def.requiredBuildingRole;
}

export function isBuildingShell(def: BuildingDefinition): boolean {
  return !!def.role;
}
