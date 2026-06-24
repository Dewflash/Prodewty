export const GameAssets = {
  // Trees - Growth stages
  tree_basic: {
    0: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree3.png'), // Seed/Small
    1: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree2.png'), // Medium
    2: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree1.png'), // Large
  },
  tree_autumn: {
    0: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Autumn_tree3.png'),
    1: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Autumn_tree2.png'),
    2: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Autumn_tree1.png'),
  },
  tree_snow: {
    0: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Snow_tree3.png'),
    1: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Snow_tree2.png'),
    2: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Snow_tree1.png'),
  },
  tree_flower: {
    0: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Flower_tree3.png'),
    1: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Flower_tree2.png'),
    2: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Flower_tree1.png'),
  },
  tree_fruit: {
    0: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Fruit_tree3.png'),
    1: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Fruit_tree2.png'),
    2: require('../../assets/game/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Fruit_tree1.png'),
  },
  
  // Backgrounds
  // Scene "1" in this pack only ships 3 parallax layers (not 5 like scenes 2/4).
  bg_winter: [
    require('../../assets/game/craftpix-net-346185-free-winter-nature-pixel-game-backgrounds/1/1.png'),
    require('../../assets/game/craftpix-net-346185-free-winter-nature-pixel-game-backgrounds/1/2.png'),
    require('../../assets/game/craftpix-net-346185-free-winter-nature-pixel-game-backgrounds/1/3.png'),
  ],
  
  // Icons
  icon_seed: null, // Placeholder since we don't have exact icon path yet
};

export type GameAssetKey = keyof typeof GameAssets;

export function getGardenAsset(itemId: string, stage: number) {
  const assetGroup = GameAssets[itemId as keyof typeof GameAssets];
  if (!assetGroup) return null;
  // @ts-ignore
  return assetGroup[Math.min(stage, 2)] || assetGroup[0];
}
