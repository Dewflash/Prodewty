import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { TILE_SIZE, TileType } from './MapData';

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

type TerrainTone = {
  base: string;
  edge: string;
  accent: string;
  shade: string;
  stripe?: string;
};

type SanctuaryTerrainRenderer = 'placeholder' | 'wallSheet' | 'waterSheet';
type SanctuaryTerrainPattern = 'grass' | 'stone' | 'water' | 'portal' | 'plank' | 'path' | 'soil' | 'sand' | 'ditch';
type SanctuaryTerrainDetail = 'none' | 'tuft' | 'speckle' | 'furrow' | 'plank' | 'portal';

type SanctuaryTerrainArt = {
  assetSlot: string;
  renderer: SanctuaryTerrainRenderer;
  pattern: SanctuaryTerrainPattern;
  detail: SanctuaryTerrainDetail;
  tone: TerrainTone;
  edgeBlend: boolean;
};

export type SanctuaryTerrainNeighbors = Partial<Record<'north' | 'east' | 'south' | 'west', TileType>>;

export const SANCTUARY_TERRAIN_ART_REGISTRY: Record<TileType, SanctuaryTerrainArt> = {
  [TileType.GRASS]: { assetSlot: 'terrain.grass', renderer: 'placeholder', pattern: 'grass', detail: 'tuft', tone: { base: '#5c8f56', edge: '#416f3f', accent: '#7ebd65', shade: '#3e6840' }, edgeBlend: false },
  [TileType.WALL]: { assetSlot: 'terrain.wall', renderer: 'wallSheet', pattern: 'stone', detail: 'none', tone: { base: '#56615b', edge: '#363f3b', accent: '#737e77', shade: '#3e4843' }, edgeBlend: false },
  [TileType.WATER]: { assetSlot: 'terrain.water', renderer: 'waterSheet', pattern: 'water', detail: 'none', tone: { base: '#4d8aa8', edge: '#2f657e', accent: '#82c7dd', shade: '#326f8d' }, edgeBlend: false },
  [TileType.PORTAL_DUNGEON]: { assetSlot: 'terrain.portal.dungeon', renderer: 'placeholder', pattern: 'portal', detail: 'portal', tone: { base: '#8f63b8', edge: '#573370', accent: '#cfb0ff', shade: '#6f4a91' }, edgeBlend: true },
  [TileType.PORTAL_SANCTUARY]: { assetSlot: 'terrain.portal.sanctuary', renderer: 'placeholder', pattern: 'portal', detail: 'portal', tone: { base: '#d7b84b', edge: '#9c7b24', accent: '#fff2bb', shade: '#b08e32' }, edgeBlend: true },
  [TileType.BRIDGE]: { assetSlot: 'terrain.bridge', renderer: 'placeholder', pattern: 'plank', detail: 'plank', tone: { base: '#9a6b3c', edge: '#5f3b1e', accent: '#c39158', shade: '#744923', stripe: '#5b361b' }, edgeBlend: true },
  [TileType.PATH]: { assetSlot: 'terrain.path', renderer: 'placeholder', pattern: 'path', detail: 'speckle', tone: { base: '#c2a06b', edge: '#8c6b3e', accent: '#d8bd85', shade: '#a37f4a' }, edgeBlend: true },
  [TileType.TILLED]: { assetSlot: 'terrain.soil.tilled', renderer: 'placeholder', pattern: 'soil', detail: 'furrow', tone: { base: '#6b4a2e', edge: '#3f2a1c', accent: '#8a6340', shade: '#4f321f', stripe: '#332116' }, edgeBlend: true },
  [TileType.SAND]: { assetSlot: 'terrain.sand', renderer: 'placeholder', pattern: 'sand', detail: 'speckle', tone: { base: '#d9c08a', edge: '#ad8f54', accent: '#f1dba4', shade: '#b99a62' }, edgeBlend: true },
  [TileType.DITCH]: { assetSlot: 'terrain.ditch', renderer: 'placeholder', pattern: 'ditch', detail: 'furrow', tone: { base: '#7a6a4a', edge: '#4d432e', accent: '#9b8457', shade: '#5d4f35', stripe: '#403522' }, edgeBlend: true },
  [TileType.WET_SOIL]: { assetSlot: 'terrain.soil.wet', renderer: 'placeholder', pattern: 'soil', detail: 'furrow', tone: { base: '#4a3420', edge: '#2e2117', accent: '#6a4e34', shade: '#352416', stripe: '#221712' }, edgeBlend: true },
  [TileType.STONE_SLAB]: { assetSlot: 'terrain.floor.stone', renderer: 'placeholder', pattern: 'plank', detail: 'plank', tone: { base: '#8a8f92', edge: '#5b6266', accent: '#aeb4b7', shade: '#70777a', stripe: '#62696d' }, edgeBlend: true },
  [TileType.WOOD_TILE]: { assetSlot: 'terrain.floor.wood', renderer: 'placeholder', pattern: 'plank', detail: 'plank', tone: { base: '#a9763f', edge: '#694019', accent: '#cc9858', shade: '#804f24', stripe: '#5b3516' }, edgeBlend: true },
};

function getSanctuaryTerrainArt(type: TileType) {
  return SANCTUARY_TERRAIN_ART_REGISTRY[type] ?? SANCTUARY_TERRAIN_ART_REGISTRY[TileType.GRASS];
}

export function getSanctuaryTerrainPreviewColor(type: TileType) {
  return getSanctuaryTerrainArt(type).tone.accent;
}

function getTransitionEdges(type: TileType, neighbors: SanctuaryTerrainNeighbors | undefined) {
  const art = getSanctuaryTerrainArt(type);
  if (!art.edgeBlend || !neighbors) return [];
  return (['north', 'east', 'south', 'west'] as const).filter(edge => {
    const neighborType = neighbors[edge];
    return neighborType !== undefined && neighborType !== type;
  });
}

function normalizeTerrainVariant(variant: number | undefined) {
  return Math.abs(Math.floor(variant ?? 0)) % 4;
}

// Sanctuary terrain is still an honest placeholder layer: the project does
// not yet have a matching farm/sanctuary ground tileset. These code-native pixel textures
// now flow through an asset-slot registry with deterministic detail variants so final
// soil/path/floor sprites can replace the placeholders without changing TileType,
// collision, farming, or placement-preview logic.
export function SanctuaryTerrainTile({
  type,
  tileSize = TILE_SIZE,
  neighbors,
  variant,
}: {
  type: TileType;
  tileSize?: number;
  neighbors?: SanctuaryTerrainNeighbors;
  variant?: number;
}) {
  const art = getSanctuaryTerrainArt(type);

  if (art.renderer === 'waterSheet') return <WaterTile tileSize={tileSize} />;
  if (art.renderer === 'wallSheet') return <TilesetTile {...WALL_TILE_COORD} tileSize={tileSize} />;

  const tone = art.tone;
  const unit = Math.max(1, Math.round(tileSize / 16));
  const stripeHeight = Math.max(1, Math.round(tileSize / 14));
  const edgeSize = Math.max(2, Math.round(tileSize / 8));
  const transitionEdges = getTransitionEdges(type, neighbors);
  const variantIndex = normalizeTerrainVariant(variant);
  const variantFlip = variantIndex % 2 === 1;
  const detailX = [0.18, 0.58, 0.32, 0.7][variantIndex] * tileSize;
  const detailY = [0.22, 0.28, 0.62, 0.56][variantIndex] * tileSize;
  const isPlanked = art.pattern === 'plank';
  const isSoil = art.pattern === 'soil' || art.pattern === 'ditch';
  const isPathLike = art.pattern === 'path' || art.pattern === 'sand';
  const isPortal = art.pattern === 'portal';

  return (
    <View style={[styles.sanctuaryTileBase, { width: tileSize, height: tileSize, backgroundColor: tone.base, borderColor: tone.edge }]}>
      <View style={[styles.tileShadeCorner, { width: tileSize * 0.5, height: tileSize * 0.5, backgroundColor: tone.shade }]} />
      <View style={[styles.tileTopGlow, { height: Math.max(2, unit * 2), backgroundColor: tone.accent }]} />
      <View style={[styles.tileAccentPebble, { left: detailX, top: detailY, width: unit * 2, height: unit, backgroundColor: tone.accent }]} />
      <View style={[styles.tileAccentPebble, { right: variantFlip ? tileSize * 0.34 : tileSize * 0.2, bottom: variantFlip ? tileSize * 0.34 : tileSize * 0.22, width: unit * 2, height: unit, backgroundColor: tone.accent }]} />
      {art.detail === 'tuft' && (
        <>
          <View style={[styles.tileGrassTuft, { left: detailX + unit, top: detailY + unit * 2 }]}>
            <View style={[styles.tileGrassBlade, { height: unit * 3, backgroundColor: tone.accent, transform: [{ rotate: '-18deg' }] }]} />
            <View style={[styles.tileGrassBlade, { height: unit * 4, backgroundColor: tone.accent }]} />
            <View style={[styles.tileGrassBlade, { height: unit * 3, backgroundColor: tone.accent, transform: [{ rotate: '18deg' }] }]} />
          </View>
          <View style={[styles.tileGrassTuft, { right: tileSize * 0.18, bottom: tileSize * 0.18, opacity: 0.28 }]}>
            <View style={[styles.tileGrassBlade, { height: unit * 2, backgroundColor: tone.shade, transform: [{ rotate: '-15deg' }] }]} />
            <View style={[styles.tileGrassBlade, { height: unit * 3, backgroundColor: tone.accent }]} />
          </View>
        </>
      )}
      {art.detail === 'speckle' && (
        <>
          <View style={[styles.tileSpeckle, { left: detailX, top: detailY, width: unit, height: unit, backgroundColor: tone.shade }]} />
          <View style={[styles.tileSpeckle, { left: variantFlip ? tileSize * 0.24 : tileSize * 0.68, top: variantFlip ? tileSize * 0.66 : tileSize * 0.36, width: unit, height: unit, backgroundColor: tone.edge }]} />
          <View style={[styles.tileSpeckle, { left: variantFlip ? tileSize * 0.72 : tileSize * 0.22, top: variantFlip ? tileSize * 0.28 : tileSize * 0.74, width: unit * 1.4, height: unit, backgroundColor: tone.accent }]} />
        </>
      )}
      {isSoil && (
        <>
          <View style={[styles.tileFurrow, { top: tileSize * (variantFlip ? 0.28 : 0.3), height: stripeHeight, backgroundColor: tone.stripe ?? tone.shade }]} />
          <View style={[styles.tileFurrow, { top: tileSize * (variantFlip ? 0.56 : 0.58), height: stripeHeight, backgroundColor: tone.stripe ?? tone.shade }]} />
          <View style={[styles.tileFurrowHighlight, { top: tileSize * (variantFlip ? 0.37 : 0.4), height: Math.max(1, Math.round(stripeHeight * 0.65)), backgroundColor: tone.accent }]} />
        </>
      )}
      {isPlanked && (
        <>
          <View style={[styles.tilePlankLine, { left: tileSize * (variantFlip ? 0.38 : 0.32), backgroundColor: tone.stripe ?? tone.edge }]} />
          <View style={[styles.tilePlankLine, { left: tileSize * (variantFlip ? 0.7 : 0.66), backgroundColor: tone.stripe ?? tone.edge }]} />
          <View style={[styles.tilePlankKnot, { left: variantFlip ? tileSize * 0.2 : tileSize * 0.52, top: variantFlip ? tileSize * 0.58 : tileSize * 0.3, borderColor: tone.stripe ?? tone.edge }]} />
        </>
      )}
      {isPathLike && (
        <View style={[styles.tilePathStone, { left: variantFlip ? tileSize * 0.5 : tileSize * 0.28, top: variantFlip ? tileSize * 0.58 : tileSize * 0.42, backgroundColor: tone.shade, borderColor: tone.accent }]} />
      )}
      {isPortal && (
        <View style={[styles.tilePortalCore, { borderColor: tone.accent, backgroundColor: tone.shade }]} />
      )}
      {transitionEdges.includes('north') && (
        <View style={[styles.tileTransitionEdge, styles.tileTransitionEdgeNorth, { height: edgeSize, backgroundColor: tone.edge }]} />
      )}
      {transitionEdges.includes('east') && (
        <View style={[styles.tileTransitionEdge, styles.tileTransitionEdgeEast, { width: edgeSize, backgroundColor: tone.edge }]} />
      )}
      {transitionEdges.includes('south') && (
        <View style={[styles.tileTransitionEdge, styles.tileTransitionEdgeSouth, { height: edgeSize, backgroundColor: tone.edge }]} />
      )}
      {transitionEdges.includes('west') && (
        <View style={[styles.tileTransitionEdge, styles.tileTransitionEdgeWest, { width: edgeSize, backgroundColor: tone.edge }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sanctuaryTileBase: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  tileShadeCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: 0.22,
  },
  tileTopGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0.12,
  },
  tileAccentPebble: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.42,
  },
  tileGrassTuft: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    opacity: 0.38,
  },
  tileGrassBlade: {
    width: 1,
    borderRadius: 1,
  },
  tileSpeckle: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.36,
  },
  tileFurrow: {
    position: 'absolute',
    left: '14%',
    right: '14%',
    borderRadius: 2,
    opacity: 0.42,
  },
  tileFurrowHighlight: {
    position: 'absolute',
    left: '20%',
    right: '30%',
    borderRadius: 2,
    opacity: 0.2,
  },
  tilePlankLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.45,
  },
  tilePlankKnot: {
    position: 'absolute',
    width: 6,
    height: 4,
    borderRadius: 4,
    borderWidth: 1,
    opacity: 0.34,
  },
  tilePathStone: {
    position: 'absolute',
    width: 7,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    opacity: 0.24,
  },
  tilePortalCore: {
    position: 'absolute',
    left: '24%',
    top: '24%',
    right: '24%',
    bottom: '24%',
    borderWidth: 2,
    borderRadius: 999,
    opacity: 0.75,
  },
  tileTransitionEdge: {
    position: 'absolute',
    opacity: 0.32,
  },
  tileTransitionEdgeNorth: {
    left: 0,
    right: 0,
    top: 0,
  },
  tileTransitionEdgeEast: {
    top: 0,
    right: 0,
    bottom: 0,
  },
  tileTransitionEdgeSouth: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  tileTransitionEdgeWest: {
    top: 0,
    bottom: 0,
    left: 0,
  },
});
