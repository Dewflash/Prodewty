import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TILE_SIZE, TileType } from './MapData';
import { getPlaceableItem } from './RpgObjectCatalog';
import { RpgItemWorldArt } from './RpgItemIcon';
import { isSanctuaryPlaceholderObject, SanctuaryPlaceholderObjectArt } from './SanctuaryPlaceholderObjectArt';

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
  groundType?: TileType;
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
  groundType = TileType.GRASS,
  tileSize = TILE_SIZE,
  onMoveRequest,
}: Props) {
  const catalogItem = getPlaceableItem(type);

  const colWidth = catalogItem?.colWidth || 1;
  const colHeight = catalogItem?.colHeight || 1;
  const visWidth = catalogItem?.visWidth || 2;
  const visHeight = catalogItem?.visHeight || 2;
  const isLivestockObject = !!catalogItem?.tags?.includes('animal') && catalogItem.tags.includes('livestock');
  const usePlaceholderWorldArt = isSanctuaryPlaceholderObject(catalogItem);

  const width = visWidth * tileSize;
  const height = visHeight * tileSize;
  const footprintWidth = colWidth * tileSize;
  const footprintHeight = colHeight * tileSize;
  const footprintLeft = (width - footprintWidth) / 2;
  const terrainGroundingStyle = getTerrainGroundingStyle(groundType);

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
        <View
          pointerEvents="none"
          style={[
            styles.groundingFootprint,
            {
              left: footprintLeft,
              bottom: 0,
              width: footprintWidth,
              height: footprintHeight,
            },
            (colWidth > 1 || colHeight > 1) && styles.groundingFootprintLarge,
            terrainGroundingStyle,
            isLivestockObject && styles.groundingFootprintLivestock,
            isTargeted && styles.groundingFootprintTargeted,
            mechanicState && styles.groundingFootprintMechanic,
          ]}
        />
        {isLivestockObject && (
          <View
            pointerEvents="none"
            style={[
              styles.livestockCareCue,
              {
                left: footprintLeft + Math.max(2, footprintWidth * 0.14),
                bottom: Math.max(2, footprintHeight * 0.08),
                width: Math.max(18, footprintWidth * 0.72),
              },
            ]}
          >
            <View style={styles.livestockCareStraw} />
            <View style={styles.livestockCareStrawShort} />
            <View style={styles.livestockCareDotRow}>
              <View style={styles.livestockCareDot} />
              <View style={styles.livestockCareDot} />
              <View style={styles.livestockCareDot} />
            </View>
          </View>
        )}
        {usePlaceholderWorldArt && catalogItem ? (
          <SanctuaryPlaceholderObjectArt
            item={catalogItem}
            width={width}
            height={height}
            mechanicState={mechanicState}
          />
        ) : (
          <RpgItemWorldArt item={catalogItem} width={width} height={height} fallbackLabel={type} />
        )}
      </Animated.View>
    </GestureDetector>
  );
});

function getTerrainGroundingStyle(type: TileType) {
  switch (type) {
    case TileType.TILLED:
    case TileType.WET_SOIL:
      return styles.groundingFootprintSoil;
    case TileType.DITCH:
    case TileType.WATER:
      return styles.groundingFootprintWet;
    case TileType.SAND:
      return styles.groundingFootprintSand;
    case TileType.STONE_SLAB:
      return styles.groundingFootprintStone;
    case TileType.WOOD_TILE:
    case TileType.BRIDGE:
      return styles.groundingFootprintWood;
    case TileType.PATH:
      return styles.groundingFootprintPath;
    default:
      return styles.groundingFootprintGrass;
  }
}

const styles = StyleSheet.create({
  groundingFootprint: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: 'rgba(33,24,14,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.12)',
    transform: [{ scaleY: 0.72 }],
  },
  groundingFootprintGrass: {
    backgroundColor: 'rgba(30,54,27,0.24)',
    borderColor: 'rgba(126,189,101,0.18)',
  },
  groundingFootprintSoil: {
    backgroundColor: 'rgba(50,33,22,0.34)',
    borderColor: 'rgba(138,99,64,0.28)',
  },
  groundingFootprintWet: {
    backgroundColor: 'rgba(29,57,68,0.3)',
    borderColor: 'rgba(130,199,221,0.28)',
  },
  groundingFootprintSand: {
    backgroundColor: 'rgba(122,91,42,0.24)',
    borderColor: 'rgba(241,219,164,0.24)',
  },
  groundingFootprintStone: {
    backgroundColor: 'rgba(51,56,58,0.3)',
    borderColor: 'rgba(174,180,183,0.22)',
  },
  groundingFootprintWood: {
    backgroundColor: 'rgba(75,45,19,0.3)',
    borderColor: 'rgba(204,152,88,0.24)',
  },
  groundingFootprintPath: {
    backgroundColor: 'rgba(99,74,40,0.25)',
    borderColor: 'rgba(216,189,133,0.2)',
  },
  groundingFootprintLarge: {
    borderWidth: 2,
    opacity: 0.95,
  },
  groundingFootprintLivestock: {
    backgroundColor: 'rgba(92,63,30,0.26)',
    borderColor: 'rgba(241,196,15,0.28)',
  },
  groundingFootprintTargeted: {
    backgroundColor: 'rgba(255,242,187,0.18)',
    borderColor: 'rgba(255,242,187,0.42)',
  },
  groundingFootprintMechanic: {
    backgroundColor: 'rgba(53,255,112,0.14)',
    borderColor: 'rgba(126,217,87,0.32)',
  },
  livestockCareCue: {
    position: 'absolute',
    minHeight: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(74,50,23,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.24)',
    justifyContent: 'center',
    paddingHorizontal: 3,
    gap: 1,
  },
  livestockCareStraw: {
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,224,112,0.52)',
  },
  livestockCareStrawShort: {
    width: '68%',
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,224,112,0.42)',
  },
  livestockCareDotRow: {
    flexDirection: 'row',
    gap: 2,
  },
  livestockCareDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,242,187,0.5)',
  },
});
