import React from 'react';
import { Image, View } from 'react-native';
import { TILE_SIZE } from './MapData';

const WALLS_FLOOR_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png');
const WATER_SHEET = require('../../assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/Water_coasts_animation.png');
const TEMPLE_EXTERIOR_TILES_SHEET = require('../../assets/game/craftpix-net-160005-free-ruined-temple-top-down-location-pixel-art/PNG/Tiles_exterior.png');

const SHEET_TILE_PX = 16;
const SCALE = TILE_SIZE / SHEET_TILE_PX;
const TEMPLE_EXTERIOR_SHEET = { width: 432, height: 256 };

export const FLOOR_TILE_COORD = { col: 1, row: 10 };
export const WALL_TILE_COORD = { col: 11, row: 20 };
export const WATER_TILE_COORD = { col: 0, row: 27 };
export const BRIDGE_TILE_FRAME = { x: 352, y: 0, width: 32, height: 32 };
export const PATH_TILE_FRAME = { x: 224, y: 32, width: 32, height: 32 };
export const TILLED_TILE_FRAME = { x: 176, y: 128, width: 32, height: 32 };

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

function frameTile(source: any, sheet: { width: number; height: number }, frame: { x: number; y: number; width: number; height: number }) {
  const scale = Math.max(TILE_SIZE / frame.width, TILE_SIZE / frame.height);
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, overflow: 'hidden' }}>
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
export function BridgeTile() {
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, BRIDGE_TILE_FRAME);
}

export function PathTile() {
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, PATH_TILE_FRAME);
}

export function TilledTile() {
  return frameTile(TEMPLE_EXTERIOR_TILES_SHEET, TEMPLE_EXTERIOR_SHEET, TILLED_TILE_FRAME);
}
