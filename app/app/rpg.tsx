import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { SanctuaryObject } from '../src/engine/SanctuaryObject';
import { SanctuaryShop } from '../src/engine/SanctuaryShop';
import {
  getPlaceableItem,
  getRpgItem,
  type RpgDrop,
  type ShopCatalogItem,
} from '../src/engine/RpgObjectCatalog';
import { DungeonMap, SanctuaryMap, TILE_COLLISION, TILE_SIZE, TileType } from '../src/engine/MapData';
import { db } from '../src/db/schema';

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

type Zone = 'sanctuary' | 'dungeon';
type MapObject = { id: number; type: string; row: number; col: number };
type BuildItem = {
  mode: 'place' | 'edit';
  itemId: string;
  label: string;
  objectId: number | null;
};
type PlacementCell = { row: number; col: number; valid: boolean };
type PlacementReport = {
  row: number;
  col: number;
  valid: boolean;
  reason: string;
  cells: PlacementCell[];
};
type WorldToast = {
  id: number;
  text: string;
  source?: any;
  tone: 'success' | 'muted' | 'warn';
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

export default function RpgScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [activeZone, setActiveZone] = useState<Zone>('sanctuary');
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [coins, setCoins] = useState(0);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [buildItem, setBuildItem] = useState<BuildItem | null>(null);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [interactingObjectId, setInteractingObjectId] = useState<number | null>(null);
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

  const selectedObject = useMemo(
    () => (
      buildItem?.mode === 'edit'
        ? mapObjects.find(obj => obj.id === buildItem.objectId) ?? null
        : null
    ),
    [buildItem, mapObjects],
  );

  const buildCatalogItem = getItem(buildItem?.itemId ?? null);

  const refreshMapObjects = () => {
    setMapObjects(db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects'));
  };

  const refreshCoins = () => {
    const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
    if (state) setCoins(state.coins);
  };

  const enterZone = (zone: Zone) => {
    setActiveZone(zone);
    setBuildItem(null);
    setPlacementReport(null);
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
  };

  const setBuildAnchor = (row: number, col: number, item: ShopCatalogItem) => {
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
    setBuildItem({ mode, itemId, label: item.name, objectId });
    setPlacementReport(analyzePlacement(anchor.row, anchor.col, itemId, ignoreObjectId));
    setIsShopOpen(false);
  };

  const clearBuildMode = () => {
    setBuildItem(null);
    setPlacementReport(null);
    buildActive.value = 0;
    buildColWidth.value = 0;
    buildColHeight.value = 0;
    buildVisWidth.value = 0;
    buildVisHeight.value = 0;
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
  ) => {
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
  ): PlacementReport => {
    const item = getItem(itemId);
    if (!item || activeZone !== 'sanctuary') {
      return { row, col, valid: false, reason: 'Unavailable', cells: [] };
    }

    const occupiedByAvatar = new Set(
      avatarCells(avatarX.value, avatarY.value).map(cell => `${cell.row}:${cell.col}`),
    );
    let reason = 'Ready';
    const cells: PlacementCell[] = [];

    for (let dr = 0; dr < item.colHeight; dr++) {
      for (let dc = 0; dc < item.colWidth; dc++) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        let valid = true;

        if (checkRow < 0 || checkRow >= mapRowsCount || checkCol < 0 || checkCol >= mapColsCount) {
          valid = false;
          reason = reason === 'Ready' ? 'Out of bounds' : reason;
        } else if (occupiedByAvatar.has(`${checkRow}:${checkCol}`)) {
          valid = false;
          reason = reason === 'Ready' ? 'Avatar' : reason;
        } else if (TILE_COLLISION[mapData[checkRow][checkCol] as TileType]) {
          valid = false;
          reason = reason === 'Ready' ? 'Blocked' : reason;
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
            reason = reason === 'Ready' ? 'Occupied' : reason;
          }
        }

        cells.push({ row: checkRow, col: checkCol, valid });
      }
    }

    const allCellsValid = cells.length > 0 && cells.every(cell => cell.valid);
    if (allCellsValid) {
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
  ) => {
    return analyzePlacement(row, col, itemId, ignoreObjectId).valid;
  };

  const findNearbyValidBuildAnchor = (itemId: string, preferredRow: number, preferredCol: number) => {
    for (let radius = 0; radius <= 6; radius++) {
      for (let row = preferredRow - radius; row <= preferredRow + radius; row++) {
        for (let col = preferredCol - radius; col <= preferredCol + radius; col++) {
          if (Math.abs(row - preferredRow) !== radius && Math.abs(col - preferredCol) !== radius) {
            continue;
          }
          if (isPlacementValid(row, col, itemId)) return { row, col };
        }
      }
    }
    return null;
  };

  const updateBuildReport = (row: number, col: number) => {
    if (!buildItem) return;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    setPlacementReport(analyzePlacement(row, col, buildItem.itemId, ignoreObjectId));
  };

  const confirmBuildPlacement = () => {
    if (!buildItem) return;
    const row = buildRow.value;
    const col = buildCol.value;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    const report = analyzePlacement(row, col, buildItem.itemId, ignoreObjectId);
    setPlacementReport(report);
    if (!report.valid) return;

    try {
      if (buildItem.mode === 'edit' && buildItem.objectId !== null) {
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
      }
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
      db.runSync('DELETE FROM sanctuary_objects WHERE id = ?', selectedObject.id);
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
        selectedObject.type,
      );
      db.execSync('COMMIT');
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

  const handleShopSelectInventoryItem = (itemId: string) => {
    beginBuildMode('place', itemId);
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
      refreshCoins();
    } catch (e) {
      console.warn('Failed to load RPG sandbox state', e);
    }
  }, []);

  useEffect(() => {
    const item = getItem(buildItem?.itemId ?? null);
    buildActive.value = buildItem ? 1 : 0;
    buildColWidth.value = item?.colWidth ?? 0;
    buildColHeight.value = item?.colHeight ?? 0;
    buildVisWidth.value = item?.visWidth ?? 0;
    buildVisHeight.value = item?.visHeight ?? 0;
  }, [buildItem]);

  useEffect(() => {
    const movementFlat = mapData.flat().map(tile => (TILE_COLLISION[tile as TileType] ? 1 : 0));
    if (activeZone === 'sanctuary') {
      mapObjects.forEach(obj => {
        const item = getItem(obj.type);
        const width = item?.colWidth ?? 1;
        const height = item?.colHeight ?? 1;
        for (let dr = 0; dr < height; dr++) {
          for (let dc = 0; dc < width; dc++) {
            const row = obj.row + dr;
            const col = obj.col + dc;
            if (row < 0 || row >= mapRowsCount || col < 0 || col >= mapColsCount) continue;
            movementFlat[row * mapColsCount + col] = 1;
          }
        }
      });
    }

    collisionMap.value = movementFlat;
    mapCols.value = mapColsCount;
    mapRows.value = mapRowsCount;
  }, [activeZone, mapObjects, mapData, mapColsCount, mapRowsCount, buildItem]);

  useEffect(() => {
    if (!buildItem) return;
    const ignoreObjectId = buildItem.mode === 'edit' ? buildItem.objectId : null;
    setPlacementReport(analyzePlacement(buildRow.value, buildCol.value, buildItem.itemId, ignoreObjectId));
  }, [buildItem, mapObjects, activeZone]);

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
      const maxCol = Math.max(0, mapCols.value - buildColWidth.value);
      const maxRow = Math.max(0, mapRows.value - buildColHeight.value);
      const worldX = (event.absoluteX - cameraX.value) / mapScale.value;
      const worldY = (event.absoluteY - cameraY.value) / mapScale.value;
      const nextCol = clamp(Math.floor(worldX / TILE_SIZE) - Math.floor(buildColWidth.value / 2), 0, maxCol);
      const nextRow = clamp(Math.floor(worldY / TILE_SIZE) - Math.floor(buildColHeight.value / 2), 0, maxRow);
      buildCol.value = nextCol;
      buildRow.value = nextRow;
      runOnJS(updateBuildReport)(nextRow, nextCol);
    })
    .onUpdate(event => {
      const maxCol = Math.max(0, mapCols.value - buildColWidth.value);
      const maxRow = Math.max(0, mapRows.value - buildColHeight.value);
      const worldX = (event.absoluteX - cameraX.value) / mapScale.value;
      const worldY = (event.absoluteY - cameraY.value) / mapScale.value;
      const nextCol = clamp(Math.floor(worldX / TILE_SIZE) - Math.floor(buildColWidth.value / 2), 0, maxCol);
      const nextRow = clamp(Math.floor(worldY / TILE_SIZE) - Math.floor(buildColHeight.value / 2), 0, maxRow);
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

  const addSandboxInventoryItem = (itemId: string, quantity: number) => {
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      itemId,
      quantity,
    );
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

  const forageObject = (object: MapObject) => {
    const item = getPlaceableItem(object.type);
    if (!item?.forageDrops?.length) {
      showWorldToast({ text: 'Nothing to gather', tone: 'muted' });
      return;
    }

    const now = Date.now();
    if ((forageCooldowns.current[object.id] ?? 0) > now) {
      showWorldToast({ text: 'Tree is resting', tone: 'muted' });
      return;
    }
    forageCooldowns.current[object.id] = now + 1200;

    pulseObject(object.id);
    const drop = rollForageDrop(item.forageDrops);
    if (!drop) {
      showWorldToast({ text: 'Nothing dropped', tone: 'muted' });
      return;
    }

    const dropDef = getRpgItem(drop.itemId);
    addSandboxInventoryItem(drop.itemId, drop.quantity);
    showWorldToast({
      text: `+${drop.quantity} ${dropDef?.name ?? drop.itemId}`,
      source: dropDef?.source,
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
    if (activeZone === 'sanctuary') {
      const object = getObjectAtTile(target.row, target.col);
      if (object) {
        forageObject(object);
        return;
      }

      const tileType = SanctuaryMap[target.row]?.[target.col];
      if (tileType === TileType.PORTAL_DUNGEON) {
        enterZone('dungeon');
        return;
      }
      console.log(`[Interact] Sanctuary tile [${target.row}, ${target.col}]`);
      return;
    }

    const tileType = DungeonMap[target.row]?.[target.col];
    if (tileType === TileType.PORTAL_SANCTUARY) enterZone('sanctuary');
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
              onMoveRequest={handleObjectLongPress}
            />
          ))}

          {buildCatalogItem && (
            <>
              <Animated.Image
                source={buildCatalogItem.source}
                style={buildGhostStyle}
                resizeMode="contain"
              />
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
                      backgroundColor: cell.valid ? 'rgba(53,255,112,0.2)' : 'rgba(255,59,48,0.24)',
                    },
                  ]}
                />
              ))}
            </>
          )}

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
          <Pressable style={styles.shopBtn} onPress={() => setIsShopOpen(true)}>
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text style={styles.shopText}>Shop</Text>
          </Pressable>
        </View>
      </View>

      {buildItem && (
        <View style={styles.modePill}>
          <Feather name={buildItem.mode === 'edit' ? 'move' : 'plus-square'} size={15} color="#fff" />
          <Text style={styles.modeText}>
            {placementReport?.valid
              ? `${buildItem.label}: drag ghost, Interact confirms`
              : `${placementReport?.reason ?? 'Blocked'}: drag to a clear cell`}
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
          {worldToast.source ? (
            <Image source={worldToast.source} style={styles.worldToastIcon} resizeMode="contain" />
          ) : (
            <Feather name={worldToast.tone === 'warn' ? 'alert-circle' : 'info'} size={16} color="#fff" />
          )}
          <Text style={styles.worldToastText}>{worldToast.text}</Text>
        </View>
      )}

      <View style={styles.actionBtns}>
        <Pressable style={styles.actionBtn} onPress={handleInteract}>
          <Feather name="mouse-pointer" size={20} color="#fff" />
          <Text style={styles.actionText}>{buildItem ? 'Place' : 'Interact'}</Text>
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
        onClose={() => setIsShopOpen(false)}
        onSelectInventoryItem={handleShopSelectInventoryItem}
        onPurchaseRequest={(itemId, price) => {
          try {
            const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
            if (!state || state.coins < price) return;
            db.execSync('BEGIN TRANSACTION');
            db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', price);
            db.runSync(
              `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
               ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
              itemId,
            );
            db.execSync('COMMIT');
            refreshCoins();
          } catch (e) {
            try { db.execSync('ROLLBACK'); } catch {}
            console.warn('Failed to purchase item', e);
          }
        }}
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
    borderWidth: 2,
    zIndex: 2000,
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
  shopBtn: {
    marginTop: 8,
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
  worldToastIcon: {
    width: 22,
    height: 22,
  },
  worldToastText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 8,
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
