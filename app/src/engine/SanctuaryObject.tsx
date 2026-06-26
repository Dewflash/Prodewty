import React from 'react';
import Animated, { runOnJS, useAnimatedStyle, type SharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TILE_SIZE } from './MapData';
import { getPlaceableItem } from './RpgObjectCatalog';
import { RpgItemWorldArt } from './RpgItemIcon';

interface Props {
  id: number;
  type: string;
  row: number;
  col: number;
  avatarX: SharedValue<number>;
  avatarY: SharedValue<number>;
  isInteracting?: boolean;
  isTargeted?: boolean;
  onMoveRequest?: (id: number) => void;
}

const AVATAR_SIZE = 64;

export function SanctuaryObject({
  id,
  type,
  row,
  col,
  avatarX,
  avatarY,
  isInteracting = false,
  isTargeted = false,
  onMoveRequest,
}: Props) {
  const catalogItem = getPlaceableItem(type);

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
      transform: [{ scale: withTiming(isInteracting ? 1.08 : isTargeted ? 1.03 : 1, { duration: 120 }) }],
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
            borderWidth: isTargeted ? 2 : 0,
            borderColor: isTargeted ? 'rgba(255,242,187,0.82)' : 'transparent',
            borderRadius: isTargeted ? 6 : 0,
          }
        ]}
      >
        <RpgItemWorldArt item={catalogItem} width={width} height={height} fallbackLabel={type} />
      </Animated.View>
    </GestureDetector>
  );
}
