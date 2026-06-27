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
};

export function getConstructionDef(itemType: string): ConstructionDefinition | null {
  return CONSTRUCTION_CATALOG[itemType] || null;
}
