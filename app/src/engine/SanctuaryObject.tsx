import React from 'react';
import { View, Image } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue, withTiming } from 'react-native-reanimated';
import { TILE_SIZE } from './MapData';
import { SHOP_CATALOG } from './SanctuaryShop';

interface Props {
  type: string;
  row: number;
  col: number;
  avatarX: SharedValue<number>;
  avatarY: SharedValue<number>;
}

export function SanctuaryObject({ type, row, col, avatarX, avatarY }: Props) {
  const catalogItem = SHOP_CATALOG[type as keyof typeof SHOP_CATALOG];
  const source = catalogItem?.source || require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White_tree1.png');

  const colWidth = catalogItem?.colWidth || 1;
  const colHeight = catalogItem?.colHeight || 1;
  const visWidth = catalogItem?.visWidth || 2;
  const visHeight = catalogItem?.visHeight || 2;

  const width = visWidth * TILE_SIZE;
  const height = visHeight * TILE_SIZE;

  // Physical collision box geometry
  const centerX = (col + colWidth / 2) * TILE_SIZE;
  const bottomY = (row + colHeight) * TILE_SIZE;

  // Visually anchor the image so its bottom-center aligns with the bottom-center of the collision box.
  const left = centerX - (width / 2);
  const top = bottomY - height;

  // X-Ray Phase-Out Logic
  const animatedStyle = useAnimatedStyle(() => {
    // Determine if Avatar is standing "behind" this object's canopy
    const treeCenterX = left + width / 2;
    // Avatar is roughly 64x64, center is avatarX + 32
    const avatarCenterX = avatarX.value + (TILE_SIZE / 2);
    const dx = Math.abs(avatarCenterX - treeCenterX);

    // Is the avatar's feet (avatarY + 64) higher than the tree's feet (row * 64)?
    const avatarFeetY = avatarY.value + TILE_SIZE;
    const treeFeetY = (row * TILE_SIZE) + TILE_SIZE;
    const dy = treeFeetY - avatarFeetY;

    // If Avatar is horizontally within the canopy, and vertically behind the trunk but covered by the canopy height
    const isBehind = dx < (width / 2) && dy > 0 && dy < height;

    return {
      opacity: withTiming(isBehind ? 0.4 : 1, { duration: 150 }),
    };
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left,
          top,
          width,
          height,
          // 2.5D Z-Index Illusion: zIndex is identical to the Grid Row!
          zIndex: row,
        }
      ]}
    >
      <Image
        source={source}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
