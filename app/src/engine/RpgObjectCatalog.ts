import {
  RPG_AMETHYST_ITEM_ID,
  RPG_ANCIENT_SEED_ITEM_ID,
  RPG_ANCIENT_SEED_PACK_ITEM_ID,
  RPG_BAIT_ITEM_ID,
  RPG_CABBAGE_ITEM_ID,
  RPG_CABBAGE_SEED_ITEM_ID,
  RPG_CARP_ITEM_ID,
  RPG_CATFISH_ITEM_ID,
  RPG_CHEESE_ITEM_ID,
  RPG_CLOTH_ITEM_ID,
  RPG_COAL_ITEM_ID,
  RPG_COPPER_BAR_ITEM_ID,
  RPG_CRYSTAL_SHARDS_ITEM_ID,
  RPG_DIAMOND_ITEM_ID,
  RPG_DWARVISH_HELM_ITEM_ID,
  RPG_EGG_ITEM_ID,
  RPG_FIBER_ITEM_ID,
  RPG_GEODE_ITEM_ID,
  RPG_GOLD_BAR_ITEM_ID,
  RPG_HAY_ITEM_ID,
  RPG_IRON_BAR_ITEM_ID,
  RPG_LEAVES_ITEM_ID,
  RPG_MAYONNAISE_ITEM_ID,
  RPG_MILK_ITEM_ID,
  RPG_OMELET_ITEM_ID,
  RPG_PUFFERFISH_ITEM_ID,
  RPG_PUMPKIN_ITEM_ID,
  RPG_PUMPKIN_SEED_ITEM_ID,
  RPG_RUBY_ITEM_ID,
  RPG_SALAD_ITEM_ID,
  RPG_SEAWEED_ITEM_ID,
  RPG_SQUID_ITEM_ID,
  RPG_STONE_ITEM_ID,
  RPG_TRASH_ITEM_ID,
  RPG_TURNIP_ITEM_ID,
  RPG_TURNIP_SEED_ITEM_ID,
  RPG_WATER_DROPS_ITEM_ID,
  RPG_WOOD_ITEM_ID,
  RPG_WOOD_PLANK_ITEM_ID,
  RPG_WOOL_ITEM_ID,
  RPG_TRUFFLE_ITEM_ID,
  RPG_FERTILISER_ITEM_ID,
  RPG_SPRINKLER_ITEM_ID,
  RPG_WHISPERWOOD_SEED_ITEM_ID,
  RPG_DRIFTWOOD_SEED_ITEM_ID,
  RPG_STONEBARK_SEED_ITEM_ID,
  RPG_THORNROOT_SEED_ITEM_ID,
  RPG_MUD_ITEM_ID,
  RPG_METAL_ITEM_ID,
  RPG_STICK_ITEM_ID,
  RPG_WOODEN_POLE_ITEM_ID,
  RPG_BRICK_ITEM_ID,
  RPG_STONE_WALL_ITEM_ID,
  RPG_DOOR_ITEM_ID,
  RPG_ROPE_ITEM_ID,
  RPG_GATE_ITEM_ID,
} from './RpgItemIds';
import { BUILDING_CATALOG, isBuildingShell, isStation, type BuildingDefinition } from './BuildingCatalog';
import {
  RPG_ANIMAL_OBJECT_ASSETS,
  RPG_BUSH_OBJECT_ASSETS,
  RPG_CAVE_OBJECT_ASSETS,
  RPG_CRYSTAL_OBJECT_ASSETS,
  RPG_CROP_STAGE_FRAMES,
  RPG_FOREST_OBJECT_ASSETS,
  RPG_OBJECT_SOURCES,
  RPG_RESOURCE_SOURCES,
  RPG_TEMPLE_OBJECT_ASSETS,
  RPG_UI_FRAMES,
  type RpgObjectAsset,
  type RpgSpriteAnimation,
  type RpgSpriteFrame,
} from './RpgAssetRegistry';

export { RPG_UI_FRAMES };
export type { RpgSpriteAnimation, RpgSpriteFrame };

export type RpgDrop = {
  itemId: string;
  chance: number;
  min: number;
  max: number;
};

export type RpgInteractionLoot = {
  claimKey: string;
  coins: number;
  drops: RpgDrop[];
  repeatable?: boolean;
};

export type RpgItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type RpgSourcePackId = 'all' | 'forest' | 'crystal' | 'bush' | 'cave' | 'temple' | 'animal';

export type RpgSourcePackFilter = {
  id: RpgSourcePackId;
  label: string;
  sourceLabel?: string;
};
export type RpgSourcePackCounts = Record<RpgSourcePackId, number>;

export const RPG_SOURCE_PACK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'forest', label: 'Forest', sourceLabel: 'Forest Archive' },
  { id: 'crystal', label: 'Crystal', sourceLabel: 'Crystal Archive' },
  { id: 'bush', label: 'Bush', sourceLabel: 'Bush Archive' },
  { id: 'cave', label: 'Cave', sourceLabel: 'Cave Archive' },
  { id: 'temple', label: 'Temple', sourceLabel: 'Temple Archive' },
  { id: 'animal', label: 'Animals', sourceLabel: 'Animal Archive' },
] satisfies readonly RpgSourcePackFilter[];

export function getRpgSourcePackIdForLabel(sourceLabel: string | null | undefined): RpgSourcePackId | null {
  if (!sourceLabel) return null;
  const sourcePack = RPG_SOURCE_PACK_FILTERS.find(item => item.sourceLabel === sourceLabel);
  return sourcePack && sourcePack.id !== 'all' ? sourcePack.id : null;
}

export function countRpgSourcePacks<T>(
  items: readonly T[],
  getSourceLabel: (item: T) => string | null | undefined,
): RpgSourcePackCounts {
  const counts = Object.fromEntries(
    RPG_SOURCE_PACK_FILTERS.map(item => [item.id, 0]),
  ) as RpgSourcePackCounts;
  counts.all = items.length;
  items.forEach(item => {
    const sourcePackId = getRpgSourcePackIdForLabel(getSourceLabel(item));
    if (sourcePackId) counts[sourcePackId] += 1;
  });
  return counts;
}

export type RpgInventoryItem = {
  name: string;
  kind: 'object' | 'resource' | 'seed' | 'tool';
  assetId?: string;
  iconAssetId?: string;
  source?: any;
  icon?: RpgSpriteFrame;
  animation?: RpgSpriteAnimation;
  tags?: string[];
  description?: string;
  rarity?: RpgItemRarity;
  sourceLabel?: string;
  crop?: RpgCropDefinition;
  toolId?: string;
  featherIcon?: string;
};

export type RpgPlaceableItem = RpgInventoryItem & {
  kind: 'object';
  price: number;
  colWidth: number;
  colHeight: number;
  visWidth: number;
  visHeight: number;
  forageDrops?: RpgDrop[];
  interactLoot?: RpgInteractionLoot;
};

export type RpgItemDefinition = RpgInventoryItem | RpgPlaceableItem;

export type RpgGrowthStage = 0 | 1 | 2;
export type RpgCropSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type RpgCropDefinition = {
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

export type RpgArchiveCategory = 'object' | 'seed' | 'resource' | 'tool';

export type RpgArchiveEntry = {
  itemId: string;
  name: string;
  category: RpgArchiveCategory;
  assetId: string | null;
  iconAssetId: string | null;
  description: string;
  unlockHint: string;
  rarity: RpgItemRarity;
  sourceLabel: string;
  tags: string[];
  facts: string[];
};

const TREE_FORAGE_DROPS = (seedItemId: string): RpgDrop[] => [
  { itemId: RPG_WOOD_ITEM_ID, chance: 0.55, min: 1, max: 3 },
  { itemId: 'rpg_leaves', chance: 0.3, min: 1, max: 2 },
  { itemId: seedItemId, chance: 0.1, min: 1, max: 1 },
];
const LEAF_FORAGE_DROPS: RpgDrop[] = [
  { itemId: 'rpg_leaves', chance: 0.78, min: 1, max: 2 },
];
const CRYSTAL_FORAGE_DROPS: RpgDrop[] = [
  { itemId: RPG_CRYSTAL_SHARDS_ITEM_ID, chance: 0.68, min: 1, max: 2 },
];
const TREE_SEEDS_BY_OBJECT: Record<string, string> = {
  White_tree1: 'White_tree1_seed',
  Curved_tree1: 'Curved_tree1_seed',
  Luminous_tree1: 'Luminous_tree1_seed',
  'Blue-green_balls_tree1': 'Blue-green_balls_tree1_seed',
  Mega_tree1: 'Mega_tree1_seed',
};

function treeSeedCrop(
  seedItemId: string,
  name: string,
  coins: number,
  stageFrames: Record<RpgGrowthStage, RpgSpriteFrame>,
  preferredSeasons: RpgCropSeasonId[],
): RpgCropDefinition {
  return {
    cropId: `${seedItemId}_crop`,
    name,
    seedItemId,
    preferredSeasons,
    stageFrames,
    stageMinutes: {
      0: 0,
      1: 45,
      2: 120,
    },
    harvest: {
      coins,
      drops: [{ itemId: 'rpg_leaves', chance: 1, min: 1, max: 3 }],
    },
  };
}

export const RPG_CROP_CATALOG = {
  White_tree1_seed: treeSeedCrop('White_tree1_seed', 'White Tree Sapling', 18, RPG_CROP_STAGE_FRAMES.whiteTree, ['spring', 'winter']),
  Curved_tree1_seed: treeSeedCrop('Curved_tree1_seed', 'Curved Tree Sapling', 22, RPG_CROP_STAGE_FRAMES.curvedTree, ['autumn', 'spring']),
  Luminous_tree1_seed: treeSeedCrop('Luminous_tree1_seed', 'Luminous Tree Sapling', 34, RPG_CROP_STAGE_FRAMES.luminousTree, ['summer', 'winter']),
  'Blue-green_balls_tree1_seed': treeSeedCrop('Blue-green_balls_tree1_seed', 'Blue-Green Tree Sapling', 26, RPG_CROP_STAGE_FRAMES.blueGreenTree, ['spring', 'summer']),
  Mega_tree1_seed: treeSeedCrop('Mega_tree1_seed', 'Mega Tree Sapling', 55, RPG_CROP_STAGE_FRAMES.megaTree, ['autumn', 'winter']),
  [RPG_TURNIP_SEED_ITEM_ID]: {
    cropId: 'crop_turnip',
    name: 'Turnip',
    seedItemId: RPG_TURNIP_SEED_ITEM_ID,
    preferredSeasons: ['spring'],
    stageMinutes: { 0: 0, 1: 30, 2: 120 },
    harvest: {
      coins: 20,
      drops: [{ itemId: RPG_TURNIP_ITEM_ID, chance: 1, min: 1, max: 2 }],
    },
  },
  [RPG_CABBAGE_SEED_ITEM_ID]: {
    cropId: 'crop_cabbage',
    name: 'Cabbage',
    seedItemId: RPG_CABBAGE_SEED_ITEM_ID,
    preferredSeasons: ['spring', 'summer'],
    stageMinutes: { 0: 0, 1: 60, 2: 240 },
    harvest: {
      coins: 45,
      drops: [{ itemId: RPG_CABBAGE_ITEM_ID, chance: 1, min: 1, max: 1 }],
    },
  },
  [RPG_PUMPKIN_SEED_ITEM_ID]: {
    cropId: 'crop_pumpkin',
    name: 'Pumpkin',
    seedItemId: RPG_PUMPKIN_SEED_ITEM_ID,
    preferredSeasons: ['autumn'],
    stageMinutes: { 0: 0, 1: 120, 2: 480 },
    harvest: {
      coins: 100,
      drops: [{ itemId: RPG_PUMPKIN_ITEM_ID, chance: 1, min: 1, max: 2 }],
    },
  },
} satisfies Record<string, RpgCropDefinition>;

function forestObjectDescription(asset: RpgObjectAsset) {
  if (asset.tags.includes('mushroom')) return `${asset.name} from the forest object archive. Mostly decorative for now.`;
  if (asset.tags.includes('idol')) return `${asset.name} for future shrine, relic, and sanctuary progression systems.`;
  if (asset.tags.includes('ent')) return `${asset.name} for future animated forest guardian encounters.`;
  if (asset.tags.includes('structure')) return `${asset.name} for future rest, crafting, or visitor mechanics.`;
  if (asset.tags.includes('tree')) return `${asset.name} with a walk-blocking base and sanctuary forage hooks.`;
  return `${asset.name} from the forest object archive.`;
}

function forestObjectPrice(asset: RpgObjectAsset) {
  if (asset.tags.includes('large')) return 900;
  if (asset.tags.includes('idol')) return 650;
  if (asset.tags.includes('ent')) return 700;
  if (asset.tags.includes('structure')) return 500;
  if (asset.tags.includes('mushroom')) return asset.pixelWidth >= 128 ? 120 : 60;
  if (asset.tags.includes('tree')) return asset.pixelWidth >= 128 ? 220 : 120;
  return 100;
}

function forestObjectRarity(asset: RpgObjectAsset): RpgItemRarity {
  if (asset.itemId === 'Mega_tree1' || asset.itemId === 'Tree_idol_dragon') return 'epic';
  if (asset.tags.includes('large') || asset.tags.includes('idol') || asset.tags.includes('ent')) return 'rare';
  if (asset.tags.includes('structure') || asset.pixelWidth >= 128) return 'uncommon';
  return 'common';
}

function forestObjectFootprint(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 256 || asset.tags.includes('large')) {
    return { colWidth: 2, colHeight: 2, visWidth: 4, visHeight: 4 };
  }
  if (asset.tags.includes('structure') || asset.tags.includes('idol') || asset.tags.includes('ent')) {
    return { colWidth: 2, colHeight: 2, visWidth: 3, visHeight: 3 };
  }
  if (asset.pixelWidth <= 32) {
    return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
  }
  if (asset.pixelWidth <= 64) {
    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  }
  if (asset.tags.includes('mushroom')) {
    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  }
  return { colWidth: 1, colHeight: 1, visWidth: 3, visHeight: 3 };
}

function makeForestObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  const footprint = forestObjectFootprint(asset);
  const seedItemId = TREE_SEEDS_BY_OBJECT[asset.itemId];
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: forestObjectPrice(asset),
    ...footprint,
    source: RPG_OBJECT_SOURCES[asset.itemId],
    tags: asset.tags,
    rarity: forestObjectRarity(asset),
    sourceLabel: 'Forest Archive',
    description: forestObjectDescription(asset),
    forageDrops: asset.tags.includes('tree')
      ? seedItemId
        ? TREE_FORAGE_DROPS(seedItemId)
        : LEAF_FORAGE_DROPS
      : undefined,
  };
}

const RPG_FOREST_OBJECT_CATALOG = Object.fromEntries(
  RPG_FOREST_OBJECT_ASSETS.map(asset => [asset.itemId, makeForestObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

function crystalObjectDescription(asset: RpgObjectAsset) {
  return `${asset.name} from the crystal archive. Interact with it in the sanctuary for a chance at Crystal Shards.`;
}

function crystalObjectPrice(asset: RpgObjectAsset) {
  if (asset.tags.includes('large')) return 180;
  if (asset.tags.includes('small')) return 80;
  if (asset.tags.includes('tiny')) return 45;
  return 120;
}

function crystalObjectRarity(asset: RpgObjectAsset): RpgItemRarity {
  if (asset.tags.includes('black') || asset.tags.includes('violet')) return 'rare';
  if (asset.tags.includes('dark') || asset.tags.includes('yellow-green')) return 'uncommon';
  if (asset.tags.includes('large')) return 'uncommon';
  return 'common';
}

function crystalObjectFootprint(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 64) return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
}

function makeCrystalObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: crystalObjectPrice(asset),
    ...crystalObjectFootprint(asset),
    source: RPG_OBJECT_SOURCES[asset.itemId],
    tags: asset.tags,
    rarity: crystalObjectRarity(asset),
    sourceLabel: 'Crystal Archive',
    description: crystalObjectDescription(asset),
    forageDrops: CRYSTAL_FORAGE_DROPS,
  };
}

const RPG_CRYSTAL_OBJECT_CATALOG = Object.fromEntries(
  RPG_CRYSTAL_OBJECT_ASSETS.map(asset => [asset.itemId, makeCrystalObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

function bushObjectDescription(asset: RpgObjectAsset) {
  if (asset.tags.includes('cactus')) return `${asset.name} from the bush archive. A compact desert object for sanctuary landscaping.`;
  if (asset.tags.includes('stump')) return `${asset.name} from the bush archive. A small ground object for paths, edges, and ruins.`;
  if (asset.tags.includes('fern')) return `${asset.name} from the bush archive. Interact with it for a small chance at leaves.`;
  if (asset.tags.includes('flower')) return `${asset.name} from the bush archive. A flowering shrub with a small leaf forage hook.`;
  return `${asset.name} from the bush archive. A compact plant object with light sanctuary forage hooks.`;
}

function bushObjectPrice(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 64) return 90;
  if (asset.pixelWidth >= 32) return 55;
  return 30;
}

function bushObjectRarity(asset: RpgObjectAsset): RpgItemRarity {
  if (asset.tags.includes('snow') || asset.tags.includes('autumn')) return 'uncommon';
  if (asset.tags.includes('flower')) return 'uncommon';
  return 'common';
}

function bushObjectFootprint(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 64) return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
}

function makeBushObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: bushObjectPrice(asset),
    ...bushObjectFootprint(asset),
    source: RPG_OBJECT_SOURCES[asset.itemId],
    tags: asset.tags,
    rarity: bushObjectRarity(asset),
    sourceLabel: 'Bush Archive',
    description: bushObjectDescription(asset),
    forageDrops: asset.tags.includes('forage') ? LEAF_FORAGE_DROPS : undefined,
  };
}

const RPG_BUSH_OBJECT_CATALOG = Object.fromEntries(
  RPG_BUSH_OBJECT_ASSETS.map(asset => [asset.itemId, makeBushObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

function caveObjectDescription(asset: RpgObjectAsset) {
  if (asset.tags.includes('structure')) return `${asset.name} from the cave archive. A heavier landmark for future dungeon and sanctuary ruins.`;
  if (asset.tags.includes('relic')) return `${asset.name} from the cave archive. A relic-class object for future shrine and crafting hooks.`;
  if (asset.tags.includes('skeleton') || asset.tags.includes('bone')) return `${asset.name} from the cave archive. Bone scenery for future dungeon progression.`;
  if (asset.tags.includes('mushroom')) return `${asset.name} from the cave archive. A decorative underground mushroom.`;
  if (asset.tags.includes('rock')) return `${asset.name} from the cave archive. Dense cave landscaping with a walk-blocking base.`;
  return `${asset.name} from the cave archive.`;
}

function caveObjectPrice(asset: RpgObjectAsset) {
  if (asset.tags.includes('large')) return 520;
  if (asset.tags.includes('structure')) return 420;
  if (asset.tags.includes('relic')) return 360;
  if (asset.pixelWidth >= 128) return 180;
  if (asset.pixelWidth >= 64) return 90;
  return 45;
}

function caveObjectRarity(asset: RpgObjectAsset): RpgItemRarity {
  if (asset.tags.includes('large')) return 'epic';
  if (asset.tags.includes('relic') || asset.tags.includes('structure')) return 'rare';
  if (asset.pixelWidth >= 128) return 'uncommon';
  return 'common';
}

function caveObjectFootprint(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 256 || asset.tags.includes('large')) {
    return { colWidth: 2, colHeight: 2, visWidth: 4, visHeight: 4 };
  }
  if (asset.tags.includes('structure') || asset.tags.includes('relic')) {
    return { colWidth: 2, colHeight: 2, visWidth: 3, visHeight: 3 };
  }
  if (asset.pixelWidth >= 128) return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
}

function makeCaveObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: caveObjectPrice(asset),
    ...caveObjectFootprint(asset),
    source: RPG_OBJECT_SOURCES[asset.itemId],
    tags: asset.tags,
    rarity: caveObjectRarity(asset),
    sourceLabel: 'Cave Archive',
    description: caveObjectDescription(asset),
  };
}

const RPG_CAVE_OBJECT_CATALOG = Object.fromEntries(
  RPG_CAVE_OBJECT_ASSETS.map(asset => [asset.itemId, makeCaveObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

function templeObjectDescription(asset: RpgObjectAsset) {
  if (asset.tags.includes('trap')) return `${asset.name} from the temple archive. Interact to arm or disarm it; linked levers can also toggle it.`;
  if (asset.tags.includes('gate')) return `${asset.name} from the temple archive. Link it to a lever to open or close its blocked tile.`;
  if (asset.tags.includes('mechanism')) return `${asset.name} from the temple archive. A mechanism prop that can link to nearby gates and traps.`;
  if (asset.tags.includes('structure')) return `${asset.name} from the temple archive. A ruin landmark for sanctuary layouts and future dungeon progression.`;
  if (asset.tags.includes('fire')) return `${asset.name} from the temple archive. An animated flame prop for livelier sanctuary rooms.`;
  if (asset.tags.includes('statue') || asset.tags.includes('relic')) return `${asset.name} from the temple archive. A relic object for future shrine and lore hooks.`;
  if (asset.tags.includes('banner')) return `${asset.name} from the temple archive. A narrow wall decor object for themed rooms.`;
  if (asset.tags.includes('chest')) return `${asset.name} from the temple archive. A treasure object reserved for future reward systems.`;
  if (asset.tags.includes('rubble')) return `${asset.name} from the temple archive. Ground scenery for broken paths and ruins.`;
  return `${asset.name} from the temple archive.`;
}

function templeObjectPrice(asset: RpgObjectAsset) {
  if (asset.tags.includes('large')) return 640;
  if (asset.tags.includes('structure')) return 420;
  if (asset.tags.includes('relic')) return 340;
  if (asset.tags.includes('hazard') || asset.tags.includes('mechanism')) return 180;
  if (asset.tags.includes('banner') || asset.tags.includes('decor') || asset.tags.includes('small')) return 70;
  return 140;
}

function templeObjectRarity(asset: RpgObjectAsset): RpgItemRarity {
  if (asset.tags.includes('large')) return 'epic';
  if (asset.tags.includes('relic') || asset.tags.includes('structure')) return 'rare';
  if (asset.tags.includes('hazard') || asset.tags.includes('mechanism')) return 'uncommon';
  if (asset.tags.includes('overgrown') || asset.tags.includes('statue')) return 'uncommon';
  return 'common';
}

function templeObjectFootprint(asset: RpgObjectAsset) {
  if (asset.pixelWidth >= 160 || asset.tags.includes('large')) {
    return { colWidth: 3, colHeight: 2, visWidth: 5, visHeight: 5 };
  }
  if (asset.tags.includes('lever')) {
    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  }
  if (asset.tags.includes('sarcophagus') || asset.tags.includes('wall')) {
    return { colWidth: 2, colHeight: 1, visWidth: 3, visHeight: 2 };
  }
  if (asset.tags.includes('trap')) {
    return asset.pixelWidth >= 64
      ? { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 1 }
      : { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
  }
  if (asset.tags.includes('chest') || asset.tags.includes('fire') || asset.tags.includes('small')) {
    return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
  }
  if (asset.tags.includes('gate') || asset.tags.includes('mechanism')) {
    return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 2 };
  }
  if (asset.tags.includes('statue') || asset.tags.includes('relic')) {
    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 3 };
  }
  if (asset.tags.includes('banner') || asset.pixelHeight >= 48) {
    return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 2 };
  }
  return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
}

function templeObjectLoot(asset: RpgObjectAsset): RpgInteractionLoot | undefined {
  if (!asset.tags.includes('chest')) return undefined;
  const isAnimatedChest = asset.itemId === 'Temple_animated_chest';
  return {
    claimKey: `sanctuary_chest:${asset.itemId}`,
    coins: isAnimatedChest ? 55 : 30,
    drops: [
      {
        itemId: RPG_CRYSTAL_SHARDS_ITEM_ID,
        chance: isAnimatedChest ? 0.9 : 0.65,
        min: isAnimatedChest ? 2 : 1,
        max: isAnimatedChest ? 4 : 2,
      },
    ],
  };
}

function makeTempleObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: templeObjectPrice(asset),
    ...templeObjectFootprint(asset),
    icon: asset.frame,
    animation: asset.animation,
    tags: asset.tags,
    rarity: templeObjectRarity(asset),
    sourceLabel: 'Temple Archive',
    description: templeObjectDescription(asset),
    interactLoot: templeObjectLoot(asset),
  };
}

const RPG_TEMPLE_OBJECT_CATALOG = Object.fromEntries(
  RPG_TEMPLE_OBJECT_ASSETS.map(asset => [asset.itemId, makeTempleObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

function animalObjectPrice(asset: RpgObjectAsset) {
  if (asset.tags.includes('calf')) return 420;
  if (asset.tags.includes('sheep')) return 320;
  if (asset.tags.includes('piglet')) return 260;
  return 140;
}

function animalObjectFootprint(asset: RpgObjectAsset) {
  if (asset.tags.includes('calf')) {
    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };
  }
  return { colWidth: 1, colHeight: 1, visWidth: 1, visHeight: 1 };
}

function animalProductDrop(asset: RpgObjectAsset): RpgDrop[] {
  if (asset.tags.includes('chick')) return [{ itemId: 'rpg_egg', chance: 1, min: 1, max: 1 }];
  if (asset.tags.includes('piglet')) return [{ itemId: 'rpg_truffle', chance: 0.55, min: 1, max: 1 }];
  if (asset.tags.includes('sheep')) return [{ itemId: 'rpg_wool', chance: 0.8, min: 1, max: 1 }];
  if (asset.tags.includes('calf')) return [{ itemId: 'rpg_milk', chance: 0.75, min: 1, max: 1 }];
  return [];
}

function makeAnimalObjectItem(asset: RpgObjectAsset): RpgPlaceableItem {
  return {
    name: asset.name,
    kind: 'object',
    assetId: asset.assetId,
    price: animalObjectPrice(asset),
    ...animalObjectFootprint(asset),
    icon: asset.frame,
    animation: asset.animation,
    tags: asset.tags,
    rarity: asset.tags.includes('calf') || asset.tags.includes('sheep') ? 'uncommon' : 'common',
    sourceLabel: 'Animal Archive',
    description: `${asset.name} from the farm animal archive. Interact to collect a small farm product.`,
    forageDrops: animalProductDrop(asset),
  };
}

const RPG_ANIMAL_OBJECT_CATALOG = Object.fromEntries(
  RPG_ANIMAL_OBJECT_ASSETS.map(asset => [asset.itemId, makeAnimalObjectItem(asset)]),
) as Record<string, RpgPlaceableItem>;

const BUILDING_SHELL_ICONS: Record<string, string> = {
  Workshop: 'tool',
  Factory: 'settings',
  ToolShed: 'box',
  Market: 'shopping-bag',
  TownHall: 'home',
  Library: 'book',
};
const STATION_ICONS: Record<string, string> = {
  Furnace: 'sun',
  Loom: 'grid',
  CheesePress: 'circle',
  MayonnaiseMachine: 'droplet',
  FertiliserMixer: 'thermometer',
  IrrigationBench: 'droplet',
  VendorStall: 'shopping-bag',
};

function buildingDescription(def: BuildingDefinition): string {
  if (isStation(def)) return `Station. Place inside a completed ${def.requiredBuildingRole} building.`;
  return 'Empty shell — place compatible stations inside it once construction finishes.';
}

function makeBuildingItem(def: BuildingDefinition): RpgPlaceableItem {
  return {
    name: def.name,
    kind: 'object',
    price: def.priceCoins,
    colWidth: def.colWidth,
    colHeight: def.colHeight,
    visWidth: def.colWidth,
    visHeight: def.colHeight,
    featherIcon: isStation(def) ? STATION_ICONS[def.type] : BUILDING_SHELL_ICONS[def.type],
    tags: isStation(def) ? ['station', def.type] : ['building', def.type],
    rarity: 'rare',
    sourceLabel: isStation(def) ? 'Station' : 'Building',
    description: buildingDescription(def),
  };
}

export const RPG_ITEM_CATALOG = {
  [RPG_LEAVES_ITEM_ID]: {
    name: 'Leaves',
    kind: 'resource',
    assetId: 'resource.leaves',
    iconAssetId: 'resource.leaves',
    icon: RPG_UI_FRAMES.leaves,
    rarity: 'common',
    sourceLabel: 'Tree Drops',
    description: 'Soft crafting leaves gathered from sanctuary trees.',
  },
  [RPG_FIBER_ITEM_ID]: {
    name: 'Fiber',
    kind: 'resource',
    assetId: 'resource.leaves',
    iconAssetId: 'resource.leaves',
    icon: RPG_UI_FRAMES.leaves,
    rarity: 'common',
    sourceLabel: 'Foraging',
    tags: ['fiber', 'plant', 'crafting'],
    description: 'Plant fiber cleared from weeds and brush.',
  },
  [RPG_HAY_ITEM_ID]: {
    name: 'Hay',
    kind: 'resource',
    assetId: 'resource.hay',
    iconAssetId: 'resource.hay',
    source: RPG_RESOURCE_SOURCES.hay,
    rarity: 'common',
    sourceLabel: 'Farming',
    tags: ['animal_feed', 'farm'],
    description: 'Simple feed used to care for farm animals.',
  },
  [RPG_BAIT_ITEM_ID]: {
    name: 'Bait',
    kind: 'resource',
    assetId: 'resource.bait',
    iconAssetId: 'resource.bait',
    source: RPG_RESOURCE_SOURCES.bait,
    rarity: 'common',
    sourceLabel: 'Fishing',
    tags: ['bait', 'fishing'],
    description: 'Fishing bait consumed when attempting to improve bite odds.',
  },
  [RPG_WATER_DROPS_ITEM_ID]: {
    name: 'Water Drops',
    kind: 'resource',
    assetId: 'resource.waterDrop',
    iconAssetId: 'resource.waterDrop',
    icon: RPG_UI_FRAMES.waterDrop,
    rarity: 'uncommon',
    sourceLabel: 'Productivity',
    description: 'Productivity energy used to help crops grow faster.',
  },
  [RPG_CRYSTAL_SHARDS_ITEM_ID]: {
    name: 'Crystal Shards',
    kind: 'resource',
    assetId: 'resource.crystalShards',
    iconAssetId: 'resource.crystalShards',
    source: RPG_OBJECT_SOURCES.Blue_crystal4,
    rarity: 'uncommon',
    sourceLabel: 'Crystal Drops',
    tags: ['crystal', 'crafting'],
    description: 'Sharp crafting fragments gathered from sanctuary crystals.',
  },
  [RPG_WOOD_ITEM_ID]: {
    name: 'Wood',
    kind: 'resource',
    assetId: 'resource.wood',
    iconAssetId: 'resource.wood',
    source: RPG_RESOURCE_SOURCES.wood,
    rarity: 'common',
    sourceLabel: 'Tree Drops',
    tags: ['wood', 'crafting'],
    description: 'Sturdy timber chopped from sanctuary trees. Uses a branch-like candidate instead of a broken stump object.',
  },
  [RPG_STONE_ITEM_ID]: {
    name: 'Stone',
    kind: 'resource',
    assetId: 'resource.stone',
    iconAssetId: 'resource.stone',
    source: RPG_RESOURCE_SOURCES.stone,
    rarity: 'common',
    sourceLabel: 'Mining',
    tags: ['stone', 'crafting', 'placeholder'],
    description: 'Rough stone gathered from rocks and mines. Uses a rounded rock candidate instead of a narrow cave spire.',
  },
  [RPG_COAL_ITEM_ID]: {
    name: 'Coal',
    kind: 'resource',
    assetId: 'resource.coal',
    iconAssetId: 'resource.coal',
    source: RPG_RESOURCE_SOURCES.coal,
    rarity: 'common',
    sourceLabel: 'Processing',
    tags: ['fuel', 'crafting'],
    description: 'Dense fuel used for furnace recipes.',
  },
  [RPG_COPPER_BAR_ITEM_ID]: {
    name: 'Copper Bar',
    kind: 'resource',
    assetId: 'resource.copperBar',
    iconAssetId: 'resource.copperBar',
    icon: RPG_UI_FRAMES.copperBar,
    rarity: 'uncommon',
    sourceLabel: 'Mining',
    tags: ['metal', 'upgrade'],
    description: 'A copper bar for basic tool upgrades.',
  },
  [RPG_IRON_BAR_ITEM_ID]: {
    name: 'Iron Bar',
    kind: 'resource',
    assetId: 'resource.ironBar',
    iconAssetId: 'resource.ironBar',
    icon: RPG_UI_FRAMES.ironBar,
    rarity: 'uncommon',
    sourceLabel: 'Processing',
    tags: ['metal', 'crafting', 'upgrade'],
    description: 'A sturdy processed bar used in crafting and upgrades.',
  },
  [RPG_GOLD_BAR_ITEM_ID]: {
    name: 'Gold Bar',
    kind: 'resource',
    assetId: 'resource.goldBar',
    iconAssetId: 'resource.goldBar',
    icon: RPG_UI_FRAMES.goldBar,
    rarity: 'rare',
    sourceLabel: 'Processing',
    tags: ['metal', 'crafting', 'upgrade'],
    description: 'A valuable processed bar made from rare crystal materials.',
  },
  [RPG_WOOD_PLANK_ITEM_ID]: {
    name: 'Wood Plank',
    kind: 'resource',
    assetId: 'resource.woodPlank',
    iconAssetId: 'resource.woodPlank',
    source: RPG_RESOURCE_SOURCES.woodPlank,
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['wood', 'crafting'],
    description: 'Prepared lumber used for simple construction. Uses a wood-strip candidate instead of a loose stick bundle.',
  },
  [RPG_GEODE_ITEM_ID]: {
    name: 'Geode',
    kind: 'resource',
    assetId: 'resource.geode',
    iconAssetId: 'resource.geode',
    source: RPG_RESOURCE_SOURCES.geode,
    rarity: 'uncommon',
    sourceLabel: 'Mining',
    tags: ['geode', 'mineral', 'placeholder'],
    description: 'A sealed mineral node that can be opened at the blacksmith. Uses a closed rock candidate instead of a crystal shard.',
  },
  [RPG_EGG_ITEM_ID]: {
    name: 'Egg',
    kind: 'resource',
    assetId: 'resource.egg',
    iconAssetId: 'resource.egg',
    source: RPG_RESOURCE_SOURCES.egg,
    rarity: 'common',
    sourceLabel: 'Animal Products',
    tags: ['animal_product', 'egg', 'placeholder'],
    description: 'A small egg from a Chick. Uses a clean nest-like candidate until dedicated animal product art is verified.',
  },
  [RPG_MILK_ITEM_ID]: {
    name: 'Milk',
    kind: 'resource',
    assetId: 'resource.milk',
    iconAssetId: 'resource.milk',
    icon: RPG_UI_FRAMES.milkProduct,
    rarity: 'common',
    sourceLabel: 'Animal Products',
    tags: ['animal_product', 'milk', 'placeholder'],
    description: 'Fresh milk from a Calf. Uses a clean bottle candidate until dedicated milk art is verified.',
  },
  [RPG_WOOL_ITEM_ID]: {
    name: 'Wool',
    kind: 'resource',
    assetId: 'resource.wool',
    iconAssetId: 'resource.wool',
    source: RPG_RESOURCE_SOURCES.wool,
    rarity: 'common',
    sourceLabel: 'Animal Products',
    tags: ['animal_product', 'wool', 'placeholder'],
    description: 'Soft wool from a Sheep. Uses a clean textile-like candidate until dedicated wool art is verified.',
  },
  [RPG_TRUFFLE_ITEM_ID]: {
    name: 'Truffle',
    kind: 'resource',
    assetId: 'resource.truffle',
    iconAssetId: 'resource.truffle',
    source: RPG_RESOURCE_SOURCES.truffle,
    rarity: 'uncommon',
    sourceLabel: 'Animal Products',
    tags: ['animal_product', 'truffle', 'placeholder'],
    description: 'A truffle found by a Piglet. Uses a brown mushroom candidate until dedicated truffle art is verified.',
  },
  [RPG_FERTILISER_ITEM_ID]: {
    name: 'Fertiliser',
    kind: 'resource',
    assetId: 'resource.fertiliser',
    iconAssetId: 'resource.fertiliser',
    source: RPG_RESOURCE_SOURCES.fertiliser,
    rarity: 'common',
    sourceLabel: 'Tool Shed',
    tags: ['fertiliser', 'farming', 'placeholder'],
    description: 'Mixed at a Fertiliser Mixer station. Apply to a tilled plot to guarantee a double harvest. Uses a clean powder-pile candidate until dedicated art is verified.',
  },
  [RPG_SPRINKLER_ITEM_ID]: {
    name: 'Sprinkler',
    kind: 'resource',
    assetId: 'resource.sprinkler',
    iconAssetId: 'resource.sprinkler',
    icon: RPG_UI_FRAMES.sprinklerProduct,
    rarity: 'common',
    sourceLabel: 'Tool Shed',
    tags: ['sprinkler', 'farming', 'placeholder'],
    description: 'Built at an Irrigation Bench station. Use on a tilled plot to auto-water it for 3 nights. Uses a watering-can candidate until dedicated sprinkler art is verified.',
  },
  [RPG_WHISPERWOOD_SEED_ITEM_ID]: {
    name: 'Whisperwood Seed',
    kind: 'resource',
    icon: RPG_CROP_STAGE_FRAMES.whiteTree[2],
    rarity: 'uncommon',
    sourceLabel: 'Forest Biome',
    tags: ['seed', 'biome', 'placeholder'],
    description: 'Found chopping a Whisperwood tree in the Forest. Reuses a verified tree sprite as a stand-in until Whisperwood gets its own art.',
  },
  [RPG_DRIFTWOOD_SEED_ITEM_ID]: {
    name: 'Driftwood Seed',
    kind: 'resource',
    icon: RPG_CROP_STAGE_FRAMES.curvedTree[2],
    rarity: 'uncommon',
    sourceLabel: 'Beach Biome',
    tags: ['seed', 'biome', 'placeholder'],
    description: 'Found chopping a Driftwood tree on the Beach. Reuses a verified tree sprite as a stand-in until Driftwood gets its own art.',
  },
  [RPG_STONEBARK_SEED_ITEM_ID]: {
    name: 'Stonebark Seed',
    kind: 'resource',
    icon: RPG_CROP_STAGE_FRAMES.luminousTree[2],
    rarity: 'uncommon',
    sourceLabel: 'Mountain Biome',
    tags: ['seed', 'biome', 'placeholder'],
    description: 'Found chopping a Stonebark tree on the Mountain. Reuses a verified tree sprite as a stand-in until Stonebark gets its own art.',
  },
  [RPG_THORNROOT_SEED_ITEM_ID]: {
    name: 'Thornroot Seed',
    kind: 'resource',
    icon: RPG_CROP_STAGE_FRAMES.blueGreenTree[2],
    rarity: 'uncommon',
    sourceLabel: 'Desert Biome',
    tags: ['seed', 'biome', 'placeholder'],
    description: 'Found chopping a Thornroot tree in the Desert. Reuses a verified tree sprite as a stand-in until Thornroot gets its own art.',
  },
  [RPG_MUD_ITEM_ID]: {
    name: 'Mud',
    kind: 'resource',
    featherIcon: 'circle',
    rarity: 'common',
    sourceLabel: 'Digging',
    tags: ['material', 'placeholder'],
    description: 'Dug up while channeling water. A fundamental construction material.',
  },
  [RPG_METAL_ITEM_ID]: {
    name: 'Metal',
    kind: 'resource',
    featherIcon: 'box',
    rarity: 'uncommon',
    sourceLabel: 'Dungeon',
    tags: ['material', 'placeholder'],
    description: 'Scrap metal. A fundamental construction material — real sourcing (mining) is still being built.',
  },
  [RPG_STICK_ITEM_ID]: {
    name: 'Stick',
    kind: 'resource',
    featherIcon: 'minus',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['material', 'placeholder'],
    description: 'Split from Wood. Used for Wooden Poles.',
  },
  [RPG_WOODEN_POLE_ITEM_ID]: {
    name: 'Wooden Pole',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'minus',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'garden_fence', 'placeholder'],
    description: 'Place these in a ring to mark out a Garden.',
  },
  [RPG_BRICK_ITEM_ID]: {
    name: 'Brick',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'square',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'building_plot_wall', 'placeholder'],
    description: 'Place these in a ring around cleared sandy land to mark out a Building plot.',
  },
  [RPG_STONE_WALL_ITEM_ID]: {
    name: 'Stone Wall',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'square',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'pond_wall', 'placeholder'],
    description: 'Place these in a ring around dug water to build a Pond.',
  },
  [RPG_DOOR_ITEM_ID]: {
    name: 'Door',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'log-out',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'entrance', 'placeholder'],
    description: 'A walk-through entrance piece — confirms a perimeter is a Building plot. Valid in any structure ring.',
  },
  [RPG_ROPE_ITEM_ID]: {
    name: 'Rope',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'minus',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'entrance', 'placeholder'],
    description: 'A walk-through entrance piece — marks where you step into a Pond or Garden. Valid in any structure ring.',
  },
  [RPG_GATE_ITEM_ID]: {
    name: 'Gate',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'log-in',
    rarity: 'common',
    sourceLabel: 'Crafting',
    tags: ['structure_piece', 'entrance', 'placeholder'],
    description: 'A walk-through entrance piece. Valid in any structure ring (Pond/Garden/Building plot).',
  },
  blueprint_fertiliser_mixer: {
    name: 'Fertiliser Mixer Blueprint',
    kind: 'resource',
    featherIcon: 'file-text',
    rarity: 'uncommon',
    sourceLabel: 'Villager',
    tags: ['blueprint'],
    description: 'A one-of-a-kind find — plans for a Fertiliser Mixer station.',
  },
  blueprint_irrigation_bench: {
    name: 'Irrigation Bench Blueprint',
    kind: 'resource',
    featherIcon: 'file-text',
    rarity: 'uncommon',
    sourceLabel: 'Villager',
    tags: ['blueprint'],
    description: 'A one-of-a-kind find — plans for an Irrigation Bench station.',
  },
  blueprint_vendor_stall: {
    name: 'Vendor Stall Blueprint',
    kind: 'resource',
    featherIcon: 'file-text',
    rarity: 'uncommon',
    sourceLabel: 'Villager',
    tags: ['blueprint'],
    description: 'A one-of-a-kind find — plans for a Vendor Stall station.',
  },
  rpg_rock_vein: {
    name: 'Rock Vein',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    source: RPG_OBJECT_SOURCES.Cave_beige_rock2,
    rarity: 'common',
    sourceLabel: 'Sanctuary',
    tags: ['rock_vein'],
    description: 'A free, naturally-occurring rock. Mine it with a Pickaxe for Stone and Coal — respawns nightly, same as clutter.',
  },
  rpg_villager_brog: {
    name: 'Brog',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    featherIcon: 'user',
    rarity: 'common',
    sourceLabel: 'Sanctuary',
    tags: ['villager'],
    description: 'A burly orc who wanders the Sanctuary. Worth talking to.',
  },
  [RPG_CHEESE_ITEM_ID]: {
    name: 'Cheese',
    kind: 'resource',
    assetId: 'resource.cheese',
    iconAssetId: 'resource.cheese',
    source: RPG_RESOURCE_SOURCES.cheese,
    rarity: 'uncommon',
    sourceLabel: 'Artisan Goods',
    tags: ['food', 'artisan'],
    description: 'Processed milk that restores more stamina than raw ingredients.',
  },
  [RPG_MAYONNAISE_ITEM_ID]: {
    name: 'Mayonnaise',
    kind: 'resource',
    assetId: 'resource.mayonnaise',
    iconAssetId: 'resource.mayonnaise',
    source: RPG_RESOURCE_SOURCES.mayonnaise,
    rarity: 'uncommon',
    sourceLabel: 'Artisan Goods',
    tags: ['food', 'artisan'],
    description: 'A rich egg product made in a mayonnaise machine.',
  },
  [RPG_CLOTH_ITEM_ID]: {
    name: 'Cloth',
    kind: 'resource',
    assetId: 'resource.cloth',
    iconAssetId: 'resource.cloth',
    source: RPG_RESOURCE_SOURCES.cloth,
    rarity: 'uncommon',
    sourceLabel: 'Artisan Goods',
    tags: ['cloth', 'crafting', 'artisan', 'placeholder'],
    description: 'Processed wool for crafting and tailoring. Uses a fabric/thread-like candidate so it no longer shares raw wool art.',
  },
  [RPG_TURNIP_SEED_ITEM_ID]: {
    name: 'Turnip Seeds',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'common',
    sourceLabel: 'Crop Seeds',
    description: 'Spring crop seeds that grow into turnips.',
    crop: RPG_CROP_CATALOG[RPG_TURNIP_SEED_ITEM_ID],
  },
  [RPG_CABBAGE_SEED_ITEM_ID]: {
    name: 'Cabbage Seeds',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'common',
    sourceLabel: 'Crop Seeds',
    description: 'Spring and summer crop seeds that grow into cabbages.',
    crop: RPG_CROP_CATALOG[RPG_CABBAGE_SEED_ITEM_ID],
  },
  [RPG_PUMPKIN_SEED_ITEM_ID]: {
    name: 'Pumpkin Seeds',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'uncommon',
    sourceLabel: 'Crop Seeds',
    description: 'Autumn crop seeds that grow into pumpkins.',
    crop: RPG_CROP_CATALOG[RPG_PUMPKIN_SEED_ITEM_ID],
  },
  [RPG_TURNIP_ITEM_ID]: {
    name: 'Turnip',
    kind: 'resource',
    assetId: 'crop.turnipProduct',
    iconAssetId: 'crop.turnipProduct',
    source: RPG_RESOURCE_SOURCES.turnip,
    rarity: 'common',
    sourceLabel: 'Crops',
    tags: ['crop', 'food'],
    description: 'A crisp spring root vegetable.',
  },
  [RPG_CABBAGE_ITEM_ID]: {
    name: 'Cabbage',
    kind: 'resource',
    assetId: 'crop.cabbageProduct',
    iconAssetId: 'crop.cabbageProduct',
    source: RPG_RESOURCE_SOURCES.cabbage,
    rarity: 'common',
    sourceLabel: 'Crops',
    tags: ['crop', 'food'],
    description: 'A leafy crop harvested in spring or summer.',
  },
  [RPG_PUMPKIN_ITEM_ID]: {
    name: 'Pumpkin',
    kind: 'resource',
    assetId: 'crop.pumpkinProduct',
    iconAssetId: 'crop.pumpkinProduct',
    source: RPG_RESOURCE_SOURCES.pumpkin,
    rarity: 'uncommon',
    sourceLabel: 'Crops',
    tags: ['crop', 'food'],
    description: 'A hearty autumn crop.',
  },
  [RPG_CARP_ITEM_ID]: {
    name: 'Carp',
    kind: 'resource',
    assetId: 'resource.fish',
    iconAssetId: 'resource.fish',
    source: RPG_RESOURCE_SOURCES.fish,
    rarity: 'common',
    sourceLabel: 'Fishing',
    tags: ['fish', 'food'],
    description: 'A common freshwater fish.',
  },
  [RPG_CATFISH_ITEM_ID]: {
    name: 'Catfish',
    kind: 'resource',
    assetId: 'resource.fish',
    iconAssetId: 'resource.fish',
    source: RPG_RESOURCE_SOURCES.fish,
    rarity: 'rare',
    sourceLabel: 'Fishing',
    tags: ['fish', 'food'],
    description: 'A challenging freshwater catch.',
  },
  [RPG_PUFFERFISH_ITEM_ID]: {
    name: 'Pufferfish',
    kind: 'resource',
    assetId: 'resource.fish',
    iconAssetId: 'resource.fish',
    source: RPG_RESOURCE_SOURCES.fish,
    rarity: 'rare',
    sourceLabel: 'Fishing',
    tags: ['fish', 'food'],
    description: 'A rare summer beach fish.',
  },
  [RPG_SQUID_ITEM_ID]: {
    name: 'Squid',
    kind: 'resource',
    assetId: 'resource.squid',
    iconAssetId: 'resource.squid',
    source: RPG_RESOURCE_SOURCES.squid,
    rarity: 'uncommon',
    sourceLabel: 'Fishing',
    tags: ['fish', 'food', 'placeholder'],
    description: 'A winter night catch from the beach. Uses a tentacle-like candidate until dedicated squid art is verified.',
  },
  [RPG_SEAWEED_ITEM_ID]: {
    name: 'Seaweed',
    kind: 'resource',
    assetId: 'resource.seaweed',
    iconAssetId: 'resource.seaweed',
    source: RPG_RESOURCE_SOURCES.seaweed,
    rarity: 'common',
    sourceLabel: 'Fishing',
    tags: ['fishing', 'plant'],
    description: 'A common fishing bycatch.',
  },
  [RPG_TRASH_ITEM_ID]: {
    name: 'Trash',
    kind: 'resource',
    assetId: 'resource.trash',
    iconAssetId: 'resource.trash',
    source: RPG_RESOURCE_SOURCES.trash,
    rarity: 'common',
    sourceLabel: 'Fishing',
    tags: ['trash', 'recycle', 'placeholder'],
    description: 'Junk pulled from the water. Uses a bag-like candidate until dedicated fishing trash art is verified.',
  },
  [RPG_ANCIENT_SEED_PACK_ITEM_ID]: {
    name: 'Ancient Seed Pack',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'rare',
    sourceLabel: 'Museum',
    description: 'A rare seed packet awarded for museum progress.',
  },
  [RPG_AMETHYST_ITEM_ID]: {
    name: 'Amethyst',
    kind: 'resource',
    assetId: 'resource.amethyst',
    iconAssetId: 'resource.amethyst',
    source: RPG_OBJECT_SOURCES.Violet_crystal4,
    rarity: 'rare',
    sourceLabel: 'Geodes',
    tags: ['artifact', 'mineral', 'museum'],
    description: 'A purple variant of quartz.',
  },
  [RPG_RUBY_ITEM_ID]: {
    name: 'Ruby',
    kind: 'resource',
    assetId: 'resource.ruby',
    iconAssetId: 'resource.ruby',
    source: RPG_OBJECT_SOURCES.Red_crystal4,
    rarity: 'rare',
    sourceLabel: 'Geodes',
    tags: ['artifact', 'mineral', 'museum'],
    description: 'A precious stone with a rich red color.',
  },
  [RPG_DIAMOND_ITEM_ID]: {
    name: 'Diamond',
    kind: 'resource',
    assetId: 'resource.diamond',
    iconAssetId: 'resource.diamond',
    source: RPG_OBJECT_SOURCES.White_crystal4,
    rarity: 'epic',
    sourceLabel: 'Geodes',
    tags: ['artifact', 'mineral', 'museum'],
    description: 'A rare and valuable mineral from cracked geodes.',
  },
  [RPG_DWARVISH_HELM_ITEM_ID]: {
    name: 'Dwarvish Helm',
    kind: 'resource',
    assetId: 'resource.dwarvishHelm',
    iconAssetId: 'resource.dwarvishHelm',
    source: RPG_RESOURCE_SOURCES.dwarvishHelm,
    rarity: 'rare',
    sourceLabel: 'Farming Relic',
    tags: ['artifact', 'relic', 'museum', 'placeholder'],
    description: 'A worn helm commonly associated with old dwarven miners. Uses a helmet-like candidate instead of a temple chest.',
  },
  [RPG_ANCIENT_SEED_ITEM_ID]: {
    name: 'Ancient Seed',
    kind: 'resource',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'rare',
    sourceLabel: 'Relic',
    tags: ['artifact', 'relic', 'museum', 'seed'],
    description: 'A dry old seed from some ancient plant.',
  },
  [RPG_SALAD_ITEM_ID]: {
    name: 'Salad',
    kind: 'resource',
    assetId: 'resource.salad',
    iconAssetId: 'resource.salad',
    source: RPG_RESOURCE_SOURCES.salad,
    rarity: 'uncommon',
    sourceLabel: 'Cooking',
    tags: ['food', 'cooked'],
    description: 'A fresh cooked dish made from garden crops.',
  },
  [RPG_OMELET_ITEM_ID]: {
    name: 'Omelet',
    kind: 'resource',
    assetId: 'resource.omelet',
    iconAssetId: 'resource.omelet',
    source: RPG_RESOURCE_SOURCES.omelet,
    rarity: 'uncommon',
    sourceLabel: 'Cooking',
    tags: ['food', 'cooked', 'placeholder'],
    description: 'A warm cooked dish made with eggs and milk. Uses a cooked dish candidate until dedicated omelet art is verified.',
  },
  rpg_coin_mine: {
    name: 'Coin Mine (Test)',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 2,
    visHeight: 2,
    icon: RPG_TEMPLE_OBJECT_ASSETS.find(a => a.itemId === 'Temple_animated_chest')?.frame,
    animation: RPG_TEMPLE_OBJECT_ASSETS.find(a => a.itemId === 'Temple_animated_chest')?.animation,
    tags: ['coin_mine'],
    rarity: 'common',
    sourceLabel: 'Dev Tools',
    description: 'Temporary testing aid — interact for 200 coins, repeatable, no cooldown limit.',
    interactLoot: { claimKey: 'coin_mine', coins: 200, drops: [], repeatable: true },
  },
  rpg_materials_chest: {
    name: 'Materials Chest (Test)',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 2,
    visHeight: 2,
    icon: RPG_TEMPLE_OBJECT_ASSETS.find(a => a.itemId === 'Temple_animated_chest')?.frame,
    animation: RPG_TEMPLE_OBJECT_ASSETS.find(a => a.itemId === 'Temple_animated_chest')?.animation,
    tags: ['materials_chest'],
    rarity: 'common',
    sourceLabel: 'Dev Tools',
    description: 'Temporary testing aid — interact for 300 Wood/Stone/Mud/Stick/Metal/Coal, repeatable, no cooldown limit.',
    interactLoot: {
      claimKey: 'materials_chest',
      coins: 0,
      repeatable: true,
      drops: [
        { itemId: RPG_WOOD_ITEM_ID, chance: 1, min: 300, max: 300 },
        { itemId: RPG_STONE_ITEM_ID, chance: 1, min: 300, max: 300 },
        { itemId: RPG_MUD_ITEM_ID, chance: 1, min: 300, max: 300 },
        { itemId: RPG_STICK_ITEM_ID, chance: 1, min: 300, max: 300 },
        { itemId: RPG_METAL_ITEM_ID, chance: 1, min: 300, max: 300 },
        { itemId: 'rpg_coal', chance: 1, min: 300, max: 300 },
      ],
    },
  },
  rpg_clutter_weeds: {
    name: 'Wild Weeds',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    source: RPG_OBJECT_SOURCES.Fern1_3,
    tags: ['clutter', 'weed', 'plant', 'clearable'],
    rarity: 'common',
    sourceLabel: 'Sanctuary Clutter',
    description: 'Overgrown weeds blocking a small patch of sanctuary land. Clear them for leaves.',
  },
  rpg_clutter_twig: {
    name: 'Fallen Twigs',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    source: RPG_OBJECT_SOURCES.Broken_tree1,
    tags: ['clutter', 'twig', 'wood', 'clearable'],
    rarity: 'common',
    sourceLabel: 'Sanctuary Clutter',
    description: 'Loose branches cluttering the grass. Clear them for Wood.',
  },
  rpg_clutter_rock: {
    name: 'Loose Rock',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    source: RPG_OBJECT_SOURCES.Cave_beige_rock3,
    tags: ['clutter', 'rock', 'stone', 'clearable'],
    rarity: 'common',
    sourceLabel: 'Sanctuary Clutter',
    description: 'A small rock jutting out of the ground. Clear it for a chance at Crystal Shards.',
  },
  rpg_axe_basic: {
    name: 'Axe',
    kind: 'tool',
    featherIcon: 'tool',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Chop trees for wood.',
  },
  rpg_pickaxe_basic: {
    name: 'Pickaxe',
    kind: 'tool',
    featherIcon: 'triangle',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Mine Rock Veins for Stone and Coal.',
  },
  rpg_hoe_basic: {
    name: 'Hoe',
    kind: 'tool',
    featherIcon: 'grid',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Till soil so it can be planted.',
  },
  rpg_rake_basic: {
    name: 'Rake',
    kind: 'tool',
    featherIcon: 'menu',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Clears grass into sandy land — ring it with Brick to mark out a Building plot.',
  },
  rpg_shovel_basic: {
    name: 'Shovel',
    kind: 'tool',
    featherIcon: 'arrow-down-circle',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Dig grass into a river channel. Stepping into deep water sends you back to spawn.',
  },
  rpg_watering_can_basic: {
    name: 'Watering Can',
    kind: 'tool',
    featherIcon: 'droplet',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Water a crop in front of you.',
  },
  rpg_bridge_kit: {
    name: 'Bridge Kit',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    tags: ['terrain_edit', 'bridge'],
    rarity: 'common',
    sourceLabel: 'Sanctuary',
    description: 'Place on a river tile to bridge it (consumes 3 wood when placed).',
  },
  rpg_path_kit: {
    name: 'Path',
    kind: 'object',
    price: 0,
    colWidth: 1,
    colHeight: 1,
    visWidth: 1,
    visHeight: 1,
    tags: ['terrain_edit', 'path'],
    rarity: 'common',
    sourceLabel: 'Sanctuary',
    description: 'Place on grass or tilled soil to lay a walking path (consumes 1 wood when placed).',
  },
  White_tree1_seed: {
    name: 'White Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'uncommon',
    sourceLabel: 'Tree Drops',
    description: 'A pale seed from a White Tree.',
    crop: RPG_CROP_CATALOG.White_tree1_seed,
  },
  Curved_tree1_seed: {
    name: 'Curved Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'uncommon',
    sourceLabel: 'Tree Drops',
    description: 'A curled seed from a Curved Tree.',
    crop: RPG_CROP_CATALOG.Curved_tree1_seed,
  },
  Luminous_tree1_seed: {
    name: 'Luminous Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'rare',
    sourceLabel: 'Tree Drops',
    description: 'A faintly glowing seed from a Luminous Tree.',
    crop: RPG_CROP_CATALOG.Luminous_tree1_seed,
  },
  'Blue-green_balls_tree1_seed': {
    name: 'Blue-Green Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'uncommon',
    sourceLabel: 'Tree Drops',
    description: 'A bright seed from a Blue-Green Tree.',
    crop: RPG_CROP_CATALOG['Blue-green_balls_tree1_seed'],
  },
  Mega_tree1_seed: {
    name: 'Mega Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    source: RPG_RESOURCE_SOURCES.treeSeed,
    rarity: 'epic',
    sourceLabel: 'Tree Drops',
    description: 'A heavy seed from a Mega Tree.',
    crop: RPG_CROP_CATALOG.Mega_tree1_seed,
  },
  ...RPG_FOREST_OBJECT_CATALOG,
  ...RPG_CRYSTAL_OBJECT_CATALOG,
  ...RPG_BUSH_OBJECT_CATALOG,
  ...RPG_CAVE_OBJECT_CATALOG,
  ...RPG_TEMPLE_OBJECT_CATALOG,
  ...RPG_ANIMAL_OBJECT_CATALOG,
  ...Object.fromEntries(
    Object.entries(BUILDING_CATALOG)
      .filter(([, def]) => isBuildingShell(def) || isStation(def))
      .map(([id, def]) => [id, makeBuildingItem(def)]),
  ),
} satisfies Record<string, RpgItemDefinition>;

export const RPG_BUILDING_CATALOG: Record<string, RpgPlaceableItem> = Object.fromEntries(
  Object.entries(BUILDING_CATALOG)
    .filter(([, def]) => isBuildingShell(def) || isStation(def))
    .map(([id, def]) => [id, makeBuildingItem(def)]),
);

// TESTING (2026-06-30): every raw material/resource made directly
// purchasable, so they're not gated behind forage/mining/crafting while
// testing big buildings. Not real placeable objects — buying one just adds
// it straight to inventory (the existing purchase handler already does
// this generically), the 1x1 footprint fields are unused filler to satisfy
// the placeable type shape.
const RPG_MATERIAL_SHOP_CATALOG: Record<string, RpgPlaceableItem> = Object.fromEntries(
  (Object.entries(RPG_ITEM_CATALOG) as [string, RpgItemDefinition][])
    .filter(([, item]) => item.kind === 'resource')
    .map(([id, item]) => [id, {
      ...item,
      kind: 'object' as const,
      price: 0,
      colWidth: 1,
      colHeight: 1,
      visWidth: 1,
      visHeight: 1,
      tags: [...(item.tags ?? []), 'material'],
    }]),
);

const SHOP_CATALOG_BASE = {
  ...RPG_FOREST_OBJECT_CATALOG,
  ...RPG_CRYSTAL_OBJECT_CATALOG,
  ...RPG_BUSH_OBJECT_CATALOG,
  ...RPG_CAVE_OBJECT_CATALOG,
  ...RPG_TEMPLE_OBJECT_CATALOG,
  ...RPG_ANIMAL_OBJECT_CATALOG,
  ...RPG_BUILDING_CATALOG,
  ...RPG_MATERIAL_SHOP_CATALOG,
  rpg_coin_mine: RPG_ITEM_CATALOG.rpg_coin_mine,
  rpg_materials_chest: RPG_ITEM_CATALOG.rpg_materials_chest,
} satisfies Record<string, RpgPlaceableItem>;

// TESTING (2026-06-30): every Shop price zeroed. Set to false (or delete
// this wrapper, restoring SHOP_CATALOG_BASE directly) to bring real prices
// back before launch.
const TESTING_FREE_SHOP = true;
export const SHOP_CATALOG: Record<string, RpgPlaceableItem> = TESTING_FREE_SHOP
  ? Object.fromEntries(
      Object.entries(SHOP_CATALOG_BASE).map(([id, item]) => [id, { ...item, price: 0 }]),
    )
  : SHOP_CATALOG_BASE;

export type ShopCatalogItem = RpgPlaceableItem;

export function getRpgItem(itemId: string | null): RpgItemDefinition | null {
  if (!itemId) return null;
  return RPG_ITEM_CATALOG[itemId as keyof typeof RPG_ITEM_CATALOG] ?? null;
}

export function getCropForSeed(itemId: string | null): RpgCropDefinition | null {
  if (!itemId) return null;
  return RPG_CROP_CATALOG[itemId as keyof typeof RPG_CROP_CATALOG] ?? null;
}

const RESOURCE_SELL_PRICES: Record<string, number> = {
  [RPG_LEAVES_ITEM_ID]: 2,
  [RPG_FIBER_ITEM_ID]: 1,
  [RPG_HAY_ITEM_ID]: 1,
  [RPG_BAIT_ITEM_ID]: 2,
  [RPG_WOOD_ITEM_ID]: 3,
  [RPG_WOOD_PLANK_ITEM_ID]: 8,
  [RPG_STONE_ITEM_ID]: 2,
  [RPG_COAL_ITEM_ID]: 5,
  [RPG_COPPER_BAR_ITEM_ID]: 15,
  [RPG_IRON_BAR_ITEM_ID]: 25,
  [RPG_GOLD_BAR_ITEM_ID]: 60,
  [RPG_GEODE_ITEM_ID]: 20,
  [RPG_WATER_DROPS_ITEM_ID]: 4,
  [RPG_CRYSTAL_SHARDS_ITEM_ID]: 8,
  [RPG_EGG_ITEM_ID]: 15,
  [RPG_MILK_ITEM_ID]: 35,
  [RPG_WOOL_ITEM_ID]: 40,
  [RPG_TRUFFLE_ITEM_ID]: 80,
  [RPG_CHEESE_ITEM_ID]: 70,
  [RPG_MAYONNAISE_ITEM_ID]: 45,
  [RPG_CLOTH_ITEM_ID]: 90,
  [RPG_TURNIP_ITEM_ID]: 20,
  [RPG_CABBAGE_ITEM_ID]: 45,
  [RPG_PUMPKIN_ITEM_ID]: 100,
  [RPG_CARP_ITEM_ID]: 30,
  [RPG_CATFISH_ITEM_ID]: 200,
  [RPG_PUFFERFISH_ITEM_ID]: 250,
  [RPG_SQUID_ITEM_ID]: 150,
  [RPG_SEAWEED_ITEM_ID]: 5,
  [RPG_SALAD_ITEM_ID]: 100,
  [RPG_OMELET_ITEM_ID]: 120,
  [RPG_AMETHYST_ITEM_ID]: 100,
  [RPG_RUBY_ITEM_ID]: 250,
  [RPG_DIAMOND_ITEM_ID]: 750,
  [RPG_DWARVISH_HELM_ITEM_ID]: 100,
  [RPG_ANCIENT_SEED_ITEM_ID]: 50,
  [RPG_FERTILISER_ITEM_ID]: 10,
  [RPG_SPRINKLER_ITEM_ID]: 15,
};

export function getResourceSellPrice(itemId: string | null): number {
  if (!itemId) return 0;
  return RESOURCE_SELL_PRICES[itemId] ?? 0;
}

export function getPlaceableItem(itemId: string | null): RpgPlaceableItem | null {
  const item = getRpgItem(itemId);
  if (!item || item.kind !== 'object') return null;
  return item as RpgPlaceableItem;
}

export function getRpgArchiveEntries(): RpgArchiveEntry[] {
  const catalog = RPG_ITEM_CATALOG as Record<string, RpgItemDefinition>;
  return Object.entries(catalog)
    .map(([itemId, item]) => ({
      itemId,
      name: item.name,
      category: item.kind,
      assetId: item.assetId ?? null,
      iconAssetId: item.iconAssetId ?? item.assetId ?? null,
      description: item.description ?? 'No archive notes recorded yet.',
      rarity: item.rarity ?? 'common',
      sourceLabel: item.sourceLabel ?? 'Sanctuary',
      tags: item.tags ?? [],
      facts: getRpgItemFacts(item, catalog),
      unlockHint: item.kind === 'object'
        ? 'Buy or place this object to record it.'
        : item.kind === 'seed'
          ? 'Find this seed through sanctuary interactions.'
          : item.kind === 'tool'
            ? 'Granted automatically - equip it from the hotbar or character panel.'
            : 'Collect this resource to record it.',
    }))
    .sort((a, b) => (
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name)
    ));
}

function categoryRank(category: RpgArchiveCategory) {
  if (category === 'object') return 0;
  if (category === 'seed') return 1;
  return 2;
}

function getRpgItemFacts(item: RpgItemDefinition, catalog: Record<string, RpgItemDefinition>) {
  const facts: string[] = [`Source: ${item.sourceLabel ?? 'Sanctuary'}`];

  if (isPlaceableItemDefinition(item)) {
    facts.push(`Price: ${item.price}`);
    facts.push(`Footprint: ${item.colWidth}x${item.colHeight}`);
    if (item.tags?.includes('animal')) {
      const productDrops = item.forageDrops?.map(drop => formatDrop(drop, catalog)).join(', ') || 'none';
      facts.push(`Product: ${productDrops}`);
      facts.push('Cooldown: 30 sec after a successful collection');
      facts.push('Action: stand near it and press Interact');
    }
    if (item.tags?.includes('lever')) {
      facts.push('Mechanic: toggles nearby linked gates and traps');
    } else if (item.tags?.includes('gate')) {
      facts.push('Mechanic: blocks movement until opened by a lever');
    } else if (item.tags?.some(tag => tag === 'trap' || tag === 'hazard')) {
      facts.push('Mechanic: can be disarmed directly or by a lever');
    }
    if (item.forageDrops?.length) {
      facts.push(`Forage: ${item.forageDrops.map(drop => formatDrop(drop, catalog)).join(', ')}`);
    } else {
      facts.push('Forage: none');
    }
    if (item.interactLoot) {
      const frequency = item.interactLoot.repeatable ? 'repeatable' : 'once';
      facts.push(`Interact: ${frequency}, ${formatLoot(item.interactLoot, catalog)}`);
    }
  }

  if (item.kind === 'seed' && item.crop) {
    facts.push(`Crop: ${item.crop.name}`);
    facts.push(`Stages: sprout now, growing ${formatMinutes(item.crop.stageMinutes[1])}, mature ${formatMinutes(item.crop.stageMinutes[2])}`);
    facts.push(`Best seasons: ${formatSeasonList(item.crop.preferredSeasons)}`);
    facts.push('Water: Watering Can or streak rain can advance growth');
    facts.push(`Harvest: ${item.crop.harvest.coins} coins`);
    facts.push('Season: harvest includes a weather bonus; preferred seasons add extra yield');
    if (item.crop.harvest.drops.length) {
      facts.push(`Yield: ${item.crop.harvest.drops.map(drop => formatDrop(drop, catalog)).join(', ')}`);
    }
  }

  if (item.kind === 'resource' && item.tags?.length) {
    facts.push(`Tags: ${item.tags.join(', ')}`);
    if (item.tags.includes('animal_product')) {
      facts.push('Use: animal product resource for selling or future crafting');
      facts.push('Source: collect from placed livestock with Interact');
    }
    if (item.tags.includes('placeholder')) {
      facts.push('Art: labeled placeholder until final product art is verified');
    }
  }

  return facts;
}

function isPlaceableItemDefinition(item: RpgItemDefinition): item is RpgPlaceableItem {
  return item.kind === 'object' && 'price' in item;
}

function formatDrop(drop: RpgDrop, catalog: Record<string, RpgItemDefinition>) {
  const itemName = catalog[drop.itemId]?.name ?? drop.itemId;
  const amount = drop.min === drop.max ? `x${drop.min}` : `x${drop.min}-${drop.max}`;
  return `${Math.round(drop.chance * 100)}% ${itemName} ${amount}`;
}

function formatMinutes(minutes: number) {
  return minutes === 1 ? '1 min' : `${minutes} min`;
}

function formatSeasonList(seasons: RpgCropSeasonId[]) {
  return seasons.map(season => season.slice(0, 1).toUpperCase() + season.slice(1)).join(', ');
}

function formatLoot(loot: RpgInteractionLoot, catalog: Record<string, RpgItemDefinition>) {
  const rewards: string[] = [];
  if (loot.coins > 0) rewards.push(`${loot.coins} coins`);
  rewards.push(...loot.drops.map(drop => formatDrop(drop, catalog)));
  return rewards.join(', ');
}
