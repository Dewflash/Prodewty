import { RPG_CRYSTAL_SHARDS_ITEM_ID, RPG_WATER_DROPS_ITEM_ID, RPG_WOOD_ITEM_ID } from './RpgItemIds';
import {
  RPG_BUSH_OBJECT_ASSETS,
  RPG_CAVE_OBJECT_ASSETS,
  RPG_CRYSTAL_OBJECT_ASSETS,
  RPG_CROP_STAGE_FRAMES,
  RPG_FOREST_OBJECT_ASSETS,
  RPG_OBJECT_SOURCES,
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
export type RpgSourcePackId = 'all' | 'forest' | 'crystal' | 'bush' | 'cave' | 'temple';

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

export type RpgCropDefinition = {
  cropId: string;
  name: string;
  seedItemId: string;
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
): RpgCropDefinition {
  return {
    cropId: `${seedItemId}_crop`,
    name,
    seedItemId,
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
  White_tree1_seed: treeSeedCrop('White_tree1_seed', 'White Tree Sapling', 18, RPG_CROP_STAGE_FRAMES.whiteTree),
  Curved_tree1_seed: treeSeedCrop('Curved_tree1_seed', 'Curved Tree Sapling', 22, RPG_CROP_STAGE_FRAMES.curvedTree),
  Luminous_tree1_seed: treeSeedCrop('Luminous_tree1_seed', 'Luminous Tree Sapling', 34, RPG_CROP_STAGE_FRAMES.luminousTree),
  'Blue-green_balls_tree1_seed': treeSeedCrop('Blue-green_balls_tree1_seed', 'Blue-Green Tree Sapling', 26, RPG_CROP_STAGE_FRAMES.blueGreenTree),
  Mega_tree1_seed: treeSeedCrop('Mega_tree1_seed', 'Mega Tree Sapling', 55, RPG_CROP_STAGE_FRAMES.megaTree),
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

export const RPG_ITEM_CATALOG = {
  rpg_leaves: {
    name: 'Leaves',
    kind: 'resource',
    assetId: 'resource.leaves',
    iconAssetId: 'resource.leaves',
    icon: RPG_UI_FRAMES.leaves,
    rarity: 'common',
    sourceLabel: 'Tree Drops',
    description: 'Soft crafting leaves gathered from sanctuary trees.',
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
    source: RPG_OBJECT_SOURCES.Broken_tree1,
    rarity: 'common',
    sourceLabel: 'Tree Drops',
    tags: ['wood', 'crafting'],
    description: 'Sturdy timber chopped from sanctuary trees.',
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
  rpg_tool_shovel: {
    name: 'Shovel',
    kind: 'tool',
    toolId: 'shovel',
    featherIcon: 'tool',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Dig a patch of grass into a river (5 coins per dig).',
  },
  rpg_tool_bridge: {
    name: 'Bridge Kit',
    kind: 'tool',
    toolId: 'bridge',
    featherIcon: 'link',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Lay a bridge across a river tile (3 wood per bridge).',
  },
  rpg_tool_path: {
    name: 'Path Layer',
    kind: 'tool',
    toolId: 'path',
    featherIcon: 'minus',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Lay a walking path on grass or tilled soil (1 wood per tile).',
  },
  rpg_tool_plow: {
    name: 'Plow',
    kind: 'tool',
    toolId: 'plow',
    featherIcon: 'grid',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Till grass into soil ready for planting. Free.',
  },
  rpg_tool_watering_can: {
    name: 'Watering Can',
    kind: 'tool',
    toolId: 'watering',
    featherIcon: 'droplet',
    rarity: 'common',
    sourceLabel: 'Tools',
    description: 'Water a crop in front of you. Uses energy and one Water Drop when it speeds growth.',
  },
  White_tree1_seed: {
    name: 'White Tree Seed',
    kind: 'seed',
    assetId: 'seed.treeGeneric',
    iconAssetId: 'seed.treeGeneric',
    icon: RPG_UI_FRAMES.seed,
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
    icon: RPG_UI_FRAMES.seed,
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
    icon: RPG_UI_FRAMES.seed,
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
    icon: RPG_UI_FRAMES.seed,
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
    icon: RPG_UI_FRAMES.seed,
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
} satisfies Record<string, RpgItemDefinition>;

export const SHOP_CATALOG = {
  ...RPG_FOREST_OBJECT_CATALOG,
  ...RPG_CRYSTAL_OBJECT_CATALOG,
  ...RPG_BUSH_OBJECT_CATALOG,
  ...RPG_CAVE_OBJECT_CATALOG,
  ...RPG_TEMPLE_OBJECT_CATALOG,
  rpg_coin_mine: RPG_ITEM_CATALOG.rpg_coin_mine,
} satisfies Record<string, RpgPlaceableItem>;

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
  rpg_leaves: 2,
  [RPG_WOOD_ITEM_ID]: 3,
  [RPG_WATER_DROPS_ITEM_ID]: 4,
  [RPG_CRYSTAL_SHARDS_ITEM_ID]: 8,
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
            ? 'Granted automatically — equip it from the Backpack.'
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
    facts.push(`Harvest: ${item.crop.harvest.coins} coins`);
    facts.push(`Mature: ${item.crop.stageMinutes[2]} min`);
    if (item.crop.harvest.drops.length) {
      facts.push(`Yield: ${item.crop.harvest.drops.map(drop => formatDrop(drop, catalog)).join(', ')}`);
    }
  }

  if (item.kind === 'resource' && item.tags?.length) {
    facts.push(`Tags: ${item.tags.join(', ')}`);
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

function formatLoot(loot: RpgInteractionLoot, catalog: Record<string, RpgItemDefinition>) {
  const rewards: string[] = [];
  if (loot.coins > 0) rewards.push(`${loot.coins} coins`);
  rewards.push(...loot.drops.map(drop => formatDrop(drop, catalog)));
  return rewards.join(', ');
}
