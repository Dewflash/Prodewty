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

// No bridge/plank asset exists in any sourced CraftPix pack — built from
// plain Views instead of a flat color fill, so it reads as wood at a glance.
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
