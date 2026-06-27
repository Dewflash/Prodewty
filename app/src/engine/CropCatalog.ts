import { RpgDrop, RpgGrowthStage, RpgCropSeasonId, RpgSpriteFrame } from './RpgObjectCatalog';

export type CropDefinition = {
  cropId: string;
  name: string;
  seedItemId: string;
  preferredSeasons: RpgCropSeasonId[];
  stageMinutes: Record<RpgGrowthStage, number>;
  harvest: {
    coins: number;
    drops: RpgDrop[];
  };
  stageFrames?: Record<RpgGrowthStage, RpgSpriteFrame>;
};

// We will use existing sprites or UI frames later when integrating the frontend.
// For now, these are the backend definitions.
export const CROP_CATALOG: Record<string, CropDefinition> = {
  rpg_turnip_seed: {
    cropId: 'crop_turnip',
    name: 'Turnip',
    seedItemId: 'rpg_turnip_seed',
    preferredSeasons: ['spring'],
    stageMinutes: { 0: 0, 1: 30, 2: 120 }, // 2 hours to mature
    harvest: {
      coins: 20,
      drops: [{ itemId: 'rpg_turnip', chance: 1, min: 1, max: 2 }],
    },
  },
  rpg_cabbage_seed: {
    cropId: 'crop_cabbage',
    name: 'Cabbage',
    seedItemId: 'rpg_cabbage_seed',
    preferredSeasons: ['spring', 'summer'],
    stageMinutes: { 0: 0, 1: 60, 2: 240 }, // 4 hours to mature
    harvest: {
      coins: 45,
      drops: [{ itemId: 'rpg_cabbage', chance: 1, min: 1, max: 1 }],
    },
  },
  rpg_pumpkin_seed: {
    cropId: 'crop_pumpkin',
    name: 'Pumpkin',
    seedItemId: 'rpg_pumpkin_seed',
    preferredSeasons: ['autumn'],
    stageMinutes: { 0: 0, 1: 120, 2: 480 }, // 8 hours to mature
    harvest: {
      coins: 100,
      drops: [{ itemId: 'rpg_pumpkin', chance: 1, min: 1, max: 2 }],
    },
  },
};

export function getCropDef(seedItemId: string): CropDefinition | null {
  return CROP_CATALOG[seedItemId] || null;
}
