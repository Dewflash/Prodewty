import React from 'react';
import { Image, View } from 'react-native';
import { TILE_SIZE } from './MapData';

const WALLS_FLOOR_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png');
const WATER_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/Water_coasts_animation.png');

const SHEET_TILE_PX = 16;
const SCALE = TILE_SIZE / SHEET_TILE_PX;

export const FLOOR_TILE_COORD = { col: 1, row: 10 };
export const WALL_TILE_COORD = { col: 11, row: 20 };
export const WATER_TILE_COORD = { col: 0, row: 27 };

function sheetTile(source: any, widthTiles: number, heightTiles: number, col: number, row: number) {
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, overflow: 'hidden' }}>
      <Image
        source={source}
        style={{
          width: widthTiles * SHEET_TILE_PX * SCALE,
          height: heightTiles * SHEET_TILE_PX * SCALE,
          transform: [
            { translateX: -col * TILE_SIZE },
            { translateY: -row * TILE_SIZE },
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export function TilesetTile({ col, row }: { col: number; row: number }) {
  return sheetTile(WALLS_FLOOR_SHEET, 13, 23, col, row);
}

export function WaterTile() {
  return sheetTile(WATER_SHEET, 22, 28, WATER_TILE_COORD.col, WATER_TILE_COORD.row);
}

// No bridge/path/tilled field tile asset has been verified yet, so these are
// styled placeholders built from Views instead of flat debug colors.
export function BridgeTile() {
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#a9763f', overflow: 'hidden' }}>
      {[0.2, 0.5, 0.8].map(y => (
        <View
          key={y}
          style={{
            position: 'absolute',
            top: y * TILE_SIZE - 1,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#7a5328',
          }}
        />
      ))}
      <View style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 2, backgroundColor: '#8a5f30' }} />
      <View style={{ position: 'absolute', right: 2, top: 0, bottom: 0, width: 2, backgroundColor: '#8a5f30' }} />
    </View>
  );
}

export function PathTile() {
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#b88c52', overflow: 'hidden' }}>
      {Array.from({ length: 10 }).map((_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: (index * 11) % TILE_SIZE,
            top: (index * 7) % TILE_SIZE,
            width: 3 + (index % 3),
            height: 2,
            borderRadius: 2,
            backgroundColor: index % 2 === 0 ? '#d2aa69' : '#8c6336',
            opacity: 0.72,
          }}
        />
      ))}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: 'rgba(255,242,187,0.18)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(45,28,16,0.32)' }} />
    </View>
  );
}

export function TilledTile() {
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#604126', overflow: 'hidden' }}>
      {[0.2, 0.42, 0.64, 0.86].map(y => (
        <View
          key={y}
          style={{
            position: 'absolute',
            left: 3,
            right: 3,
            top: y * TILE_SIZE,
            height: 2,
            borderRadius: 2,
            backgroundColor: '#8a6139',
          }}
        />
      ))}
      {[0.3, 0.68].map(x => (
        <View
          key={x}
          style={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: x * TILE_SIZE,
            width: 1,
            backgroundColor: 'rgba(34,20,12,0.38)',
          }}
        />
      ))}
    </View>
  );
}
