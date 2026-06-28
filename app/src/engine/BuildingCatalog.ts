// Per RPG_ARCHITECTURE.md's Buildings model: a building is an empty shell
// with a `role`; stations (Furnace, Loom, ...) are placed *inside* a
// completed building and only work if their `requiredBuildingRole`
// matches that building's `role`. Coop/Barn are a separate, unrelated
// concept — real livestock housing, not part of the 6-role container
// model — and have no role/requiredBuildingRole.
export type BuildingRole = 'Workshop' | 'Factory' | 'ToolShed' | 'Market' | 'TownHall' | 'Library';

export type BuildingType =
  | 'Coop' | 'Barn' | 'Furnace' | 'Loom' | 'CheesePress' | 'MayonnaiseMachine'
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

export const BUILDING_CATALOG: Record<string, BuildingDefinition> = {
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
    name: 'Tool Shed',
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
    priceCoins: 300,
    priceWood: 100,
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

export function getBuildingDef(id: string): BuildingDefinition | null {
  return BUILDING_CATALOG[id] || null;
}

export function isStation(def: BuildingDefinition): boolean {
  return !!def.requiredBuildingRole;
}

export function isBuildingShell(def: BuildingDefinition): boolean {
  return !!def.role;
}
