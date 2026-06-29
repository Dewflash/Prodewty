import type { ZoneId } from './ZoneCatalog';
import { RPG_CROP_STAGE_FRAMES, type RpgSpriteFrame } from './RpgAssetRegistry';
import {
  RPG_WHISPERWOOD_SEED_ITEM_ID,
  RPG_DRIFTWOOD_SEED_ITEM_ID,
  RPG_STONEBARK_SEED_ITEM_ID,
  RPG_THORNROOT_SEED_ITEM_ID,
} from './RpgItemIds';

export type BiomeTreeDefinition = {
  name: string;
  seedItemId: string;
  frame: RpgSpriteFrame;
  woodMin: number;
  woodMax: number;
  seedChance: number;
};

// One tree type per biome for this first pass — per the spec, variety comes
// later. Sprite frames reuse already-verified tree art as honest
// placeholders (tagged 'placeholder' in the item catalog) until each biome
// gets its own dedicated art.
export const BIOME_TREE_CATALOG: Partial<Record<ZoneId, BiomeTreeDefinition>> = {
  forest: {
    name: 'Whisperwood',
    seedItemId: RPG_WHISPERWOOD_SEED_ITEM_ID,
    frame: RPG_CROP_STAGE_FRAMES.whiteTree[2],
    woodMin: 2,
    woodMax: 4,
    seedChance: 0.25,
  },
  beach: {
    name: 'Driftwood',
    seedItemId: RPG_DRIFTWOOD_SEED_ITEM_ID,
    frame: RPG_CROP_STAGE_FRAMES.curvedTree[2],
    woodMin: 1,
    woodMax: 3,
    seedChance: 0.25,
  },
  mountain: {
    name: 'Stonebark',
    seedItemId: RPG_STONEBARK_SEED_ITEM_ID,
    frame: RPG_CROP_STAGE_FRAMES.luminousTree[2],
    woodMin: 2,
    woodMax: 5,
    seedChance: 0.2,
  },
  desert: {
    name: 'Thornroot',
    seedItemId: RPG_THORNROOT_SEED_ITEM_ID,
    frame: RPG_CROP_STAGE_FRAMES.blueGreenTree[2],
    woodMin: 1,
    woodMax: 2,
    seedChance: 0.2,
  },
};

export function getBiomeTree(zoneId: string): BiomeTreeDefinition | null {
  return BIOME_TREE_CATALOG[zoneId as ZoneId] ?? null;
}
