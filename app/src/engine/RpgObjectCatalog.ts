import { RPG_WATER_DROPS_ITEM_ID } from './RpgItemIds';
import {
  RPG_CROP_STAGE_FRAMES,
  RPG_FOREST_OBJECT_ASSETS,
  RPG_OBJECT_SOURCES,
  RPG_UI_FRAMES,
  type RpgForestObjectAsset,
  type RpgSpriteFrame,
} from './RpgAssetRegistry';

export { RPG_UI_FRAMES };
export type { RpgSpriteFrame };

export type RpgDrop = {
  itemId: string;
  chance: number;
  min: number;
  max: number;
};

export type RpgItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export type RpgInventoryItem = {
  name: string;
  kind: 'object' | 'resource' | 'seed';
  assetId?: string;
  iconAssetId?: string;
  source?: any;
  icon?: RpgSpriteFrame;
  tags?: string[];
  description?: string;
  rarity?: RpgItemRarity;
  sourceLabel?: string;
  crop?: RpgCropDefinition;
};

export type RpgPlaceableItem = RpgInventoryItem & {
  kind: 'object';
  price: number;
  colWidth: number;
  colHeight: number;
  visWidth: number;
  visHeight: number;
  forageDrops?: RpgDrop[];
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

export type RpgArchiveCategory = 'object' | 'seed' | 'resource';

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
};

const TREE_FORAGE_DROPS = (seedItemId: string): RpgDrop[] => [
  { itemId: seedItemId, chance: 0.18, min: 1, max: 1 },
  { itemId: 'rpg_leaves', chance: 0.72, min: 1, max: 2 },
];
const LEAF_FORAGE_DROPS: RpgDrop[] = [
  { itemId: 'rpg_leaves', chance: 0.78, min: 1, max: 2 },
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

function forestObjectDescription(asset: RpgForestObjectAsset) {
  if (asset.tags.includes('mushroom')) return `${asset.name} from the forest object archive. Mostly decorative for now.`;
  if (asset.tags.includes('idol')) return `${asset.name} for future shrine, relic, and sanctuary progression systems.`;
  if (asset.tags.includes('ent')) return `${asset.name} for future animated forest guardian encounters.`;
  if (asset.tags.includes('structure')) return `${asset.name} for future rest, crafting, or visitor mechanics.`;
  if (asset.tags.includes('tree')) return `${asset.name} with a walk-blocking base and sanctuary forage hooks.`;
  return `${asset.name} from the forest object archive.`;
}

function forestObjectPrice(asset: RpgForestObjectAsset) {
  if (asset.tags.includes('large')) return 900;
  if (asset.tags.includes('idol')) return 650;
  if (asset.tags.includes('ent')) return 700;
  if (asset.tags.includes('structure')) return 500;
  if (asset.tags.includes('mushroom')) return asset.pixelWidth >= 128 ? 120 : 60;
  if (asset.tags.includes('tree')) return asset.pixelWidth >= 128 ? 220 : 120;
  return 100;
}

function forestObjectRarity(asset: RpgForestObjectAsset): RpgItemRarity {
  if (asset.itemId === 'Mega_tree1' || asset.itemId === 'Tree_idol_dragon') return 'epic';
  if (asset.tags.includes('large') || asset.tags.includes('idol') || asset.tags.includes('ent')) return 'rare';
  if (asset.tags.includes('structure') || asset.pixelWidth >= 128) return 'uncommon';
  return 'common';
}

function forestObjectFootprint(asset: RpgForestObjectAsset) {
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

function makeForestObjectItem(asset: RpgForestObjectAsset): RpgPlaceableItem {
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
} satisfies Record<string, RpgItemDefinition>;

export const SHOP_CATALOG = {
  ...RPG_FOREST_OBJECT_CATALOG,
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
      unlockHint: item.kind === 'object'
        ? 'Buy or place this object to record it.'
        : item.kind === 'seed'
          ? 'Find this seed through sanctuary interactions.'
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
