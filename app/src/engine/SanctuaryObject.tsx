import React, { useEffect } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue, withTiming } from 'react-native-reanimated';
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
  mechanicState?: 'open_gate' | 'disabled_trap' | null;
  tileSize?: number;
  onMoveRequest?: (id: number) => void;
}

const AVATAR_SIZE = 64;

export const SanctuaryObject = React.memo(function SanctuaryObject({
  id,
  type,
  row,
  col,
  avatarX,
  avatarY,
  isInteracting = false,
  isTargeted = false,
  mechanicState = null,
  tileSize = TILE_SIZE,
  onMoveRequest,
}: Props) {
  const catalogItem = getPlaceableItem(type);

  const colWidth = catalogItem?.colWidth || 1;
  const colHeight = catalogItem?.colHeight || 1;
  const visWidth = catalogItem?.visWidth || 2;
  const visHeight = catalogItem?.visHeight || 2;

  const width = visWidth * tileSize;
  const height = visHeight * tileSize;

  // Physical collision box geometry
  const centerX = (col + colWidth / 2) * tileSize;
  const bottomY = (row + colHeight) * tileSize;

  // Visually anchor the image so its bottom-center aligns with the bottom-center of the collision box.
  const left = centerX - (width / 2);
  const top = bottomY - height;

  const isInteractingShared = useSharedValue(isInteracting);
  const isTargetedShared = useSharedValue(isTargeted);
  const mechanicStateShared = useSharedValue(mechanicState);

  useEffect(() => {
    isInteractingShared.value = isInteracting;
  }, [isInteracting]);

  useEffect(() => {
    isTargetedShared.value = isTargeted;
  }, [isTargeted]);

  useEffect(() => {
    mechanicStateShared.value = mechanicState;
  }, [mechanicState]);

  const animatedStyle = useAnimatedStyle(() => {
    const treeCenterX = left + width / 2;
    const avatarCenterX = avatarX.value + (AVATAR_SIZE / 2);
    const dx = Math.abs(avatarCenterX - treeCenterX);

    const avatarFeetY = avatarY.value + AVATAR_SIZE;
    const treeFeetY = (row + colHeight) * tileSize;
    const dy = treeFeetY - avatarFeetY;

    const isBehind = dx < (width / 2) && dy > 0 && dy < height;

    const mechanic = mechanicStateShared.value;
    const baseOpacity = mechanic === 'open_gate' ? 0.38 : mechanic === 'disabled_trap' ? 0.58 : 1;

    return {
      opacity: withTiming(isBehind ? Math.min(baseOpacity, 0.4) : baseOpacity, { duration: 150 }),
      transform: [
        {
          scale: withTiming(
            isInteractingShared.value ? 1.08 : isTargetedShared.value ? 1.03 : 1,
            { duration: 120 }
          ),
        },
      ],
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
            backgroundColor: mechanicState ? 'rgba(53, 255, 112, 0.12)' : 'transparent',
          }
        ]}
      >
        <RpgItemWorldArt item={catalogItem} width={width} height={height} fallbackLabel={type} />
      </Animated.View>
    </GestureDetector>
  );
});
