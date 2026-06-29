import React from 'react';
import { Image, View } from 'react-native';
import { TILE_SIZE } from './MapData';

const WALLS_FLOOR_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png');
const WATER_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/Water_coasts_animation.png');

const SHEET_TILE_PX = 16;

export const FLOOR_TILE_COORD = { col: 1, row: 10 };
export const WALL_TILE_COORD = { col: 11, row: 20 };
export const WATER_TILE_COORD = { col: 0, row: 27 };

function sheetTile(source: any, widthTiles: number, heightTiles: number, col: number, row: number, tileSize: number) {
  const scale = tileSize / SHEET_TILE_PX;
  return (
    <View style={{ width: tileSize, height: tileSize, overflow: 'hidden' }}>
      <Image
        source={source}
        style={{
          width: widthTiles * SHEET_TILE_PX * scale,
          height: heightTiles * SHEET_TILE_PX * scale,
          transform: [
            { translateX: -col * tileSize },
            { translateY: -row * tileSize },
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export function TilesetTile({ col, row, tileSize = TILE_SIZE }: { col: number; row: number; tileSize?: number }) {
  return sheetTile(WALLS_FLOOR_SHEET, 13, 23, col, row, tileSize);
}

export function WaterTile({ tileSize = TILE_SIZE }: { tileSize?: number }) {
  return sheetTile(WATER_SHEET, 22, 28, WATER_TILE_COORD.col, WATER_TILE_COORD.row, tileSize);
}

// Path/Tilled soil/Bridge have no matching ground art anywhere in the
// project's asset packs (checked 2026-06-29/30) — they render as honest
// flat colors via rpg.tsx's getTileColor() fallback instead of borrowing
// mismatched art from the temple-ruins set.
