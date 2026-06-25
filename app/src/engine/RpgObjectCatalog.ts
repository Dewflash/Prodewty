import { RPG_WATER_DROPS_ITEM_ID } from './RpgItemIds';

export type RpgDrop = {
  itemId: string;
  chance: number;
  min: number;
  max: number;
};

export type RpgSpriteFrame = {
  source: any;
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
};

export type RpgInventoryItem = {
  name: string;
  kind: 'object' | 'resource' | 'seed';
  source?: any;
  icon?: RpgSpriteFrame;
  description?: string;
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
};

const RPG_UI_ICONS_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Icons.png');
const RPG_UI_INVENTORY_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Inventory.png');
const RPG_UI_SHOP_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Shop.png');

function rpgSpriteFrame(
  source: any,
  x: number,
  y: number,
  width: number,
  height: number,
  sheetWidth: number,
  sheetHeight: number,
): RpgSpriteFrame {
  return {
    source,
    x,
    y,
    width,
    height,
    sheetWidth,
    sheetHeight,
  };
}

function rpgUiIcon(row: number, col: number): RpgSpriteFrame {
  return rpgSpriteFrame(RPG_UI_ICONS_SHEET, col * 16, row * 16, 16, 16, 96, 304);
}

export const RPG_UI_FRAMES = {
  backpack: rpgUiIcon(0, 3),
  inventoryPanel: rpgSpriteFrame(RPG_UI_INVENTORY_SHEET, 224, 0, 112, 128, 336, 160),
  shopPanel: rpgSpriteFrame(RPG_UI_SHOP_SHEET, 384, 0, 128, 128, 512, 240),
  leaves: rpgUiIcon(5, 4),
  seed: rpgUiIcon(15, 3),
  waterDrop: rpgUiIcon(13, 3),
} satisfies Record<string, RpgSpriteFrame>;

const TREE_FORAGE_DROPS = (seedItemId: string): RpgDrop[] => [
  { itemId: seedItemId, chance: 0.18, min: 1, max: 1 },
  { itemId: 'rpg_leaves', chance: 0.72, min: 1, max: 2 },
];

function treeSeedCrop(seedItemId: string, name: string, coins: number): RpgCropDefinition {
  return {
    cropId: `${seedItemId}_crop`,
    name,
    seedItemId,
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
  White_tree1_seed: treeSeedCrop('White_tree1_seed', 'White Tree Sapling', 18),
  Curved_tree1_seed: treeSeedCrop('Curved_tree1_seed', 'Curved Tree Sapling', 22),
  Luminous_tree1_seed: treeSeedCrop('Luminous_tree1_seed', 'Luminous Tree Sapling', 34),
  'Blue-green_balls_tree1_seed': treeSeedCrop('Blue-green_balls_tree1_seed', 'Blue-Green Tree Sapling', 26),
  Mega_tree1_seed: treeSeedCrop('Mega_tree1_seed', 'Mega Tree Sapling', 55),
} satisfies Record<string, RpgCropDefinition>;

export const RPG_ITEM_CATALOG = {
  rpg_leaves: {
    name: 'Leaves',
    kind: 'resource',
    icon: RPG_UI_FRAMES.leaves,
    description: 'Soft crafting leaves gathered from sanctuary trees.',
  },
  [RPG_WATER_DROPS_ITEM_ID]: {
    name: 'Water Drops',
    kind: 'resource',
    icon: RPG_UI_FRAMES.waterDrop,
    description: 'Productivity energy used to help crops grow faster.',
  },
  White_tree1_seed: {
    name: 'White Tree Seed',
    kind: 'seed',
    icon: RPG_UI_FRAMES.seed,
    description: 'A pale seed from a White Tree.',
    crop: RPG_CROP_CATALOG.White_tree1_seed,
  },
  Curved_tree1_seed: {
    name: 'Curved Tree Seed',
    kind: 'seed',
    icon: RPG_UI_FRAMES.seed,
    description: 'A curled seed from a Curved Tree.',
    crop: RPG_CROP_CATALOG.Curved_tree1_seed,
  },
  Luminous_tree1_seed: {
    name: 'Luminous Tree Seed',
    kind: 'seed',
    icon: RPG_UI_FRAMES.seed,
    description: 'A faintly glowing seed from a Luminous Tree.',
    crop: RPG_CROP_CATALOG.Luminous_tree1_seed,
  },
  'Blue-green_balls_tree1_seed': {
    name: 'Blue-Green Tree Seed',
    kind: 'seed',
    icon: RPG_UI_FRAMES.seed,
    description: 'A bright seed from a Blue-Green Tree.',
    crop: RPG_CROP_CATALOG['Blue-green_balls_tree1_seed'],
  },
  Mega_tree1_seed: {
    name: 'Mega Tree Seed',
    kind: 'seed',
    icon: RPG_UI_FRAMES.seed,
    description: 'A heavy seed from a Mega Tree.',
    crop: RPG_CROP_CATALOG.Mega_tree1_seed,
  },
  White_tree1: {
    name: 'White Tree',
    kind: 'object',
    price: 100,
    colWidth: 1,
    colHeight: 1,
    visWidth: 3,
    visHeight: 3,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White_tree1.png'),
    forageDrops: TREE_FORAGE_DROPS('White_tree1_seed'),
  },
  Curved_tree1: {
    name: 'Curved Tree',
    kind: 'object',
    price: 150,
    colWidth: 1,
    colHeight: 1,
    visWidth: 3,
    visHeight: 3,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Curved_tree1.png'),
    forageDrops: TREE_FORAGE_DROPS('Curved_tree1_seed'),
  },
  Luminous_tree1: {
    name: 'Luminous Tree',
    kind: 'object',
    price: 300,
    colWidth: 1,
    colHeight: 1,
    visWidth: 3,
    visHeight: 3,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree1.png'),
    forageDrops: TREE_FORAGE_DROPS('Luminous_tree1_seed'),
  },
  'Living gazebo1': {
    name: 'Living Gazebo',
    kind: 'object',
    price: 500,
    colWidth: 2,
    colHeight: 2,
    visWidth: 3,
    visHeight: 3,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Living gazebo1.png'),
  },
  'Blue-green_balls_tree1': {
    name: 'Blue-Green Tree',
    kind: 'object',
    price: 200,
    colWidth: 1,
    colHeight: 1,
    visWidth: 3,
    visHeight: 3,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Blue-green_balls_tree1.png'),
    forageDrops: TREE_FORAGE_DROPS('Blue-green_balls_tree1_seed'),
  },
  Mega_tree1: {
    name: 'Mega Tree',
    kind: 'object',
    price: 1000,
    colWidth: 2,
    colHeight: 2,
    visWidth: 4,
    visHeight: 4,
    source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Mega_tree1.png'),
    forageDrops: TREE_FORAGE_DROPS('Mega_tree1_seed'),
  },
} satisfies Record<string, RpgItemDefinition>;

export const SHOP_CATALOG = {
  White_tree1: RPG_ITEM_CATALOG.White_tree1,
  Curved_tree1: RPG_ITEM_CATALOG.Curved_tree1,
  Luminous_tree1: RPG_ITEM_CATALOG.Luminous_tree1,
  'Living gazebo1': RPG_ITEM_CATALOG['Living gazebo1'],
  'Blue-green_balls_tree1': RPG_ITEM_CATALOG['Blue-green_balls_tree1'],
  Mega_tree1: RPG_ITEM_CATALOG.Mega_tree1,
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
