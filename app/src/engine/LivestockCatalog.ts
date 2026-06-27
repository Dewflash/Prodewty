import { RpgDrop } from './RpgObjectCatalog';

export type LivestockDefinition = {
  animalType: string;
  name: string;
  feedItemId: string; // What they eat
  yieldCooldownMinutes: number; // Time between yields
  drops: RpgDrop[];
  description?: string;
};

export const LIVESTOCK_CATALOG: Record<string, LivestockDefinition> = {
  Farm_chick: {
    animalType: 'Farm_chick',
    name: 'Chicken',
    feedItemId: 'rpg_leaves', // Will be changed to hay/seeds later
    yieldCooldownMinutes: 12 * 60, // 12 hours
    drops: [{ itemId: 'rpg_egg', chance: 1, min: 1, max: 2 }],
    description: 'A happy chicken that lays eggs daily if fed.',
  },
  Farm_calf: {
    animalType: 'Farm_calf',
    name: 'Cow',
    feedItemId: 'rpg_leaves', 
    yieldCooldownMinutes: 24 * 60, // 24 hours
    drops: [{ itemId: 'rpg_milk', chance: 1, min: 1, max: 1 }],
    description: 'A friendly cow that provides milk daily if fed.',
  },
  Farm_sheep: {
    animalType: 'Farm_sheep',
    name: 'Sheep',
    feedItemId: 'rpg_leaves',
    yieldCooldownMinutes: 48 * 60, // 48 hours
    drops: [{ itemId: 'rpg_wool', chance: 1, min: 1, max: 3 }],
    description: 'A fluffy sheep that grows wool every couple of days.',
  },
  Farm_piglet: {
    animalType: 'Farm_piglet',
    name: 'Pig',
    feedItemId: 'rpg_turnip', 
    yieldCooldownMinutes: 24 * 60, 
    drops: [{ itemId: 'rpg_truffle', chance: 0.5, min: 1, max: 1 }],
    description: 'A pig that sniffs out valuable truffles.',
  },
};

export function getLivestockDef(animalType: string): LivestockDefinition | null {
  return LIVESTOCK_CATALOG[animalType] || null;
}
