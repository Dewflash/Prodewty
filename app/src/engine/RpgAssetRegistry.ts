export type RpgSpriteFrame = {
  source: any;
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
};

export type RpgAssetCategory = 'ui' | 'archive' | 'object' | 'resource' | 'seed' | 'crop';

export type RpgAssetDefinition = {
  id: string;
  name: string;
  category: RpgAssetCategory;
  verified: boolean;
  frame?: RpgSpriteFrame;
  source?: any;
  tags?: string[];
  note?: string;
};

export type RpgObjectAsset = {
  itemId: string;
  assetId: string;
  name: string;
  source: any;
  pixelWidth: number;
  pixelHeight: number;
  tags: string[];
};

export type RpgForestObjectAsset = RpgObjectAsset;

const RPG_UI_ICONS_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Icons.png');
const RPG_UI_INVENTORY_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Inventory.png');
const RPG_UI_SHOP_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Shop.png');
const RPG_ARCHIVE_BOOK_SHEET = require('../../assets/craftpix-net-809047-free-animated-magic-book-pixel-art-asset-pack/PNG/Open_book.png');
const RPG_FARM_PLANTS_SHEET = require('../../assets/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Plants.png');
const RPG_FARM_SUPPLIES_SHEET = require('../../assets/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Supplies.png');

export const RPG_FOREST_OBJECT_ASSETS = [
  { itemId: 'Beige_green_mushroom1', assetId: 'object.Beige_green_mushroom1', name: 'Beige-Green Mushroom Cluster', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Beige_green_mushroom1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['mushroom', 'forest', 'large'] },
  { itemId: 'Beige_green_mushroom2', assetId: 'object.Beige_green_mushroom2', name: 'Beige-Green Mushroom', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Beige_green_mushroom2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['mushroom', 'forest'] },
  { itemId: 'Beige_green_mushroom3', assetId: 'object.Beige_green_mushroom3', name: 'Small Beige-Green Mushroom', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Beige_green_mushroom3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['mushroom', 'forest', 'small'] },
  { itemId: 'Blue-green_balls_tree1', assetId: 'object.Blue_green_balls_tree1', name: 'Blue-Green Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Blue-green_balls_tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Blue-green_balls_tree2', assetId: 'object.Blue_green_balls_tree2', name: 'Young Blue-Green Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Blue-green_balls_tree2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Blue-green_balls_tree3', assetId: 'object.Blue_green_balls_tree3', name: 'Blue-Green Sapling', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Blue-green_balls_tree3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Chanterelles1', assetId: 'object.Chanterelles1', name: 'Chanterelles', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Chanterelles1.png'), pixelWidth: 32, pixelHeight: 32, tags: ['mushroom', 'forest', 'small'] },
  { itemId: 'Chanterelles2', assetId: 'object.Chanterelles2', name: 'Golden Chanterelles', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Chanterelles2.png'), pixelWidth: 32, pixelHeight: 32, tags: ['mushroom', 'forest', 'small'] },
  { itemId: 'Chanterelles3', assetId: 'object.Chanterelles3', name: 'Tiny Chanterelles', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Chanterelles3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['mushroom', 'forest', 'small'] },
  { itemId: 'Curved_tree1', assetId: 'object.Curved_tree1', name: 'Curved Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Curved_tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Curved_tree2', assetId: 'object.Curved_tree2', name: 'Curved Forest Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Curved_tree2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Curved_tree3', assetId: 'object.Curved_tree3', name: 'Young Curved Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Curved_tree3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Ent_man', assetId: 'object.Ent_man', name: 'Ent Guardian', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Ent_man.png'), pixelWidth: 128, pixelHeight: 128, tags: ['ent', 'forest', 'statue'] },
  { itemId: 'Ent_woman', assetId: 'object.Ent_woman', name: 'Ent Keeper', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Ent_woman.png'), pixelWidth: 128, pixelHeight: 128, tags: ['ent', 'forest', 'statue'] },
  { itemId: 'Light_balls_tree1', assetId: 'object.Light_balls_tree1', name: 'Light-Ball Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Light_balls_tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Light_balls_tree2', assetId: 'object.Light_balls_tree2', name: 'Lantern Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Light_balls_tree2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Light_balls_tree3', assetId: 'object.Light_balls_tree3', name: 'Young Light-Ball Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Light_balls_tree3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Living gazebo1', assetId: 'object.Living_gazebo1', name: 'Living Gazebo', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Living gazebo1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['structure', 'forest'] },
  { itemId: 'Living gazebo2', assetId: 'object.Living_gazebo2', name: 'Living Gazebo Alcove', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Living gazebo2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['structure', 'forest'] },
  { itemId: 'Luminous_tree1', assetId: 'object.Luminous_tree1', name: 'Luminous Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Luminous_tree2', assetId: 'object.Luminous_tree2', name: 'Luminous Bloom Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Luminous_tree3', assetId: 'object.Luminous_tree3', name: 'Young Luminous Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Luminous_tree4', assetId: 'object.Luminous_tree4', name: 'Luminous Sapling', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree4.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Mega_tree1', assetId: 'object.Mega_tree1', name: 'Mega Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Mega_tree1.png'), pixelWidth: 256, pixelHeight: 256, tags: ['tree', 'forest', 'forage', 'large'] },
  { itemId: 'Mega_tree2', assetId: 'object.Mega_tree2', name: 'Mega Tree Crown', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Mega_tree2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Swirling tree1', assetId: 'object.Swirling_tree1', name: 'Swirling Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Swirling tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Swirling tree2', assetId: 'object.Swirling_tree2', name: 'Swirling Forest Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Swirling tree2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Swirling tree3', assetId: 'object.Swirling_tree3', name: 'Young Swirling Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Swirling tree3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Tree_idol_deer', assetId: 'object.Tree_idol_deer', name: 'Deer Tree Idol', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Tree_idol_deer.png'), pixelWidth: 128, pixelHeight: 128, tags: ['idol', 'forest', 'structure'] },
  { itemId: 'Tree_idol_dragon', assetId: 'object.Tree_idol_dragon', name: 'Dragon Tree Idol', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Tree_idol_dragon.png'), pixelWidth: 256, pixelHeight: 256, tags: ['idol', 'forest', 'structure', 'large'] },
  { itemId: 'Tree_idol_human', assetId: 'object.Tree_idol_human', name: 'Human Tree Idol', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Tree_idol_human.png'), pixelWidth: 128, pixelHeight: 128, tags: ['idol', 'forest', 'structure'] },
  { itemId: 'Tree_idol_wolf', assetId: 'object.Tree_idol_wolf', name: 'Wolf Tree Idol', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Tree_idol_wolf.png'), pixelWidth: 128, pixelHeight: 128, tags: ['idol', 'forest', 'structure'] },
  { itemId: 'White-red_mushroom1', assetId: 'object.White_red_mushroom1', name: 'White-Red Mushroom Cluster', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White-red_mushroom1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['mushroom', 'forest', 'large'] },
  { itemId: 'White-red_mushroom2', assetId: 'object.White_red_mushroom2', name: 'White-Red Mushroom', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White-red_mushroom2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['mushroom', 'forest'] },
  { itemId: 'White-red_mushroom3', assetId: 'object.White_red_mushroom3', name: 'Small White-Red Mushroom', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White-red_mushroom3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['mushroom', 'forest', 'small'] },
  { itemId: 'White_tree1', assetId: 'object.White_tree1', name: 'White Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White_tree1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'White_tree2', assetId: 'object.White_tree2', name: 'Young White Tree', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White_tree2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
  { itemId: 'Willow1', assetId: 'object.Willow1', name: 'Willow', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Willow1.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Willow2', assetId: 'object.Willow2', name: 'Wide Willow', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Willow2.png'), pixelWidth: 128, pixelHeight: 128, tags: ['tree', 'forest', 'forage'] },
  { itemId: 'Willow3', assetId: 'object.Willow3', name: 'Young Willow', source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Willow3.png'), pixelWidth: 64, pixelHeight: 64, tags: ['tree', 'forest', 'forage', 'small'] },
] satisfies readonly RpgForestObjectAsset[];

export const RPG_CRYSTAL_OBJECT_ASSETS = [
  { itemId: 'Black_crystal1', assetId: 'object.crystal.Black_crystal1', name: 'Black Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Black_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'black', 'cave', 'large'] },
  { itemId: 'Black_crystal2', assetId: 'object.crystal.Black_crystal2', name: 'Black Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Black_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'black', 'cave', 'large'] },
  { itemId: 'Black_crystal3', assetId: 'object.crystal.Black_crystal3', name: 'Black Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Black_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'black', 'cave', 'small'] },
  { itemId: 'Black_crystal4', assetId: 'object.crystal.Black_crystal4', name: 'Black Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Black_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'black', 'cave', 'tiny'] },
  { itemId: 'Blue_crystal1', assetId: 'object.crystal.Blue_crystal1', name: 'Blue Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Blue_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'blue', 'cave', 'large'] },
  { itemId: 'Blue_crystal2', assetId: 'object.crystal.Blue_crystal2', name: 'Blue Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Blue_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'blue', 'cave', 'large'] },
  { itemId: 'Blue_crystal3', assetId: 'object.crystal.Blue_crystal3', name: 'Blue Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Blue_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'blue', 'cave', 'small'] },
  { itemId: 'Blue_crystal4', assetId: 'object.crystal.Blue_crystal4', name: 'Blue Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Blue_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'blue', 'cave', 'tiny'] },
  { itemId: 'Dark_red_crystal1', assetId: 'object.crystal.Dark_red_crystal1', name: 'Dark-Red Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Dark_red_ crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'red', 'dark', 'cave', 'large'] },
  { itemId: 'Dark_red_crystal2', assetId: 'object.crystal.Dark_red_crystal2', name: 'Dark-Red Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Dark_red_ crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'red', 'dark', 'cave', 'large'] },
  { itemId: 'Dark_red_crystal3', assetId: 'object.crystal.Dark_red_crystal3', name: 'Dark-Red Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Dark_red_ crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'red', 'dark', 'cave', 'small'] },
  { itemId: 'Dark_red_crystal4', assetId: 'object.crystal.Dark_red_crystal4', name: 'Dark-Red Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Dark_red_ crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'red', 'dark', 'cave', 'tiny'] },
  { itemId: 'Green_crystal1', assetId: 'object.crystal.Green_crystal1', name: 'Green Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Green_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'green', 'cave', 'large'] },
  { itemId: 'Green_crystal2', assetId: 'object.crystal.Green_crystal2', name: 'Green Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Green_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'green', 'cave', 'large'] },
  { itemId: 'Green_crystal3', assetId: 'object.crystal.Green_crystal3', name: 'Green Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Green_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'green', 'cave', 'small'] },
  { itemId: 'Green_crystal4', assetId: 'object.crystal.Green_crystal4', name: 'Green Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Green_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'green', 'cave', 'tiny'] },
  { itemId: 'Pink_crystal1', assetId: 'object.crystal.Pink_crystal1', name: 'Pink Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Pink_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'pink', 'cave', 'large'] },
  { itemId: 'Pink_crystal2', assetId: 'object.crystal.Pink_crystal2', name: 'Pink Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Pink_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'pink', 'cave', 'large'] },
  { itemId: 'Pink_crystal3', assetId: 'object.crystal.Pink_crystal3', name: 'Pink Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Pink_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'pink', 'cave', 'small'] },
  { itemId: 'Pink_crystal4', assetId: 'object.crystal.Pink_crystal4', name: 'Pink Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Pink_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'pink', 'cave', 'tiny'] },
  { itemId: 'Red_crystal1', assetId: 'object.crystal.Red_crystal1', name: 'Red Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Red_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'red', 'cave', 'large'] },
  { itemId: 'Red_crystal2', assetId: 'object.crystal.Red_crystal2', name: 'Red Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Red_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'red', 'cave', 'large'] },
  { itemId: 'Red_crystal3', assetId: 'object.crystal.Red_crystal3', name: 'Red Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Red_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'red', 'cave', 'small'] },
  { itemId: 'Red_crystal4', assetId: 'object.crystal.Red_crystal4', name: 'Red Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Red_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'red', 'cave', 'tiny'] },
  { itemId: 'Violet_crystal1', assetId: 'object.crystal.Violet_crystal1', name: 'Violet Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Violet_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'violet', 'cave', 'large'] },
  { itemId: 'Violet_crystal2', assetId: 'object.crystal.Violet_crystal2', name: 'Violet Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Violet_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'violet', 'cave', 'large'] },
  { itemId: 'Violet_crystal3', assetId: 'object.crystal.Violet_crystal3', name: 'Violet Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Violet_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'violet', 'cave', 'small'] },
  { itemId: 'Violet_crystal4', assetId: 'object.crystal.Violet_crystal4', name: 'Violet Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Violet_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'violet', 'cave', 'tiny'] },
  { itemId: 'White_crystal1', assetId: 'object.crystal.White_crystal1', name: 'White Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/White_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'white', 'cave', 'large'] },
  { itemId: 'White_crystal2', assetId: 'object.crystal.White_crystal2', name: 'White Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/White_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'white', 'cave', 'large'] },
  { itemId: 'White_crystal3', assetId: 'object.crystal.White_crystal3', name: 'White Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/White_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'white', 'cave', 'small'] },
  { itemId: 'White_crystal4', assetId: 'object.crystal.White_crystal4', name: 'White Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/White_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'white', 'cave', 'tiny'] },
  { itemId: 'Yellow_green_crystal1', assetId: 'object.crystal.Yellow_green_crystal1', name: 'Yellow-Green Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow-green_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'yellow-green', 'cave', 'large'] },
  { itemId: 'Yellow_green_crystal2', assetId: 'object.crystal.Yellow_green_crystal2', name: 'Yellow-Green Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow-green_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'yellow-green', 'cave', 'large'] },
  { itemId: 'Yellow_green_crystal3', assetId: 'object.crystal.Yellow_green_crystal3', name: 'Yellow-Green Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow-green_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'yellow-green', 'cave', 'small'] },
  { itemId: 'Yellow_green_crystal4', assetId: 'object.crystal.Yellow_green_crystal4', name: 'Yellow-Green Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow-green_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'yellow-green', 'cave', 'tiny'] },
  { itemId: 'Yellow_crystal1', assetId: 'object.crystal.Yellow_crystal1', name: 'Yellow Crystal Cluster', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow_crystal1.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'yellow', 'cave', 'large'] },
  { itemId: 'Yellow_crystal2', assetId: 'object.crystal.Yellow_crystal2', name: 'Yellow Crystal Spire', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow_crystal2.png'), pixelWidth: 64, pixelHeight: 64, tags: ['crystal', 'yellow', 'cave', 'large'] },
  { itemId: 'Yellow_crystal3', assetId: 'object.crystal.Yellow_crystal3', name: 'Yellow Crystal', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow_crystal3.png'), pixelWidth: 32, pixelHeight: 32, tags: ['crystal', 'yellow', 'cave', 'small'] },
  { itemId: 'Yellow_crystal4', assetId: 'object.crystal.Yellow_crystal4', name: 'Yellow Crystal Shard', source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Yellow_crystal4.png'), pixelWidth: 16, pixelHeight: 16, tags: ['crystal', 'yellow', 'cave', 'tiny'] },
] satisfies readonly RpgObjectAsset[];

export function rpgSpriteFrame(
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

function rpgBookFrame(row: number, col: number): RpgSpriteFrame {
  return rpgSpriteFrame(RPG_ARCHIVE_BOOK_SHEET, col * 272, row * 272, 272, 272, 1088, 816);
}

function rpgFarmPlant(row: number, col: number): RpgSpriteFrame {
  return rpgSpriteFrame(RPG_FARM_PLANTS_SHEET, col * 48, row * 48, 48, 48, 768, 432);
}

function rpgFarmSupply(row: number, col: number): RpgSpriteFrame {
  return rpgSpriteFrame(RPG_FARM_SUPPLIES_SHEET, col * 32, row * 32, 32, 32, 288, 224);
}

export const RPG_UI_FRAMES = {
  backpack: rpgUiIcon(0, 3),
  inventoryPanel: rpgSpriteFrame(RPG_UI_INVENTORY_SHEET, 224, 0, 112, 128, 336, 160),
  shopPanel: rpgSpriteFrame(RPG_UI_SHOP_SHEET, 384, 0, 128, 128, 512, 240),
  leaves: rpgFarmSupply(6, 1),
  seed: rpgFarmSupply(1, 1),
  waterDrop: rpgUiIcon(13, 3),
} satisfies Record<string, RpgSpriteFrame>;

export const RPG_FARM_FRAMES = {
  whiteTreeSprout: rpgFarmPlant(8, 0),
  whiteTreeYoung: rpgFarmPlant(0, 9),
  whiteTreeMature: rpgFarmPlant(0, 12),
  curvedTreeSprout: rpgFarmPlant(8, 1),
  curvedTreeYoung: rpgFarmPlant(1, 9),
  curvedTreeMature: rpgFarmPlant(1, 12),
  luminousTreeSprout: rpgFarmPlant(8, 3),
  luminousTreeYoung: rpgFarmPlant(2, 11),
  luminousTreeMature: rpgFarmPlant(2, 15),
  blueGreenTreeSprout: rpgFarmPlant(7, 8),
  blueGreenTreeYoung: rpgFarmPlant(3, 12),
  blueGreenTreeMature: rpgFarmPlant(3, 15),
  megaTreeSprout: rpgFarmPlant(7, 11),
  megaTreeYoung: rpgFarmPlant(5, 12),
  megaTreeMature: rpgFarmPlant(5, 15),
} satisfies Record<string, RpgSpriteFrame>;

export const RPG_ARCHIVE_FRAMES = {
  closedBook: rpgBookFrame(0, 0),
  openBook: rpgBookFrame(2, 3),
} satisfies Record<string, RpgSpriteFrame>;

export const RPG_CROP_STAGE_FRAMES = {
  whiteTree: {
    0: RPG_FARM_FRAMES.whiteTreeSprout,
    1: RPG_FARM_FRAMES.whiteTreeYoung,
    2: RPG_FARM_FRAMES.whiteTreeMature,
  },
  curvedTree: {
    0: RPG_FARM_FRAMES.curvedTreeSprout,
    1: RPG_FARM_FRAMES.curvedTreeYoung,
    2: RPG_FARM_FRAMES.curvedTreeMature,
  },
  luminousTree: {
    0: RPG_FARM_FRAMES.luminousTreeSprout,
    1: RPG_FARM_FRAMES.luminousTreeYoung,
    2: RPG_FARM_FRAMES.luminousTreeMature,
  },
  blueGreenTree: {
    0: RPG_FARM_FRAMES.blueGreenTreeSprout,
    1: RPG_FARM_FRAMES.blueGreenTreeYoung,
    2: RPG_FARM_FRAMES.blueGreenTreeMature,
  },
  megaTree: {
    0: RPG_FARM_FRAMES.megaTreeSprout,
    1: RPG_FARM_FRAMES.megaTreeYoung,
    2: RPG_FARM_FRAMES.megaTreeMature,
  },
} satisfies Record<string, Record<0 | 1 | 2, RpgSpriteFrame>>;

export const RPG_OBJECT_SOURCES = Object.fromEntries(
  [...RPG_FOREST_OBJECT_ASSETS, ...RPG_CRYSTAL_OBJECT_ASSETS].map(asset => [asset.itemId, asset.source]),
) as Record<string, any>;

const RPG_OBJECT_REGISTRY = Object.fromEntries(
  [...RPG_FOREST_OBJECT_ASSETS, ...RPG_CRYSTAL_OBJECT_ASSETS].map(asset => [asset.assetId, {
    id: asset.assetId,
    name: asset.name,
    category: 'object',
    verified: true,
    source: asset.source,
    tags: asset.tags,
  } satisfies RpgAssetDefinition]),
);

export const RPG_ASSET_REGISTRY = {
  'ui.backpack': {
    id: 'ui.backpack',
    name: 'Backpack Icon',
    category: 'ui',
    verified: true,
    frame: RPG_UI_FRAMES.backpack,
    tags: ['hud', 'inventory'],
  },
  'ui.inventoryPanel': {
    id: 'ui.inventoryPanel',
    name: 'Inventory Panel',
    category: 'ui',
    verified: true,
    frame: RPG_UI_FRAMES.inventoryPanel,
    tags: ['panel', 'inventory'],
  },
  'ui.shopPanel': {
    id: 'ui.shopPanel',
    name: 'Shop Panel',
    category: 'ui',
    verified: true,
    frame: RPG_UI_FRAMES.shopPanel,
    tags: ['panel', 'shop'],
  },
  'archive.closedBook': {
    id: 'archive.closedBook',
    name: 'Closed Archive Book',
    category: 'archive',
    verified: true,
    frame: RPG_ARCHIVE_FRAMES.closedBook,
    tags: ['codex', 'book'],
  },
  'archive.openBook': {
    id: 'archive.openBook',
    name: 'Open Archive Book',
    category: 'archive',
    verified: true,
    frame: RPG_ARCHIVE_FRAMES.openBook,
    tags: ['codex', 'book', 'panel'],
  },
  'crop.whiteTree': {
    id: 'crop.whiteTree',
    name: 'White Tree Crop Stages',
    category: 'crop',
    verified: true,
    frame: RPG_CROP_STAGE_FRAMES.whiteTree[2],
    tags: ['crop', 'tree'],
    note: 'Uses curated farm plant frames for visible in-world growth stages.',
  },
  'crop.curvedTree': {
    id: 'crop.curvedTree',
    name: 'Curved Tree Crop Stages',
    category: 'crop',
    verified: true,
    frame: RPG_CROP_STAGE_FRAMES.curvedTree[2],
    tags: ['crop', 'tree'],
    note: 'Uses curated farm plant frames for visible in-world growth stages.',
  },
  'crop.luminousTree': {
    id: 'crop.luminousTree',
    name: 'Luminous Tree Crop Stages',
    category: 'crop',
    verified: true,
    frame: RPG_CROP_STAGE_FRAMES.luminousTree[2],
    tags: ['crop', 'tree'],
    note: 'Uses curated farm plant frames for visible in-world growth stages.',
  },
  'crop.blueGreenTree': {
    id: 'crop.blueGreenTree',
    name: 'Blue-Green Tree Crop Stages',
    category: 'crop',
    verified: true,
    frame: RPG_CROP_STAGE_FRAMES.blueGreenTree[2],
    tags: ['crop', 'tree'],
    note: 'Uses curated farm plant frames for visible in-world growth stages.',
  },
  'crop.megaTree': {
    id: 'crop.megaTree',
    name: 'Mega Tree Crop Stages',
    category: 'crop',
    verified: true,
    frame: RPG_CROP_STAGE_FRAMES.megaTree[2],
    tags: ['crop', 'tree'],
    note: 'Uses curated farm plant frames for visible in-world growth stages.',
  },
  'resource.leaves': {
    id: 'resource.leaves',
    name: 'Leaves',
    category: 'resource',
    verified: true,
    frame: RPG_UI_FRAMES.leaves,
    tags: ['drop', 'tree'],
  },
  'resource.waterDrop': {
    id: 'resource.waterDrop',
    name: 'Water Drop',
    category: 'resource',
    verified: true,
    frame: RPG_UI_FRAMES.waterDrop,
    tags: ['energy', 'farming'],
  },
  'resource.crystalShards': {
    id: 'resource.crystalShards',
    name: 'Crystal Shards',
    category: 'resource',
    verified: true,
    source: require('../../assets/game/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets/Blue_crystal4.png'),
    tags: ['drop', 'crystal', 'crafting'],
  },
  'seed.treeGeneric': {
    id: 'seed.treeGeneric',
    name: 'Tree Seed Marker',
    category: 'seed',
    verified: true,
    frame: RPG_UI_FRAMES.seed,
    tags: ['seed', 'placeholder'],
    note: 'Visible farm supply seed packet used until tree-specific seed art is curated.',
  },
  ...RPG_OBJECT_REGISTRY,
} satisfies Record<string, RpgAssetDefinition>;

export function getRpgAsset(assetId: string | null | undefined): RpgAssetDefinition | null {
  if (!assetId) return null;
  return RPG_ASSET_REGISTRY[assetId as keyof typeof RPG_ASSET_REGISTRY] ?? null;
}
