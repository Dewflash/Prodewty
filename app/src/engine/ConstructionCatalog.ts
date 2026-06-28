import { RpgDrop } from './RpgObjectCatalog';

export type ConstructionDefinition = {
  itemType: string;
  name: string;
  buildTimeMinutes: number;
  materialsNeeded?: RpgDrop[]; // Can be used later for multi-stage building
  description?: string;
};

export const CONSTRUCTION_CATALOG: Record<string, ConstructionDefinition> = {
  // Houses and Shops
  Blacksmith_hut: {
    itemType: 'Blacksmith_hut',
    name: 'Blacksmith Hut',
    buildTimeMinutes: 60 * 4, // 4 hours
    description: 'A place to forge metals and upgrade tools.',
  },
  Explorer_tent: {
    itemType: 'Explorer_tent',
    name: 'Explorer Tent',
    buildTimeMinutes: 60 * 2, // 2 hours
    description: 'Home of the adventurous explorer. Grants access to uncharted worlds.',
  },
  Villager_house_1: {
    itemType: 'Villager_house_1',
    name: 'Simple Cottage',
    buildTimeMinutes: 60 * 6, // 6 hours
    description: 'A cozy cottage that might attract a villager.',
  },
  
  // Farming Structures
  Barn: {
    itemType: 'Barn',
    name: 'Barn',
    buildTimeMinutes: 60 * 8, // 8 hours
    description: 'Houses larger livestock like cows and sheep.',
  },
  Coop: {
    itemType: 'Coop',
    name: 'Coop',
    buildTimeMinutes: 60 * 5, // 5 hours
    description: 'Houses smaller livestock like chickens.',
  },

  // Processors
  Furnace: {
    itemType: 'Furnace',
    name: 'Furnace',
    buildTimeMinutes: 30, // 30 minutes
    description: 'Smelts ores into metal bars.',
  },
  Cheese_press: {
    itemType: 'Cheese_press',
    name: 'Cheese Press',
    buildTimeMinutes: 45, // 45 minutes
    description: 'Turns milk into delicious cheese.',
  },
  Loom: {
    itemType: 'Loom',
    name: 'Loom',
    buildTimeMinutes: 45, // 45 minutes
    description: 'Spins wool into fine cloth.',
  },
  Mayonnaise_machine: {
    itemType: 'Mayonnaise_machine',
    name: 'Mayonnaise Machine',
    buildTimeMinutes: 30, // 30 minutes
    description: 'Turns eggs into mayonnaise.',
  },

  // ── Stations (BuildingCatalog.ts ids) — placed inside a matching
  // building's footprint, not freestanding. Same stations as above; these
  // entries use the rpg_* ids BuildingCatalog/RpgObjectCatalog actually
  // reference, kept alongside the legacy keys above rather than renaming
  // them (low risk of breaking any already-placed test data).
  rpg_furnace: {
    itemType: 'rpg_furnace',
    name: 'Furnace',
    buildTimeMinutes: 30,
    description: 'Smelts ores into metal bars. Place inside a Blacksmith Hut.',
  },
  rpg_loom: {
    itemType: 'rpg_loom',
    name: 'Loom',
    buildTimeMinutes: 45,
    description: 'Spins wool into fine cloth. Place inside an Artisan Mill.',
  },
  rpg_cheese_press: {
    itemType: 'rpg_cheese_press',
    name: 'Cheese Press',
    buildTimeMinutes: 45,
    description: 'Turns milk into cheese. Place inside an Artisan Mill.',
  },
  rpg_mayonnaise_machine: {
    itemType: 'rpg_mayonnaise_machine',
    name: 'Mayonnaise Machine',
    buildTimeMinutes: 30,
    description: 'Turns eggs into mayonnaise. Place inside an Artisan Mill.',
  },

  // ── The 6 empty-shell buildings ──────────────────────────────────────────
  rpg_blacksmith_hut: {
    itemType: 'rpg_blacksmith_hut',
    name: 'Blacksmith Hut',
    buildTimeMinutes: 60 * 4,
    description: 'Workshop. Place crafting stations like the Furnace inside it.',
  },
  rpg_artisan_mill: {
    itemType: 'rpg_artisan_mill',
    name: 'Artisan Mill',
    buildTimeMinutes: 60 * 4,
    description: 'Factory. Place produce-processing stations (Cheese Press, Loom, Mayonnaise Machine) inside it.',
  },
  rpg_tool_shed: {
    itemType: 'rpg_tool_shed',
    name: 'Tool Shed',
    buildTimeMinutes: 60 * 3,
    description: 'Place irrigation and fertiliser-making stations inside it.',
  },
  rpg_wanderers_bazaar: {
    itemType: 'rpg_wanderers_bazaar',
    name: "Wanderer's Bazaar",
    buildTimeMinutes: 60 * 5,
    description: 'Market. NPC vendor stalls go inside it once villagers are around to staff them.',
  },
  rpg_village_hearth: {
    itemType: 'rpg_village_hearth',
    name: 'Village Hearth',
    buildTimeMinutes: 60 * 2,
    description: 'Town Hall. The first building of the Village — no prerequisites.',
  },
  rpg_forgotten_chamber: {
    itemType: 'rpg_forgotten_chamber',
    name: 'Forgotten Chamber',
    buildTimeMinutes: 60 * 5,
    description: 'Library. Inspect discovered items here to research their identity.',
  },
};

export function getConstructionDef(itemType: string): ConstructionDefinition | null {
  return CONSTRUCTION_CATALOG[itemType] || null;
}
