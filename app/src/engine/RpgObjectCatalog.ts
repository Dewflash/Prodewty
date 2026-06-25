export type RpgDrop = {
  itemId: string;
  chance: number;
  min: number;
  max: number;
};

export type RpgInventoryItem = {
  name: string;
  kind: 'object' | 'resource' | 'seed';
  source?: any;
  description?: string;
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

const LEAVES_ICON = require('../../assets/game/craftpix-net-994534-free-basic-pixel-art-fantasy-icons-16x16-for-ui/PNG/Separately/Icon95_1.png');
const SEED_ICON = require('../../assets/game/craftpix-net-994534-free-basic-pixel-art-fantasy-icons-16x16-for-ui/PNG/Separately/Icon77_1.png');

const TREE_FORAGE_DROPS = (seedItemId: string): RpgDrop[] => [
  { itemId: seedItemId, chance: 0.18, min: 1, max: 1 },
  { itemId: 'rpg_leaves', chance: 0.72, min: 1, max: 2 },
];

export const RPG_ITEM_CATALOG = {
  rpg_leaves: {
    name: 'Leaves',
    kind: 'resource',
    source: LEAVES_ICON,
    description: 'Soft crafting leaves gathered from sanctuary trees.',
  },
  White_tree1_seed: {
    name: 'White Tree Seed',
    kind: 'seed',
    source: SEED_ICON,
    description: 'A pale seed from a White Tree.',
  },
  Curved_tree1_seed: {
    name: 'Curved Tree Seed',
    kind: 'seed',
    source: SEED_ICON,
    description: 'A curled seed from a Curved Tree.',
  },
  Luminous_tree1_seed: {
    name: 'Luminous Tree Seed',
    kind: 'seed',
    source: SEED_ICON,
    description: 'A faintly glowing seed from a Luminous Tree.',
  },
  'Blue-green_balls_tree1_seed': {
    name: 'Blue-Green Tree Seed',
    kind: 'seed',
    source: SEED_ICON,
    description: 'A bright seed from a Blue-Green Tree.',
  },
  Mega_tree1_seed: {
    name: 'Mega Tree Seed',
    kind: 'seed',
    source: SEED_ICON,
    description: 'A heavy seed from a Mega Tree.',
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

export function getPlaceableItem(itemId: string | null): RpgPlaceableItem | null {
  const item = getRpgItem(itemId);
  if (!item || item.kind !== 'object') return null;
  return item as RpgPlaceableItem;
}
