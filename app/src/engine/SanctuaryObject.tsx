import React from 'react';
import { Image, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, type SharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TILE_SIZE } from './MapData';
import { SHOP_CATALOG } from './SanctuaryShop';

interface Props {
  id: number;
  type: string;
  row: number;
  col: number;
  avatarX: SharedValue<number>;
  avatarY: SharedValue<number>;
  isEditing?: boolean;
  onMoveRequest?: (id: number) => void;
}

const AVATAR_SIZE = 64;

export function SanctuaryObject({ id, type, row, col, avatarX, avatarY, isEditing = false, onMoveRequest }: Props) {
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

  const animatedStyle = useAnimatedStyle(() => {
    const treeCenterX = left + width / 2;
    const avatarCenterX = avatarX.value + (AVATAR_SIZE / 2);
    const dx = Math.abs(avatarCenterX - treeCenterX);

    const avatarFeetY = avatarY.value + AVATAR_SIZE;
    const treeFeetY = (row + colHeight) * TILE_SIZE;
    const dy = treeFeetY - avatarFeetY;

    const isBehind = dx < (width / 2) && dy > 0 && dy < height;

    return {
      opacity: withTiming(isBehind ? 0.4 : 1, { duration: 150 }),
    };
  });

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      if (onMoveRequest) runOnJS(onMoveRequest)(id);
    });

  return (
    <GestureDetector gesture={longPress}>
      <Animated.View
        style={[
          animatedStyle,
          {
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: row + colHeight,
          }
        ]}
      >
        {isEditing && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (col * TILE_SIZE) - left,
              top: (row * TILE_SIZE) - top,
              width: colWidth * TILE_SIZE,
              height: colHeight * TILE_SIZE,
              borderWidth: 2,
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255,255,255,0.16)',
              zIndex: 2,
            }}
          />
        )}
        <Image
          source={source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}
