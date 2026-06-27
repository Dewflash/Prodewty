import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { getResponsiveTileSize } from '../../engine/MapData';

const GRID_ROWS = 20;
const GRID_COLS = 20;

export type GridObject = {
  id: number;
  row: number;
  col: number;
  type: string;
  category: 'building' | 'resource' | 'farm_plot';
  label: string;
  isWatered?: boolean;
};

function objectColor(obj: GridObject) {
  if (obj.category === 'building') return colors.primary;
  if (obj.category === 'resource') return colors.danger;
  if (obj.category === 'farm_plot') return obj.isWatered ? '#3b82f6' : '#8B4513';
  return colors.card;
}

export const RpgGrid = React.memo(function RpgGrid({ objects, onTilePress }: { objects: GridObject[], onTilePress: (row: number, col: number, obj?: GridObject) => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = getResponsiveTileSize(windowWidth);
  const gridWidth = GRID_COLS * tileSize;
  const gridHeight = GRID_ROWS * tileSize;

  const backgroundTiles = useMemo(() => (
    Array.from({ length: GRID_ROWS }).flatMap((_, r) =>
      Array.from({ length: GRID_COLS }).map((__, c) => (
        <View
          key={`${r}-${c}`}
          style={[
            styles.tile,
            {
              top: r * tileSize,
              left: c * tileSize,
              width: tileSize,
              height: tileSize,
            },
          ]}
          pointerEvents="none"
        />
      ))
    )
  ), [tileSize]);

  const renderBackground = () => (
    <Pressable
      style={[
        styles.gridBackground,
        { width: gridWidth, height: gridHeight },
      ]}
      onPress={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(locationX / tileSize)));
        const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(locationY / tileSize)));
        onTilePress(row, col);
      }}
    >
      {backgroundTiles}
    </Pressable>
  );

  const renderObjects = () => (
    objects.map(obj => {
      return (
        <Pressable
          key={`${obj.category}-${obj.id}`}
          accessibilityRole="button"
          accessibilityLabel={obj.label}
          style={[
            styles.gridObject,
            {
              top: obj.row * tileSize,
              left: obj.col * tileSize,
              width: tileSize,
              height: tileSize,
              backgroundColor: objectColor(obj),
            },
          ]}
          onPress={() => onTilePress(obj.row, obj.col, obj)}
        >
          <Text style={styles.objectLabel} numberOfLines={1} adjustsFontSizeToFit>{obj.label.substring(0, 1)}</Text>
        </Pressable>
      );
    })
  );

  return (
    <ScrollView horizontal bounces={false}>
      <ScrollView bounces={false}>
        <View style={[styles.gridContainer, { width: gridWidth, height: gridHeight }]}>
          {renderBackground()}
          {renderObjects()}
        </View>
      </ScrollView>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  gridContainer: {
    backgroundColor: '#4ade80', // Grass background
    position: 'relative',
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tile: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridObject: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  objectLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
