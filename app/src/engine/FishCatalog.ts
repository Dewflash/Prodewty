import { ZoneId } from './ZoneCatalog';

export type FishDefinition = {
  itemId: string;
  name: string;
  difficulty: number; // 1-100, affects minigame bar speed
  sellPrice: number;
  seasons: string[]; // 'spring', 'summer', 'autumn', 'winter'
  timeRange: [number, number]; // e.g., [6, 18] for 6am to 6pm
  allowedZones: ZoneId[];
};

export const FISH_CATALOG: Record<string, FishDefinition> = {
  'rpg_carp': {
    itemId: 'rpg_carp',
    name: 'Carp',
    difficulty: 15,
    sellPrice: 30,
    seasons: ['spring', 'summer', 'autumn'],
    timeRange: [0, 24],
    allowedZones: ['sanctuary', 'forest']
  },
  'rpg_catfish': {
    itemId: 'rpg_catfish',
    name: 'Catfish',
    difficulty: 75,
    sellPrice: 200,
    seasons: ['spring', 'autumn'],
    timeRange: [6, 24],
    allowedZones: ['sanctuary', 'forest']
  },
  'rpg_pufferfish': {
    itemId: 'rpg_pufferfish',
    name: 'Pufferfish',
    difficulty: 80,
    sellPrice: 250,
    seasons: ['summer'],
    timeRange: [12, 16],
    allowedZones: ['beach']
  },
  'rpg_squid': {
    itemId: 'rpg_squid',
    name: 'Squid',
    difficulty: 60,
    sellPrice: 150,
    seasons: ['winter'],
    timeRange: [18, 24],
    allowedZones: ['beach']
  }
};

export function getFishDef(itemId: string): FishDefinition | null {
  return FISH_CATALOG[itemId] || null;
}
