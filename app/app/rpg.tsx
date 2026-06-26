import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fonts } from '../src/theme/typography';
import { Joystick } from '../src/engine/Joystick';
import { SpriteAnimator } from '../src/engine/SpriteAnimator';
import { RpgBackpack } from '../src/engine/RpgBackpack';
import { RpgArchive } from '../src/engine/RpgArchive';
import { RpgItemIcon, RpgItemWorldArt, RpgSpriteFrameView } from '../src/engine/RpgItemIcon';
import { SanctuaryObject } from '../src/engine/SanctuaryObject';
import { SanctuaryShop } from '../src/engine/SanctuaryShop';
import {
  getCropForSeed,
  getPlaceableItem,
  getRpgItem,
  RPG_UI_FRAMES,
  type RpgDrop,
  type RpgItemDefinition,
  type ShopCatalogItem,
} from '../src/engine/RpgObjectCatalog';
import { RPG_ARCHIVE_FRAMES } from '../src/engine/RpgAssetRegistry';
import { DungeonMap, SanctuaryMap, TILE_COLLISION, TILE_SIZE, TileType } from '../src/engine/MapData';
import { db } from '../src/db/schema';
import {
  advanceGardenPlotWithInventoryItem,
  harvestGardenPlot,
  plantSeed,
  updatePlantGrowth,
  type GardenPlot,
  type HarvestDrop,
  type GrowthStage,
} from '../src/db/garden';
import { recordRpgDiscovery, type RpgDiscoverySource } from '../src/db/rpgDiscovery';
import {
  deleteSanctuaryObjectInteractions,
  markSanctuaryObjectInteraction,
} from '../src/db/sanctuaryInteractions';
import { deleteSanctuaryObjectRelationsForObject } from '../src/db/sanctuaryObjectRelations';
import { claimSanctuaryReward } from '../src/db/sanctuaryRewards';
import { bootstrapSanctuaryGrowth, getPlotGrowthInfo } from '../src/engine/SanctuaryBootstrapper';
import { RPG_WATER_DROPS_ITEM_ID } from '../src/engine/RpgItemIds';

const AVATAR_SIZE = 64;
const SPEED = 180;
const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.8;

const AVATAR_FOOT_BOX = {
  offsetX: 20,
  offsetY: 48,
  width: 24,
  height: 14,
};

const WALK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Walk_with_shadow.png');
const ATTACK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_attack_with_shadow.png');

const RAIN_STREAK_DAYS = 3;
const RAIN_DROPS = Array.from({ length: 28 }, (_, index) => ({
  leftRatio: ((index * 37) % 100) / 100,
  topRatio: ((index * 19) % 100) / 100,
  height: 16 + (index % 4) * 5,
  opacity: 0.28 + (index % 5) * 0.08,
}));

type Zone = 'sanctuary' | 'dungeon';
type MapObject = { id: number; type: string; row: number; col: number };
type BuildItem = {
  mode: 'place' | 'edit' | 'plant';
  itemId: string;
  label: string;
  objectId: number | null;
};
type PlacementReason =
  | 'Ready'
  | 'Unavailable'
  | 'Out of bounds'
  | 'Avatar'
  | 'Terrain'
  | 'Occupied'
  | 'Traps avatar'
  | 'Blocks portal';
type PlacementCell = { row: number; col: number; valid: boolean; reason?: PlacementReason };
type PlacementReport = {
  row: number;
  col: number;
  valid: boolean;
  reason: PlacementReason;
  cells: PlacementCell[];
};
type WorldToast = {
  id: number;
  text: string;
  item?: RpgItemDefinition | null;
  tone: 'success' | 'muted' | 'warn';
};
type InteractionTargetKind = 'object' | 'plot' | 'portal';
type InteractionTargetCell = { row: number; col: number };
type InteractionTarget = {
  kind: InteractionTargetKind;
  row: number;
  col: number;
  cells: InteractionTargetCell[];
  label: string;
  detail: string;
  item?: RpgItemDefinition | null;
  object?: MapObject;
  plot?: GardenPlot;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function getItem(type: string | null): ShopCatalogItem | null {
  return getPlaceableItem(type);
}

function cellsForRect(x: number, y: number, width: number, height: number) {
  const startCol = Math.floor(x / TILE_SIZE);
  const endCol = Math.floor((x + width - 1) / TILE_SIZE);
  const startRow = Math.floor(y / TILE_SIZE);
  const endRow = Math.floor((y + height - 1) / TILE_SIZE);
  const cells: { row: number; col: number }[] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

function avatarCells(avatarX: number, avatarY: number) {
  return cellsForRect(
    avatarX + AVATAR_FOOT_BOX.offsetX,
    avatarY + AVATAR_FOOT_BOX.offsetY,
    AVATAR_FOOT_BOX.width,
    AVATAR_FOOT_BOX.height,
  );
}

const PLACEMENT_REASON_PRIORITY: Record<PlacementReason, number> = {
  Ready: 0,
  Unavailable: 10,
  Terrain: 20,
  Occupied: 30,
  Avatar: 40,
  'Out of bounds': 50,
  'Traps avatar': 60,
  'Blocks portal': 70,
};

function pickPlacementReason(current: PlacementReason, next: PlacementReason) {
  return PLACEMENT_REASON_PRIORITY[next] > PLACEMENT_REASON_PRIORITY[current] ? next : current;
}

export default function RpgScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [activeZone, setActiveZone] = useState<Zone>('sanctuary');
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [gardenPlots, setGardenPlots] = useState<GardenPlot[]>([]);
  const [coins, setCoins] = useState(0);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [buildItem, setBuildItem] = useState<BuildItem | null>(null);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isRaining, setIsRaining] = useState(false);
  const [interactingObjectId, setInteractingObjectId] = useState<number | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<InteractionTarget | null>(null);
  const [worldToast, setWorldToast] = useState<WorldToast | null>(null);
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);
  const worldToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forageCooldowns = useRef<Record<number, number>>({});

  const mapData = activeZone === 'sanctuary' ? SanctuaryMap : DungeonMap;
  const mapColsCount = mapData[0].length;
  const mapRowsCount = mapData.length;
  const mapWidth = mapColsCount * TILE_SIZE;
  const mapHeight = mapRowsCount * TILE_SIZE;

  const joyX = useSharedValue(0);
  const joyY = useSharedValue(0);
  const avatarX = useSharedValue(TILE_SIZE * 2);
  const avatarY = useSharedValue(TILE_SIZE * 2);
  const avatarDirection = useSharedValue(0);
  const avatarIsPlaying = useSharedValue(false);
  const isAttacking = useSharedValue(false);
  const mapScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const collisionMap = useSharedValue<number[]>([]);
  const mapCols = useSharedValue(mapColsCount);
  const mapRows = useSharedValue(mapRowsCount);
  const buildActive = useSharedValue(0);
  const buildCol = useSharedValue(0);
  const buildRow = useSharedValue(0);
  const buildColWidth = useSharedValue(0);
  const buildColHeight = useSharedValue(0);
  const buildVisWidth = useSharedValue(0);
  const buildVisHeight = useSharedValue(0);
  const targetRow = useSharedValue(-999);
  const targetCol = useSharedValue(-999);

  const selectedObject = useMemo(
    () => (
      buildItem?.mode === 'edit'
        ? mapObjects.find(obj => obj.id === buildItem.objectId) ?? null
        : null
    ),
    [buildItem, mapObjects],
  );

  const buildCatalogItem = getItem(buildItem?.itemId ?? null);
  const buildSeedItem = buildItem?.mode === 'plant' ? getRpgItem(buildItem.itemId) : null;
  const buildGhostWidth = (buildItem?.mode === 'plant' ? 1 : buildCatalogItem?.visWidth ?? 0) * TILE_SIZE;
  const buildGhostHeight = (buildItem?.mode === 'plant' ? 1 : buildCatalogItem?.visHeight ?? 0) * TILE_SIZE;

  const makeMovementCollisionFlat = (objects: MapObject[], zone: Zone = activeZone, data: TileType[][] = mapData) => {
    const cols = data[0]?.length ?? 0;
    const flat = data.flat().map(tile => (TILE_COLLISION[tile as TileType] ? 1 : 0));
    if (zone !== 'sanctuary') return flat;

    objects.forEach(obj => {
      const item = getItem(obj.type);
      const width = item?.colWidth ?? 1;
      const height = item?.colHeight ?? 1;
      for (let dr = 0; dr < height; dr++) {
        for (let dc = 0; dc < width; dc++) {
          const row = obj.row + dr;
          const col = obj.col + dc;
          if (row < 0 || row >= data.length || col < 0 || col >= cols) continue;
          flat[row * cols + col] = 1;
        }
      }
    });
    return flat;
  };

  const applyMovementCollision = (objects: MapObject[], zone: Zone = activeZone, data: TileType[][] = mapData) => {
    collisionMap.value = makeMovementCollisionFlat(objects, zone, data);
    mapCols.value = data[0]?.length ?? 0;
    mapRows.value = data.length;
  };

  const refreshMapObjects = () => {
    const objects = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
    setMapObjects(objects);
    applyMovementCollision(objects);
    return objects;
  };

  const refreshGardenPlots = () => {
    const plots = bootstrapSanctuaryGrowth();
    setGardenPlots(plots);
    return plots;
  };

  const refreshCoins = () => {
    const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
    if (state) setCoins(state.coins);
  };

  const refreshWeather = () => {
    try {
      const state = db.getFirstSync<{ streak_days: number }>('SELECT streak_days FROM rpg_state WHERE id = 1');
      setIsRaining((state?.streak_days ?? 0) >= RAIN_STREAK_DAYS);
    } catch {
      setIsRaining(false);
    }
  };

  const bumpInventoryRevision = () => {
    setInventoryRevision(current => current + 1);
  };

  const enterZone = (zone: Zone) => {
    setActiveZone(zone);
    setBuildItem(null);
    setPlacementReport(null);
    setIsShopOpen(false);
    setIsBackpackOpen(false);
    setIsArchiveOpen(false);
    setInteractionPrompt(null);
    buildActive.value = 0;
    buildColWidth.value = 0;
    buildColHeight.value = 0;
    buildVisWidth.value = 0;
    buildVisHeight.value = 0;
    joyX.value = 0;
    joyY.value = 0;
    avatarIsPlaying.value = false;
    avatarDirection.value = 0;
    avatarX.value = TILE_SIZE * 2;
    avatarY.value = zone === 'sanctuary' ? TILE_SIZE * 2 : TILE_SIZE;
    targetRow.value = -999;
    targetCol.value = -999;
  };

  const setBuildAnchor = (row: number, col: number, item: Pick<ShopCatalogItem, 'colWidth' | 'colHeight'>) => {
    const nextCol = clamp(col, 0, Math.max(0, mapColsCount - item.colWidth));
    const nextRow = clamp(row, 0, Math.max(0, mapRowsCount - item.colHeight));
    buildCol.value = nextCol;
    buildRow.value = nextRow;
    return { row: nextRow, col: nextCol };
  };

  const beginBuildMode = (
    mode: BuildItem['mode'],
    itemId: string,
    objectId: number | null = null,
    origin?: { row: number; col: number },
  ) => {
    const item = getItem(itemId);
    if (!item || activeZone !== 'sanctuary') return;
    const ignoreObjectId = mode === 'edit' ? objectId : null;
    let anchor = origin;

    buildColWidth.value = item.colWidth;
    buildColHeight.value = item.colHeight;
    buildVisWidth.value = item.visWidth;
    buildVisHeight.value = item.visHeight;

    if (anchor) {
      anchor = setBuildAnchor(anchor.row, anchor.col, item);
    } else {
      const avatarBaseCol = Math.floor((avatarX.value + AVATAR_FOOT_BOX.offsetX) / TILE_SIZE);
      const avatarBaseRow = Math.floor((avatarY.value + AVATAR_FOOT_BOX.offsetY) / TILE_SIZE);
      const nearby = findNearbyValidBuildAnchor(itemId, avatarBaseRow + 2, avatarBaseCol);
      anchor = nearby ?? { row: avatarBaseRow + 2, col: avatarBaseCol };
      anchor = setBuildAnchor(anchor.row, anchor.col, item);
    }

    joyX.value = 0;
    joyY.value = 0;
    avatarIsPlaying.value = false;
    setInteractionPrompt(null);
    setBuildItem({ mode, itemId, label: item.name, objectId });
    setPlacementReport(analyzePlacement(anchor.row, anchor.col, itemId, ignoreObjectId, mode));
    setIsShopOpen(false);
    setIsBackpackOpen(false);
    setIsArchiveOpen(false);
  };

  const beginPlantMode = (seedItemId: string) => {
    const seed = getRpgItem(seedItemId);
    const crop = getCropForSeed(seedItemId);
    if (!seed || seed.kind !== 'seed' || !crop || activeZone !== 'sanctuary') return;

    buildColWidth.value = 1;
    buildColHeight.value = 1;
    buildVisWidth.value = 1;
    buildVisHeight.value = 1;

    const avatarBaseCol = Math.floor((avatarX.value + AVATAR_FOOT_BOX.offsetX) / TILE_SIZE);
    const avatarBaseRow = Math.floor((avatarY.value + AVATAR_FOOT_BOX.offsetY) / TILE_SIZE);
    const nearby = findNearbyValidBuildAnchor(seedItemId, avatarBaseRow + 1, avatarBaseCol, 'plant');
    const anchor = setBuildAnchor(
      nearby?.row ?? avatarBaseRow + 1,
      nearby?.col ?? avatarBaseCol,
      { colWidth: 1, colHeight: 1 },
    );

    joyX.value = 0;
    joyY.value = 0;
    avatarIsPlaying.value = false;
    setInteractionPrompt(null);
    setBuildItem({ mode: 'plant', itemId: seedItemId, label: crop.name, objectId: null });
    setPlacementReport(analyzePlacement(anchor.row, anchor.col, seedItemId, null, 'plant'));
    setIsShopOpen(false);
    setIsBackpackOpen(false);
    setIsArchiveOpen(false);
  };

  const clearBuildMode = () => {
    setBuildItem(null);
    setPlacementReport(null);
    buildActive.value = 0;
    buildColWidth.value = 0;
    buildColHeight.value = 0;
    buildVisWidth.value = 0;
    buildVisHeight.value = 0;
    targetRow.value = -999;
    targetCol.value = -999;
  };

  const getTargetedTile = () => {
    const footX = avatarX.value + AVATAR_FOOT_BOX.offsetX + AVATAR_FOOT_BOX.width / 2;
    const footY = avatarY.value + AVATAR_FOOT_BOX.offsetY + AVATAR_FOOT_BOX.height / 2;
    let col = Math.floor(footX / TILE_SIZE);
    let row = Math.floor(footY / TILE_SIZE);

    const dir = avatarDirection.value;
    if (dir === 0) row += 1;
    else if (dir === 1) col -= 1;
    else if (dir === 2) col += 1;
    else if (dir === 3) row -= 1;

    return { row, col };
  };

  const getObjectAtTile = (row: number, col: number) => (
    mapObjects.find(obj => {
      const item = getItem(obj.type);
      const width = item?.colWidth ?? 1;
      const height = item?.colHeight ?? 1;
      return row >= obj.row && row < obj.row + height && col >= obj.col && col < obj.col + width;
    }) ?? null
  );

  const getPlotAtTile = (row: number, col: number) => (
    gardenPlots.find(plot => plot.row === row && plot.col === col) ?? null
  );

  const resolveInteractionTargetAt = useCallback((row: number, col: number): InteractionTarget | null => {
    if (buildItem) return null;

    if (activeZone === 'sanctuary') {
      const object = getObjectAtTile(row, col);
      if (object) {
        const item = getPlaceableItem(object.type);
        const tags = item?.tags ?? [];
        const detail = (() => {
          if (tags.includes('gate')) return 'Locked gate';
          if (tags.includes('lever')) return 'Lever';
          if (tags.includes('trap') || tags.includes('hazard')) return 'Trap';
          if (tags.includes('chest')) return 'Chest';
          if (item?.forageDrops?.length) return 'Forage';
          if (tags.includes('crystal')) return 'Crystal';
          if (tags.some(tag => ['relic', 'statue', 'idol'].includes(tag))) return 'Relic';
          return 'Object';
        })();
        return {
          kind: 'object',
          row,
          col,
          cells: Array.from({ length: item?.colHeight ?? 1 }).flatMap((_, dr) => (
            Array.from({ length: item?.colWidth ?? 1 }).map((__, dc) => ({
              row: object.row + dr,
              col: object.col + dc,
            }))
          )),
          label: item?.name ?? object.type,
          detail,
          item,
          object,
        };
      }

      const plot = getPlotAtTile(row, col);
      if (plot) {
        const growth = getPlotGrowthInfo(plot);
        return {
          kind: 'plot',
          row,
          col,
          cells: [{ row: plot.row, col: plot.col }],
          label: growth.crop?.name ?? 'Garden plot',
          detail: growth.stage >= 2 ? 'Ready' : growth.stage === 1 ? 'Growing' : 'Seeded',
          item: getRpgItem(plot.seed_item_id),
          plot,
        };
      }

      if (SanctuaryMap[row]?.[col] === TileType.PORTAL_DUNGEON) {
        return { kind: 'portal', row, col, cells: [{ row, col }], label: 'Dungeon portal', detail: 'Portal' };
      }
      return null;
    }

    if (DungeonMap[row]?.[col] === TileType.PORTAL_SANCTUARY) {
      return { kind: 'portal', row, col, cells: [{ row, col }], label: 'Sanctuary portal', detail: 'Portal' };
    }
    return null;
  }, [activeZone, buildItem, gardenPlots, mapObjects]);

  const updateInteractionPromptFromTile = useCallback((row: number, col: number) => {
    setInteractionPrompt(resolveInteractionTargetAt(row, col));
  }, [resolveInteractionTargetAt]);

  const getAvatarFootCell = () => {
    const cells = avatarCells(avatarX.value, avatarY.value);
    return cells[0] ?? { row: 0, col: 0 };
  };

  const buildBlockedCells = (
    itemId: string,
    row: number,
    col: number,
    ignoreObjectId: number | null,
  ) => {
    const blocked = new Set<string>();
    mapData.forEach((mapRow, r) => {
      mapRow.forEach((tile, c) => {
        if (TILE_COLLISION[tile as TileType]) blocked.add(`${r}:${c}`);
      });
    });

    if (activeZone === 'sanctuary') {
      mapObjects.forEach(obj => {
        if (obj.id === ignoreObjectId) return;
        const item = getItem(obj.type);
        const width = item?.colWidth ?? 1;
        const height = item?.colHeight ?? 1;
        for (let dr = 0; dr < height; dr++) {
          for (let dc = 0; dc < width; dc++) {
            blocked.add(`${obj.row + dr}:${obj.col + dc}`);
          }
        }
      });
    }

    const item = getItem(itemId);
    if (item) {
      for (let dr = 0; dr < item.colHeight; dr++) {
        for (let dc = 0; dc < item.colWidth; dc++) {
          blocked.add(`${row + dr}:${col + dc}`);
        }
      }
    }

    return blocked;
  };

  const hasSafePathAfterPlacement = (
    itemId: string,
    row: number,
    col: number,
    ignoreObjectId: number | null,
  ): { ok: boolean; reason: PlacementReason } => {
    const start = getAvatarFootCell();
    const blocked = buildBlockedCells(itemId, row, col, ignoreObjectId);
    if (blocked.has(`${start.row}:${start.col}`)) {
      return { ok: false, reason: 'Avatar' };
    }

    const portal = SanctuaryMap.flatMap((mapRow, rowIndex) =>
      mapRow.map((tile, colIndex) => (
        tile === TileType.PORTAL_DUNGEON ? { row: rowIndex, col: colIndex } : null
      )),
    ).find(Boolean);
    const queue = [start];
    const seen = new Set<string>([`${start.row}:${start.col}`]);
    let portalReachable = false;

    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      if (portal && cell.row === portal.row && cell.col === portal.col) portalReachable = true;
      [
        { row: cell.row + 1, col: cell.col },
        { row: cell.row - 1, col: cell.col },
        { row: cell.row, col: cell.col + 1 },
        { row: cell.row, col: cell.col - 1 },
      ].forEach(next => {
        const key = `${next.row}:${next.col}`;
        if (next.row < 0 || next.row >= mapRowsCount || next.col < 0 || next.col >= mapColsCount) return;
        if (seen.has(key) || blocked.has(key)) return;
        seen.add(key);
        queue.push(next);
      });
    }

    if (seen.size < 24) return { ok: false, reason: 'Traps avatar' };
    if (activeZone === 'sanctuary' && portal && !portalReachable) return { ok: false, reason: 'Blocks portal' };
    return { ok: true, reason: 'Ready' };
  };

  const analyzePlacement = (
    row: number,
    col: number,
    itemId: string,
    ignoreObjectId: number | null = null,
    mode: BuildItem['mode'] = 'place',
  ): PlacementReport => {
    const placeableItem = mode === 'plant' ? null : getItem(itemId);
    const seedCrop = mode === 'plant' ? getCropForSeed(itemId) : null;
    const footprint = mode === 'plant'
      ? { colWidth: 1, colHeight: 1 }
      : placeableItem;

    if (!footprint || (mode === 'plant' && !seedCrop) || activeZone !== 'sanctuary') {
      return { row, col, valid: false, reason: 'Unavailable', cells: [] };
    }

    const occupiedByAvatar = new Set(
      avatarCells(avatarX.value, avatarY.value).map(cell => `${cell.row}:${cell.col}`),
    );
    let reason: PlacementReason = 'Ready';
    const cells: PlacementCell[] = [];

    for (let dr = 0; dr < footprint.colHeight; dr++) {
      for (let dc = 0; dc < footprint.colWidth; dc++) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        let valid = true;
        let cellReason: PlacementReason | undefined;

        if (checkRow < 0 || checkRow >= mapRowsCount || checkCol < 0 || checkCol >= mapColsCount) {
          valid = false;
          cellReason = 'Out of bounds';
        } else if (occupiedByAvatar.has(`${checkRow}:${checkCol}`)) {
          valid = false;
          cellReason = 'Avatar';
        } else if (
          mode === 'plant'
            ? mapData[checkRow][checkCol] !== TileType.GRASS
            : TILE_COLLISION[mapData[checkRow][checkCol] as TileType]
        ) {
          valid = false;
          cellReason = 'Terrain';
        } else {
          const hasObject = mapObjects.some(obj => {
            if (obj.id === ignoreObjectId) return false;
            const existing = getItem(obj.type);
            const width = existing?.colWidth ?? 1;
            const height = existing?.colHeight ?? 1;
            return (
              checkRow >= obj.row &&
              checkRow < obj.row + height &&
              checkCol >= obj.col &&
              checkCol < obj.col + width
            );
          });
          if (hasObject) {
            valid = false;
            cellReason = 'Occupied';
          }

          const hasPlot = gardenPlots.some(plot => plot.row === checkRow && plot.col === checkCol);
          if (hasPlot) {
            valid = false;
            cellReason = 'Occupied';
          }
        }

        if (cellReason) reason = pickPlacementReason(reason, cellReason);
        cells.push({ row: checkRow, col: checkCol, valid, reason: cellReason });
      }
    }

    const allCellsValid = cells.length > 0 && cells.every(cell => cell.valid);
    if (allCellsValid && mode !== 'plant') {
      const path = hasSafePathAfterPlacement(itemId, row, col, ignoreObjectId);
      if (!path.ok) {
        return {
          row,
          col,
          valid: false,
          reason: path.reason,
          cells: cells.map(cell => ({ ...cell, valid: false })),
        };
      }
    }

    return { row, col, valid: allCellsValid, reason, cells };
  };

  const isPlacementValid = (
    row: number,
    col: number,
    itemId: string,
    ignoreObjectId: number | null = null,
    mode: BuildItem['mode'] = 'place',
  ) => {
    return analyzePlacement(row, col, itemId, ignoreObjectId, mode).valid;
  };

  const findNearbyValidBuildAnchor = (
    itemId: string,
    preferredRow: number,
    preferredCol: number,
    mode: BuildItem['mode'] = 'place',
  ) => {
    for (let radius = 0; radius <= 6; radius++) {
      for (let row = preferredRow - radius; row <= preferredRow + radius; row++) {
        for (let col = preferredCol - radius; col <= preferredCol + radius; col++) {
          if (Math.abs(row - preferredRow) !== radius && Math.abs(col - preferredCol) !== radius) {
            continue;
          }
          if (isPlacementValid(row, col, itemId, null, mode)) return { row, col };
        }
      }
    }
    return null;
  };

  const updateBuildReport = (row: number, col: number) => {
    if (!buildItem) return;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    setPlacementReport(analyzePlacement(row, col, buildItem.itemId, ignoreObjectId, buildItem.mode));
  };

  const confirmBuildPlacement = () => {
    if (!buildItem) return;
    const row = buildRow.value;
    const col = buildCol.value;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    const report = analyzePlacement(row, col, buildItem.itemId, ignoreObjectId, buildItem.mode);
    setPlacementReport(report);
    if (!report.valid) {
      showWorldToast({ text: `Cannot place: ${report.reason}`, tone: 'warn' });
      return;
    }

    try {
      if (buildItem.mode === 'plant') {
        const crop = getCropForSeed(buildItem.itemId);
        if (!crop) {
          showWorldToast({ text: 'Cannot plant this seed yet', tone: 'warn' });
          return;
        }
        const result = plantSeed(buildItem.itemId, crop.cropId, row, col);
        if (!result.ok) {
          showWorldToast({
            text: result.reason === 'no_seed'
              ? 'No seed left'
              : result.reason === 'occupied'
                ? 'Plot occupied'
                : 'Could not plant',
            tone: 'warn',
          });
          return;
        }
        recordRpgDiscovery(buildItem.itemId, 'plant');
        bumpInventoryRevision();
        refreshGardenPlots();
        clearBuildMode();
        showWorldToast({ text: `${crop.name} planted`, item: getRpgItem(buildItem.itemId), tone: 'success' });
        return;
      } else if (buildItem.mode === 'edit' && buildItem.objectId !== null) {
        db.runSync(
          'UPDATE sanctuary_objects SET row = ?, col = ? WHERE id = ?',
          row, col, buildItem.objectId,
        );
      } else {
        db.execSync('BEGIN TRANSACTION');
        const result = db.runSync(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
          buildItem.itemId,
        );
        if (result.changes <= 0) {
          db.execSync('ROLLBACK');
          return;
        }
        db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          buildItem.itemId, row, col,
        );
        db.execSync('COMMIT');
        recordRpgDiscovery(buildItem.itemId, 'place');
      }
      bumpInventoryRevision();
      clearBuildMode();
      refreshMapObjects();
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to confirm build placement', e);
    }
  };

  const stashEditingObject = () => {
    if (!selectedObject) return;

    try {
      db.execSync('BEGIN TRANSACTION');
      if (!deleteSanctuaryObjectInteractions(selectedObject.id)) {
        throw new Error('Failed to clean object interactions');
      }
      if (!deleteSanctuaryObjectRelationsForObject(selectedObject.id)) {
        throw new Error('Failed to clean object relations');
      }
      db.runSync('DELETE FROM sanctuary_objects WHERE id = ?', selectedObject.id);
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
        selectedObject.type,
      );
      db.execSync('COMMIT');
      bumpInventoryRevision();
      clearBuildMode();
      refreshMapObjects();
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to stash object', e);
    }
  };

  const handleObjectLongPress = (objectId: number) => {
    const object = mapObjects.find(obj => obj.id === objectId);
    if (!object) return;
    beginBuildMode('edit', object.type, object.id, { row: object.row, col: object.col });
  };

  const handleBackpackPlaceItem = (itemId: string) => {
    beginBuildMode('place', itemId);
  };

  const handleBackpackPlantSeed = (itemId: string) => {
    beginPlantMode(itemId);
  };

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);

  useEffect(() => () => {
    if (worldToastTimer.current) clearTimeout(worldToastTimer.current);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  }, []);

  useEffect(() => {
    try {
      refreshMapObjects();
      refreshGardenPlots();
      refreshCoins();
      refreshWeather();
    } catch (e) {
      console.warn('Failed to load RPG sandbox state', e);
    }
  }, []);

  useEffect(() => {
    const item = getItem(buildItem?.itemId ?? null);
    const isPlanting = buildItem?.mode === 'plant';
    buildActive.value = buildItem ? 1 : 0;
    buildColWidth.value = isPlanting ? 1 : item?.colWidth ?? 0;
    buildColHeight.value = isPlanting ? 1 : item?.colHeight ?? 0;
    buildVisWidth.value = isPlanting ? 1 : item?.visWidth ?? 0;
    buildVisHeight.value = isPlanting ? 1 : item?.visHeight ?? 0;
  }, [buildItem]);

  useEffect(() => {
    applyMovementCollision(mapObjects);
  }, [activeZone, mapObjects, mapData, mapColsCount, mapRowsCount, buildItem]);

  useEffect(() => {
    if (!buildItem) return;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    setPlacementReport(analyzePlacement(buildRow.value, buildCol.value, buildItem.itemId, ignoreObjectId, buildItem.mode));
  }, [buildItem, mapObjects, gardenPlots, activeZone]);

  useEffect(() => {
    if (buildItem) {
      setInteractionPrompt(null);
      return;
    }
    const target = getTargetedTile();
    setInteractionPrompt(resolveInteractionTargetAt(target.row, target.col));
  }, [activeZone, buildItem, mapObjects, gardenPlots, resolveInteractionTargetAt]);

  const handleJoystickMove = (dx: number, dy: number) => {
    joyX.value = dx;
    joyY.value = dy;
  };

  const handleJoystickRelease = () => {
    joyX.value = 0;
    joyY.value = 0;
  };

  useFrameCallback((frameInfo) => {
    if (!frameInfo.timeSincePreviousFrame) return;
    const dt = frameInfo.timeSincePreviousFrame / 1000;

    if (buildActive.value) {
      avatarIsPlaying.value = false;
      return;
    }

    if (isAttacking.value) return;

    if (joyX.value === 0 && joyY.value === 0) {
      avatarIsPlaying.value = false;
      return;
    }

    avatarIsPlaying.value = true;
    if (Math.abs(joyX.value) > Math.abs(joyY.value)) {
      avatarDirection.value = joyX.value > 0 ? 2 : 1;
    } else {
      avatarDirection.value = joyY.value > 0 ? 0 : 3;
    }

    const isFootBoxBlocked = (x: number, y: number) => {
      'worklet';
      const left = x + AVATAR_FOOT_BOX.offsetX;
      const top = y + AVATAR_FOOT_BOX.offsetY;
      const right = left + AVATAR_FOOT_BOX.width - 1;
      const bottom = top + AVATAR_FOOT_BOX.height - 1;
      const startCol = Math.floor(left / TILE_SIZE);
      const endCol = Math.floor(right / TILE_SIZE);
      const startRow = Math.floor(top / TILE_SIZE);
      const endRow = Math.floor(bottom / TILE_SIZE);

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          if (col < 0 || col >= mapCols.value || row < 0 || row >= mapRows.value) return true;
          if (collisionMap.value[row * mapCols.value + col] === 1) return true;
        }
      }
      return false;
    };

    const nextX = avatarX.value + joyX.value * SPEED * dt;
    const nextY = avatarY.value + joyY.value * SPEED * dt;

    if (!isFootBoxBlocked(nextX, avatarY.value)) avatarX.value = nextX;
    if (!isFootBoxBlocked(avatarX.value, nextY)) avatarY.value = nextY;

    const footX = avatarX.value + AVATAR_FOOT_BOX.offsetX + AVATAR_FOOT_BOX.width / 2;
    const footY = avatarY.value + AVATAR_FOOT_BOX.offsetY + AVATAR_FOOT_BOX.height / 2;
    let col = Math.floor(footX / TILE_SIZE);
    let row = Math.floor(footY / TILE_SIZE);
    if (avatarDirection.value === 0) row += 1;
    else if (avatarDirection.value === 1) col -= 1;
    else if (avatarDirection.value === 2) col += 1;
    else if (avatarDirection.value === 3) row -= 1;

    if (row !== targetRow.value || col !== targetCol.value) {
      targetRow.value = row;
      targetCol.value = col;
      runOnJS(updateInteractionPromptFromTile)(row, col);
    }
  });

  const cameraX = useDerivedValue(() => {
    const scaledWidth = mapWidth * mapScale.value;
    const ideal = dimensions.width / 2 - (avatarX.value + AVATAR_SIZE / 2) * mapScale.value;
    if (scaledWidth <= dimensions.width) return (dimensions.width - scaledWidth) / 2;
    return clamp(ideal, dimensions.width - scaledWidth, 0);
  });

  const cameraY = useDerivedValue(() => {
    const scaledHeight = mapHeight * mapScale.value;
    const ideal = dimensions.height / 2 - (avatarY.value + AVATAR_SIZE / 2) * mapScale.value;
    if (scaledHeight <= dimensions.height) return (dimensions.height - scaledHeight) / 2;
    return clamp(ideal, dimensions.height - scaledHeight, 0);
  });

  const worldStyle = useAnimatedStyle(() => ({
    transformOrigin: 'top left',
    transform: [
      { translateX: cameraX.value },
      { translateY: cameraY.value },
      { scale: mapScale.value },
    ],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: avatarX.value,
    top: avatarY.value,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    zIndex: Math.floor((avatarY.value + AVATAR_SIZE) / TILE_SIZE),
  }));

  const buildGhostStyle = useAnimatedStyle(() => {
    if (!buildActive.value || buildVisWidth.value <= 0 || buildVisHeight.value <= 0) {
      return { opacity: 0, position: 'absolute', left: 0, top: 0, width: 0, height: 0 };
    }

    const width = buildVisWidth.value * TILE_SIZE;
    const height = buildVisHeight.value * TILE_SIZE;
    const left = (buildCol.value + buildColWidth.value / 2) * TILE_SIZE - width / 2;
    const top = (buildRow.value + buildColHeight.value) * TILE_SIZE - height;

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      opacity: 0.72,
      zIndex: buildRow.value + buildColHeight.value + 1001,
    };
  });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = mapScale.value;
    })
    .onUpdate(event => {
      mapScale.value = clamp(pinchStartScale.value * event.scale, MIN_ZOOM, MAX_ZOOM);
    });

  const buildPanGesture = Gesture.Pan()
    .enabled(buildItem !== null)
    .minDistance(1)
    .onBegin(event => {
      const minCol = -Math.max(1, buildColWidth.value);
      const minRow = -Math.max(1, buildColHeight.value);
      const maxCol = mapCols.value;
      const maxRow = mapRows.value;
      const worldX = (event.absoluteX - cameraX.value) / mapScale.value;
      const worldY = (event.absoluteY - cameraY.value) / mapScale.value;
      const nextCol = clamp(Math.floor(worldX / TILE_SIZE) - Math.floor(buildColWidth.value / 2), minCol, maxCol);
      const nextRow = clamp(Math.floor(worldY / TILE_SIZE) - Math.floor(buildColHeight.value / 2), minRow, maxRow);
      buildCol.value = nextCol;
      buildRow.value = nextRow;
      runOnJS(updateBuildReport)(nextRow, nextCol);
    })
    .onUpdate(event => {
      const minCol = -Math.max(1, buildColWidth.value);
      const minRow = -Math.max(1, buildColHeight.value);
      const maxCol = mapCols.value;
      const maxRow = mapRows.value;
      const worldX = (event.absoluteX - cameraX.value) / mapScale.value;
      const worldY = (event.absoluteY - cameraY.value) / mapScale.value;
      const nextCol = clamp(Math.floor(worldX / TILE_SIZE) - Math.floor(buildColWidth.value / 2), minCol, maxCol);
      const nextRow = clamp(Math.floor(worldY / TILE_SIZE) - Math.floor(buildColHeight.value / 2), minRow, maxRow);
      buildCol.value = nextCol;
      buildRow.value = nextRow;
      runOnJS(updateBuildReport)(nextRow, nextCol);
    });

  const worldGesture = Gesture.Simultaneous(pinchGesture, buildPanGesture);

  const showWorldToast = (toast: Omit<WorldToast, 'id'>) => {
    if (worldToastTimer.current) clearTimeout(worldToastTimer.current);
    setWorldToast({ ...toast, id: Date.now() });
    worldToastTimer.current = setTimeout(() => setWorldToast(null), 1600);
  };

  const pulseObject = (objectId: number) => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    setInteractingObjectId(objectId);
    interactionTimer.current = setTimeout(() => setInteractingObjectId(null), 220);
  };

  const addSandboxInventoryItem = (itemId: string, quantity: number, source: RpgDiscoverySource = 'inventory') => {
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      itemId,
      quantity,
    );
    recordRpgDiscovery(itemId, source);
    bumpInventoryRevision();
  };

  const rollForageDrop = (drops: RpgDrop[]) => {
    const roll = Math.random();
    let threshold = 0;
    for (const drop of drops) {
      threshold += drop.chance;
      if (roll <= threshold) {
        const quantity = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
        return { itemId: drop.itemId, quantity };
      }
    }
    return null;
  };

  const rollHarvestDrops = (drops: RpgDrop[]): HarvestDrop[] => {
    const results: HarvestDrop[] = [];
    drops.forEach(drop => {
      if (Math.random() > drop.chance) return;
      const quantity = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
      results.push({ itemId: drop.itemId, quantity });
    });
    return results;
  };

  const getRewardText = (coins: number, drops: HarvestDrop[]) => {
    const coinText = coins > 0 ? `+${coins} coins` : '';
    const dropText = drops
      .map(drop => {
        const item = getRpgItem(drop.itemId);
        return `+${drop.quantity} ${item?.name ?? drop.itemId}`;
      })
      .join(', ');
    return [coinText, dropText].filter(Boolean).join(', ');
  };

  const getForageCooldownText = (tags: string[] | undefined) => {
    if (tags?.includes('crystal')) return 'Crystal is recharging';
    if (tags?.includes('tree')) return 'Tree is resting';
    if (tags?.some(tag => tag === 'bush' || tag === 'fern')) return 'Brush is resting';
    return 'Object is resting';
  };

  const isLeverObject = (item: ShopCatalogItem) => (
    item.tags?.includes('lever') || item.assetId === 'object.temple.Floor_lever'
  );

  const isTrapObject = (item: ShopCatalogItem) => (
    item.tags?.includes('trap') || item.tags?.includes('hazard')
  );

  const isGateObject = (item: ShopCatalogItem) => (
    item.tags?.includes('gate')
  );

  const getObjectInspectText = (item: ShopCatalogItem | null, fallbackType: string, isFirstInspect: boolean) => {
    const tags = item?.tags ?? [];
    const detail = (() => {
      if (tags.includes('trap') || tags.includes('hazard')) return 'Dormant trap';
      if (tags.includes('lever')) return 'Lever is not linked yet';
      if (tags.includes('gate')) return 'Gate is locked in place';
      if (tags.includes('mechanism')) return 'Mechanism is not linked yet';
      if (tags.includes('chest')) return 'Chest is sealed for now';
      if (tags.includes('fire')) return 'Flame flickers';
      if (tags.some(tag => ['relic', 'statue', 'idol'].includes(tag))) return 'Ancient relic';
      if (tags.some(tag => ['structure', 'wall', 'facade'].includes(tag))) return 'Sturdy structure';
      if (tags.includes('decor')) return 'Decor inspected';
      return `Inspected ${item?.name ?? fallbackType}`;
    })();
    return isFirstInspect ? `Examined: ${detail}` : detail;
  };

  const interactWithObject = (object: MapObject) => {
    const item = getPlaceableItem(object.type);
    if (!item) {
      showWorldToast({ text: 'Object data missing', tone: 'warn' });
      return;
    }

    pulseObject(object.id);
    const interactionResult = markSanctuaryObjectInteraction(object.id, object.type, 'inspect');
    if (interactionResult.ok && interactionResult.isFirst) {
      recordRpgDiscovery(object.type, 'inspect');
    }

    if (isLeverObject(item)) {
      const toggle = markSanctuaryObjectInteraction(object.id, object.type, 'toggle_lever');
      if (!toggle.ok) {
        showWorldToast({ text: 'Lever jammed', item, tone: 'warn' });
        return;
      }
      const isOn = toggle.count % 2 === 1;
      showWorldToast({
        text: isOn ? 'Lever switched on' : 'Lever switched off',
        item,
        tone: 'muted',
      });
      return;
    }

    if (isTrapObject(item)) {
      const toggle = markSanctuaryObjectInteraction(object.id, object.type, 'disable_trap');
      if (!toggle.ok) {
        showWorldToast({ text: 'Trap mechanism jammed', item, tone: 'warn' });
        return;
      }
      const isDisabled = toggle.count % 2 === 1;
      showWorldToast({
        text: isDisabled ? 'Trap disarmed' : 'Trap re-armed',
        item,
        tone: 'muted',
      });
      return;
    }

    if (isGateObject(item)) {
      const rattle = markSanctuaryObjectInteraction(object.id, object.type, 'rattle_gate');
      if (!rattle.ok) {
        showWorldToast({ text: 'Gate does not budge', item, tone: 'warn' });
        return;
      }
      showWorldToast({
        text: rattle.count % 2 === 1 ? 'Gate rattles' : 'Gate stays locked',
        item,
        tone: 'muted',
      });
      return;
    }

    if (item.interactLoot) {
      const drops = rollHarvestDrops(item.interactLoot.drops);
      const result = claimSanctuaryReward(
        item.interactLoot.claimKey,
        object.type,
        'chest',
        item.interactLoot.coins,
        drops,
      );
      if (result.ok) {
        refreshCoins();
        bumpInventoryRevision();
        const firstDrop = result.drops[0];
        showWorldToast({
          text: `Opened ${getRewardText(result.coins, result.drops)}`,
          item: firstDrop ? getRpgItem(firstDrop.itemId) : item,
          tone: 'success',
        });
      } else {
        showWorldToast({
          text: result.reason === 'already_claimed' ? 'Chest is empty' : 'Chest jammed',
          item,
          tone: result.reason === 'already_claimed' ? 'muted' : 'warn',
        });
      }
      return;
    }

    if (!item.forageDrops?.length) {
      showWorldToast({
        text: getObjectInspectText(item, object.type, interactionResult.ok && interactionResult.isFirst),
        item,
        tone: interactionResult.ok ? 'muted' : 'warn',
      });
      return;
    }

    const now = Date.now();
    if ((forageCooldowns.current[object.id] ?? 0) > now) {
      showWorldToast({ text: getForageCooldownText(item.tags), tone: 'muted' });
      return;
    }
    forageCooldowns.current[object.id] = now + 1200;

    const drop = rollForageDrop(item.forageDrops);
    if (!drop) {
      showWorldToast({ text: 'Nothing dropped', tone: 'muted' });
      return;
    }

    const dropDef = getRpgItem(drop.itemId);
    addSandboxInventoryItem(drop.itemId, drop.quantity, 'forage');
    showWorldToast({
      text: `+${drop.quantity} ${dropDef?.name ?? drop.itemId}`,
      item: dropDef,
      tone: 'success',
    });
  };

  const inspectOrHarvestPlot = (plot: GardenPlot) => {
    const growth = getPlotGrowthInfo(plot);
    if (!growth.crop) {
      showWorldToast({ text: 'Crop data missing', tone: 'warn' });
      return;
    }

    if (growth.stage < 2) {
      const nextStage = Math.min(2, growth.stage + 1) as GrowthStage;
      if (isRaining) {
        updatePlantGrowth(plot.id, nextStage);
        refreshGardenPlots();
        showWorldToast({
          text: nextStage >= 2 ? 'Rain matured crop' : 'Rain watered crop',
          item: getRpgItem(plot.seed_item_id),
          tone: 'success',
        });
        return;
      }

      const result = advanceGardenPlotWithInventoryItem(plot.id, RPG_WATER_DROPS_ITEM_ID, nextStage);
      if (result.ok) {
        bumpInventoryRevision();
        refreshGardenPlots();
        showWorldToast({
          text: result.stage >= 2 ? 'Watered to mature' : 'Watered crop',
          item: getRpgItem(RPG_WATER_DROPS_ITEM_ID),
          tone: 'success',
        });
      } else {
        if (growth.stage !== plot.growth_stage) {
          refreshGardenPlots();
        }
        showWorldToast({
          text: result.reason === 'no_item'
            ? `${growth.label}: ${growth.remainingMinutes}m left`
            : result.reason === 'no_plot'
              ? 'Plot missing'
              : 'Could not water',
          item: getRpgItem(plot.seed_item_id),
          tone: result.reason === 'no_item' ? 'muted' : 'warn',
        });
      }
      return;
    }

    const drops = rollHarvestDrops(growth.crop.harvest.drops);
    const result = harvestGardenPlot(plot.id, growth.crop.harvest.coins, drops);
    if (!result.ok) {
      showWorldToast({
        text: result.reason === 'no_plot' ? 'Already harvested' : 'Harvest failed',
        tone: 'warn',
      });
      refreshGardenPlots();
      return;
    }

    refreshCoins();
    bumpInventoryRevision();
    refreshGardenPlots();

    const firstDrop = result.drops[0];
    const firstDropItem = firstDrop ? getRpgItem(firstDrop.itemId) : null;
    const dropText = firstDrop ? `, +${firstDrop.quantity} ${firstDropItem?.name ?? firstDrop.itemId}` : '';
    showWorldToast({
      text: `Harvested +${result.coins} coins${dropText}`,
      item: firstDropItem ?? getRpgItem(plot.seed_item_id),
      tone: 'success',
    });
  };

  function handleAttack() {
    if (buildItem) return;
    if (isAttacking.value) return;
    isAttacking.value = true;
    avatarIsPlaying.value = true;
    setSpriteSource(ATTACK_SPRITE);
    setSpriteFrameCount(8);

    const target = getTargetedTile();
    try {
      const stats = db.getFirstSync<{ str: number; foc: number; agi: number; wis: number; res: number }>(
        'SELECT strength as str, focus as foc, agility as agi, wisdom as wis, resilience as res FROM rpg_state WHERE id = 1',
      );
      if (stats) {
        const atk = Math.floor((stats.str + stats.foc + stats.agi + stats.wis + stats.res) / 5);
        console.log(`[Combat] Hit tile [${target.row}, ${target.col}] with ATK: ${atk}`);
      }
    } catch {}

    setTimeout(() => {
      isAttacking.value = false;
      setSpriteSource(WALK_SPRITE);
      setSpriteFrameCount(6);
    }, 800);
  }

  function handleInteract() {
    if (isAttacking.value) return;

    if (buildItem) {
      confirmBuildPlacement();
      return;
    }

    const target = getTargetedTile();
    const resolvedTarget = resolveInteractionTargetAt(target.row, target.col);
    if (activeZone === 'sanctuary') {
      if (resolvedTarget?.kind === 'object' && resolvedTarget.object) {
        interactWithObject(resolvedTarget.object);
        return;
      }

      if (resolvedTarget?.kind === 'plot' && resolvedTarget.plot) {
        inspectOrHarvestPlot(resolvedTarget.plot);
        return;
      }

      if (resolvedTarget?.kind === 'portal') {
        enterZone('dungeon');
        return;
      }
      console.log(`[Interact] Sanctuary tile [${target.row}, ${target.col}]`);
      return;
    }

    if (resolvedTarget?.kind === 'portal') enterZone('sanctuary');
    else console.log(`[Interact] Dungeon tile [${target.row}, ${target.col}]`);
  }

  function getTileColor(type: TileType) {
    switch (type) {
      case TileType.GRASS: return '#5c8f56';
      case TileType.WALL: return '#56615b';
      case TileType.WATER: return '#4d8aa8';
      case TileType.PORTAL_DUNGEON: return '#8f63b8';
      case TileType.PORTAL_SANCTUARY: return '#d7b84b';
      default: return '#1b1f1b';
    }
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={worldGesture}>
        <Animated.View style={[styles.world, { width: mapWidth, height: mapHeight }, worldStyle]}>
          {mapData.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.mapRow}>
              {row.map((tile, colIndex) => (
                <View
                  key={`tile-${rowIndex}-${colIndex}`}
                  style={[styles.tile, { backgroundColor: getTileColor(tile as TileType) }]}
                />
              ))}
            </View>
          ))}

          {activeZone === 'sanctuary' && mapObjects.map(obj => (
            buildItem?.mode === 'edit' && buildItem.objectId === obj.id ? null :
            <SanctuaryObject
              key={obj.id}
              id={obj.id}
              type={obj.type}
              row={obj.row}
              col={obj.col}
              avatarX={avatarX}
              avatarY={avatarY}
              isInteracting={interactingObjectId === obj.id}
              isTargeted={interactionPrompt?.kind === 'object' && interactionPrompt.object?.id === obj.id}
              onMoveRequest={handleObjectLongPress}
            />
          ))}

          {activeZone === 'sanctuary' && gardenPlots.map(plot => {
            const growth = getPlotGrowthInfo(plot);
            const cropFrame = growth.crop?.stageFrames?.[growth.stage] ?? null;
            return (
              <View
                key={plot.id}
                pointerEvents="none"
                style={[
                  styles.gardenPlot,
                  growth.stage === 1 && styles.gardenPlotGrowing,
                  growth.stage >= 2 && styles.gardenPlotMature,
                  interactionPrompt?.kind === 'plot' && interactionPrompt.plot?.id === plot.id && styles.gardenPlotTargeted,
                  {
                    left: plot.col * TILE_SIZE,
                    top: plot.row * TILE_SIZE,
                    zIndex: plot.row,
                  },
                ]}
              >
                {cropFrame ? (
                  <RpgSpriteFrameView frame={cropFrame} size={growth.stage >= 2 ? 34 : 28} />
                ) : (
                  <RpgItemIcon item={getRpgItem(plot.seed_item_id)} size={growth.stage >= 2 ? 25 : 22} fallbackLabel={plot.seed_item_id} />
                )}
                <Text style={[styles.gardenStageText, growth.stage >= 2 && styles.gardenStageMatureText]}>
                  {growth.stage >= 2 ? '!' : growth.stage === 1 ? '+' : ''}
                </Text>
              </View>
            );
          })}

          {(buildCatalogItem || buildSeedItem) && (
            <>
              {buildCatalogItem ? (
                <Animated.View style={buildGhostStyle}>
                  <RpgItemWorldArt
                    item={buildCatalogItem}
                    width={buildGhostWidth}
                    height={buildGhostHeight}
                    fallbackLabel={buildItem?.itemId ?? 'object'}
                  />
                </Animated.View>
              ) : (
                <Animated.View style={[buildGhostStyle, styles.seedGhost]}>
                  <RpgItemIcon item={buildSeedItem} size={24} fallbackLabel={buildItem?.itemId ?? 'seed'} />
                </Animated.View>
              )}
              {placementReport?.cells.map((cell, index) => (
                <View
                  key={`${cell.row}:${cell.col}:${index}`}
                  pointerEvents="none"
                  style={[
                    styles.placementCell,
                    {
                      left: cell.col * TILE_SIZE,
                      top: cell.row * TILE_SIZE,
                      borderColor: cell.valid ? '#35ff70' : '#ff3b30',
                      backgroundColor: cell.valid ? 'rgba(53,255,112,0.34)' : 'rgba(255,59,48,0.42)',
                    },
                  ]}
                />
              ))}
            </>
          )}

          {!buildItem && interactionPrompt?.cells.map((cell, index) => (
            <View
              key={`target-${interactionPrompt.kind}-${cell.row}:${cell.col}:${index}`}
              pointerEvents="none"
              style={[
                styles.interactionTargetCell,
                {
                  left: cell.col * TILE_SIZE,
                  top: cell.row * TILE_SIZE,
                },
              ]}
            />
          ))}

          <Animated.View style={avatarStyle}>
            <SpriteAnimator
              source={spriteSource}
              frameWidth={64}
              frameHeight={64}
              frameCount={spriteFrameCount}
              fps={10}
              directionRow={avatarDirection}
              isPlaying={avatarIsPlaying}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {activeZone === 'sanctuary' && isRaining && (
        <View pointerEvents="none" style={styles.rainOverlay}>
          {RAIN_DROPS.map((drop, index) => (
            <View
              key={index}
              style={[
                styles.rainDrop,
                {
                  left: drop.leftRatio * dimensions.width,
                  top: drop.topRatio * dimensions.height,
                  height: drop.height,
                  opacity: drop.opacity,
                },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </Pressable>

        <View style={styles.tabs}>
          <Pressable onPress={() => enterZone('sanctuary')}>
            <Text style={[styles.tabText, activeZone === 'sanctuary' && styles.tabTextActive]}>Sanctuary</Text>
          </Pressable>
          <Pressable onPress={() => enterZone('dungeon')}>
            <Text style={[styles.tabText, activeZone === 'dungeon' && styles.tabTextActive]}>Dungeon</Text>
          </Pressable>
        </View>

        <View style={styles.currencyStack}>
          <View style={styles.currencyPill}>
            <Feather name="circle" size={16} color="#f1c40f" />
            <Text style={styles.currencyText}>{coins}</Text>
          </View>
          {!buildItem && (
            <View style={styles.hudActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open backpack"
                style={styles.iconHudBtn}
                onPress={() => {
                  setIsShopOpen(false);
                  setIsArchiveOpen(false);
                  setIsBackpackOpen(true);
                }}
              >
                <RpgSpriteFrameView frame={RPG_UI_FRAMES.backpack} size={24} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open archive"
                style={styles.iconHudBtn}
                onPress={() => {
                  setIsShopOpen(false);
                  setIsBackpackOpen(false);
                  setIsArchiveOpen(true);
                }}
              >
                <RpgSpriteFrameView frame={RPG_ARCHIVE_FRAMES.closedBook} size={24} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open shop"
                style={styles.shopBtn}
                onPress={() => {
                  setIsBackpackOpen(false);
                  setIsArchiveOpen(false);
                  setIsShopOpen(true);
                }}
              >
                <Feather name="shopping-bag" size={16} color="#fff" />
                <Text style={styles.shopText}>Shop</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {buildItem && (
        <View style={styles.modePill}>
          <Feather name={buildItem.mode === 'edit' ? 'move' : 'plus-square'} size={15} color="#fff" />
          <Text style={styles.modeText}>
            {placementReport?.valid
              ? `${buildItem.label}: drag ghost, Interact confirms`
              : `${placementReport?.reason ?? 'Unavailable'}: drag to a clear cell`}
          </Text>
          <Pressable style={styles.modeCloseBtn} onPress={clearBuildMode}>
            <Feather name="x" size={14} color="#fff" />
          </Pressable>
        </View>
      )}

      {selectedObject && (
        <View style={styles.editBar}>
          <Pressable style={styles.editBtn} onPress={stashEditingObject}>
            <Feather name="archive" size={17} color="#fff" />
            <Text style={styles.editText}>Stash</Text>
          </Pressable>
          <Pressable style={styles.editBtn} onPress={clearBuildMode}>
            <Feather name="x" size={17} color="#fff" />
            <Text style={styles.editText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

      {worldToast && (
        <View style={[styles.worldToast, worldToast.tone === 'success' && styles.worldToastSuccess]}>
          {worldToast.item ? (
            <RpgItemIcon item={worldToast.item} size={22} />
          ) : (
            <Feather name={worldToast.tone === 'warn' ? 'alert-circle' : 'info'} size={16} color="#fff" />
          )}
          <Text style={styles.worldToastText}>{worldToast.text}</Text>
        </View>
      )}

      {!buildItem && interactionPrompt && (
        <View style={styles.interactionPrompt}>
          {interactionPrompt.item ? (
            <RpgItemIcon item={interactionPrompt.item} size={22} />
          ) : (
            <Feather name="corner-up-right" size={16} color="#fff" />
          )}
          <View style={styles.interactionPromptTextStack}>
            <Text style={styles.interactionPromptLabel} numberOfLines={1}>{interactionPrompt.label}</Text>
            <Text style={styles.interactionPromptDetail} numberOfLines={1}>{interactionPrompt.detail}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionBtns}>
        <Pressable style={styles.actionBtn} onPress={handleInteract}>
          <Feather name="mouse-pointer" size={20} color="#fff" />
          <Text style={styles.actionText}>Interact</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.attackBtn, buildItem && styles.disabledBtn]}
          onPress={handleAttack}
        >
          <Feather name="crosshair" size={20} color="#fff" />
          <Text style={styles.actionText}>Attack</Text>
        </Pressable>
      </View>

      <SanctuaryShop
        isOpen={isShopOpen}
        coins={coins}
        refreshKey={inventoryRevision}
        onClose={() => setIsShopOpen(false)}
        onPurchaseRequest={(itemId, price) => {
          try {
            const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
            const item = getRpgItem(itemId);
            if (!state || state.coins < price) {
              const shortfall = Math.max(0, price - (state?.coins ?? 0));
              showWorldToast({
                text: `Need ${shortfall} more coins`,
                item,
                tone: 'warn',
              });
              return { ok: false, message: `Need ${shortfall} more coins` };
            }
            db.execSync('BEGIN TRANSACTION');
            db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', price);
            db.runSync(
              `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
               ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
              itemId,
            );
            db.execSync('COMMIT');
            recordRpgDiscovery(itemId, 'buy');
            refreshCoins();
            bumpInventoryRevision();
            showWorldToast({
              text: `Bought ${item?.name ?? itemId}`,
              item,
              tone: 'success',
            });
            return { ok: true, message: `Bought ${item?.name ?? itemId}` };
          } catch (e) {
            try { db.execSync('ROLLBACK'); } catch {}
            console.warn('Failed to purchase item', e);
            showWorldToast({ text: 'Buy failed', item: getRpgItem(itemId), tone: 'warn' });
            return { ok: false, message: 'Buy failed. Try again.' };
          }
        }}
      />
      <RpgBackpack
        isOpen={isBackpackOpen}
        refreshKey={inventoryRevision}
        canPlace={activeZone === 'sanctuary'}
        onClose={() => setIsBackpackOpen(false)}
        onPlaceItem={handleBackpackPlaceItem}
        onPlantSeed={handleBackpackPlantSeed}
      />
      <RpgArchive
        isOpen={isArchiveOpen}
        refreshKey={inventoryRevision}
        onClose={() => setIsArchiveOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  world: {
    position: 'absolute',
    flexDirection: 'column',
  },
  mapRow: {
    flexDirection: 'row',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(9,20,12,0.18)',
  },
  placementCell: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 3,
    zIndex: 2000,
  },
  interactionTargetCell: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 2,
    borderColor: '#fff2bb',
    backgroundColor: 'rgba(255,242,187,0.14)',
    zIndex: 1990,
  },
  gardenPlot: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(72,48,28,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.42)',
  },
  gardenPlotGrowing: {
    backgroundColor: 'rgba(38,106,46,0.44)',
    borderColor: 'rgba(151,255,146,0.58)',
  },
  gardenPlotMature: {
    backgroundColor: 'rgba(155,117,22,0.52)',
    borderColor: 'rgba(255,224,112,0.82)',
  },
  gardenPlotTargeted: {
    borderWidth: 3,
    borderColor: '#fff2bb',
  },
  gardenStageText: {
    position: 'absolute',
    right: 2,
    bottom: 0,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  gardenStageMatureText: {
    color: '#fff',
    fontSize: 11,
  },
  seedGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(53,255,112,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.58)',
  },
  rainOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
  },
  rainDrop: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
    backgroundColor: '#bde9ff',
    transform: [{ rotate: '12deg' }],
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.ui.bold,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabTextActive: {
    color: '#fff',
  },
  currencyStack: {
    alignItems: 'flex-end',
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currencyText: {
    color: '#f1c40f',
    fontFamily: fonts.ui.bold,
    fontSize: 16,
    marginLeft: 6,
  },
  hudActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconHudBtn: {
    width: 38,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBtn: {
    minWidth: 76,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  shopText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 5,
  },
  modePill: {
    position: 'absolute',
    top: 112,
    left: 20,
    right: 20,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  modeText: {
    flexShrink: 1,
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 8,
    marginRight: 8,
    textAlign: 'center',
  },
  modeCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBar: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 100,
  },
  editBtn: {
    width: 78,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginTop: 2,
  },
  worldToast: {
    position: 'absolute',
    top: 158,
    alignSelf: 'center',
    minHeight: 38,
    maxWidth: 260,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 110,
  },
  worldToastSuccess: {
    borderColor: 'rgba(53,255,112,0.5)',
  },
  worldToastText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 8,
  },
  interactionPrompt: {
    position: 'absolute',
    right: 24,
    bottom: 150,
    zIndex: 105,
    minWidth: 150,
    maxWidth: 230,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.62)',
    backgroundColor: 'rgba(10,13,12,0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionPromptTextStack: {
    flex: 1,
    minWidth: 0,
  },
  interactionPromptLabel: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  interactionPromptDetail: {
    marginTop: 1,
    color: '#d4e4d1',
    fontFamily: fonts.ui.regular,
    fontSize: 10,
  },
  actionBtns: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
  actionBtn: {
    width: 86,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attackBtn: {
    backgroundColor: '#e74c3c',
    borderColor: 'rgba(255,255,255,0.75)',
  },
  disabledBtn: {
    opacity: 0.42,
  },
  actionText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    marginTop: 3,
  },
});
