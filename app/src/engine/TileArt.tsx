import React from 'react';
import { Image, View } from 'react-native';
import { TILE_SIZE } from './MapData';

const WALLS_FLOOR_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png');
const WATER_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/Water_coasts_animation.png');
const TEMPLE_EXTERIOR_TILES_SHEET = require('../../assets/game/craftpix-net-160005-free-ruined-temple-top-down-location-pixel-art/PNG/Tiles_exterior.png');

const SHEET_TILE_PX = 16;
const TEMPLE_EXTERIOR_SHEET = { width: 432, height: 256 };

export const FLOOR_TILE_COORD = { col: 1, row: 10 };
export const WALL_TILE_COORD = { col: 11, row: 20 };
export const WATER_TILE_COORD = { col: 0, row: 27 };
export const BRIDGE_TILE_FRAME = { x: 352, y: 0, width: 32, height: 32 };
export const PATH_TILE_FRAME = { x: 224, y: 32, width: 32, height: 32 };
export const TILLED_TILE_FRAME = { x: 176, y: 128, width: 32, height: 32 };

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

function frameTile(source: any, sheet: { width: number; height: number }, frame: { x: number; y: number; width: number; height: number }, tileSize: number = TILE_SIZE) {
  const scale = Math.max(tileSize / frame.width, tileSize / frame.height);
  return (
    <View style={{ width: tileSize, height: tileSize, overflow: 'hidden' }}>
      <Image
        source={source}
        style={{
          width: sheet.width * scale,
          height: sheet.height * scale,
          transform: [
            { translateX: -frame.x * scale },
            { translateY: -frame.y * scale },
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

// These use tracked terrain frames instead of hand-drawn debug View fills.
// Tilled soil is still candidate ground art until a dedicated farm-soil frame is verified.
export function BridgeTile({ tileSize = TILE_SIZE }: { tileSize?: number }) {
  if (tileSize !== TILE_SIZE) return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, BRIDGE_TILE_FRAME, tileSize);
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, BRIDGE_TILE_FRAME);
}

export function PathTile({ tileSize = TILE_SIZE }: { tileSize?: number }) {
  if (tileSize !== TILE_SIZE) return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, PATH_TILE_FRAME, tileSize);
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, PATH_TILE_FRAME);
}

export function TilledTile({ tileSize = TILE_SIZE }: { tileSize?: number }) {
  if (tileSize !== TILE_SIZE) return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, TILLED_TILE_FRAME, tileSize);
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, TILLED_TILE_FRAME);
}
