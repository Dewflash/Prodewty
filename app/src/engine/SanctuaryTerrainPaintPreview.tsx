import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme/typography';
import { getTileDisplayName, TileType } from './MapData';
import { RPG_STONE_SLAB_ITEM_ID, RPG_WOOD_TILE_ITEM_ID } from './RpgItemIds';
import { SanctuaryTerrainTile } from './TileArt';

export const SANCTUARY_TERRAIN_PAINT_ITEM_IDS = ['rpg_bridge_kit', 'rpg_path_kit', RPG_STONE_SLAB_ITEM_ID, RPG_WOOD_TILE_ITEM_ID] as const;

const TERRAIN_PAINT_TARGETS: Record<string, TileType> = {
  rpg_bridge_kit: TileType.BRIDGE,
  rpg_path_kit: TileType.PATH,
  [RPG_STONE_SLAB_ITEM_ID]: TileType.STONE_SLAB,
  [RPG_WOOD_TILE_ITEM_ID]: TileType.WOOD_TILE,
};

const REPAINTABLE_GROUND_TILES = new Set<TileType>([
  TileType.GRASS,
  TileType.SAND,
  TileType.TILLED,
  TileType.WET_SOIL,
  TileType.PATH,
  TileType.STONE_SLAB,
  TileType.WOOD_TILE,
]);

export function getSanctuaryTerrainPaintTarget(itemId: string | null | undefined): TileType | null {
  if (!itemId) return null;
  return TERRAIN_PAINT_TARGETS[itemId] ?? null;
}

export function canSanctuaryTerrainPaintTile(itemId: string | null | undefined, tile: TileType): boolean {
  const targetTile = getSanctuaryTerrainPaintTarget(itemId);
  if (targetTile === null || targetTile === tile) return false;
  if (itemId === 'rpg_bridge_kit') return tile === TileType.WATER;
  return REPAINTABLE_GROUND_TILES.has(tile);
}

export function getSanctuaryTerrainPaintUsageLabel(itemId: string | null | undefined): string | null {
  const targetTile = getSanctuaryTerrainPaintTarget(itemId);
  if (targetTile === null) return null;
  if (itemId === 'rpg_bridge_kit') return 'Water crossings';
  return 'Repaints ground/floors';
}

export function getSanctuaryTerrainPaintBlockedHint(itemId: string | null | undefined, tile: TileType): string {
  const targetTile = getSanctuaryTerrainPaintTarget(itemId);
  if (targetTile === tile) return `Already ${getTileDisplayName(tile)}`;
  if (itemId === 'rpg_bridge_kit') return 'Needs water';
  return 'Needs ground or floor';
}

export function SanctuaryTerrainPaintIcon({ itemId, size = 44, muted = false }: {
  itemId: string | null | undefined;
  size?: number;
  muted?: boolean;
}) {
  const targetTile = getSanctuaryTerrainPaintTarget(itemId);
  if (targetTile === null) return null;

  const inset = Math.max(3, Math.round(size * 0.1));
  const tileSize = Math.max(12, size - inset * 2);

  return (
    <View style={[styles.iconFrame, { width: size, height: size, padding: inset }, muted && styles.iconFrameMuted]}>
      <View style={styles.iconTileClip}>
        <SanctuaryTerrainTile type={targetTile} tileSize={tileSize} variant={targetTile} />
      </View>
      <View style={styles.iconCorner}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.iconCornerText}>T</Text>
      </View>
    </View>
  );
}

export function SanctuaryTerrainPaintPreview({ itemId }: { itemId: string | null | undefined }) {
  const targetTile = getSanctuaryTerrainPaintTarget(itemId);
  if (targetTile === null) return null;
  const usageLabel = getSanctuaryTerrainPaintUsageLabel(itemId);

  return (
    <View style={styles.row}>
      <View style={styles.swatch}>
        <SanctuaryTerrainTile type={targetTile} tileSize={18} variant={targetTile} />
      </View>
      <View style={styles.textStack}>
        <Text numberOfLines={1} style={styles.label}>{usageLabel ?? 'Paints terrain'}</Text>
        <Text numberOfLines={1} style={styles.target}>{getTileDisplayName(targetTile)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    position: 'relative',
    borderRadius: 7,
    backgroundColor: 'rgba(15,25,15,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(142,232,137,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconFrameMuted: {
    opacity: 0.36,
  },
  iconTileClip: {
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.34)',
  },
  iconCorner: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 4,
    backgroundColor: 'rgba(22,42,25,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(217,255,208,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCornerText: {
    color: '#d9ffd0',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  row: {
    minHeight: 24,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(142,232,137,0.44)',
    backgroundColor: 'rgba(11,20,12,0.36)',
  },
  textStack: {
    flex: 1,
    minWidth: 0,
    marginLeft: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  target: {
    marginTop: 1,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
});
