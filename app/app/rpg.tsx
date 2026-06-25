import React, { useEffect, useMemo, useState } from 'react';
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
import { SanctuaryObject } from '../src/engine/SanctuaryObject';
import { SanctuaryShop, SHOP_CATALOG, type ShopCatalogItem } from '../src/engine/SanctuaryShop';
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
type PlacementItem = { itemId: string; label: string };

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function getItem(type: string | null): ShopCatalogItem | null {
  if (!type) return null;
  return SHOP_CATALOG[type as keyof typeof SHOP_CATALOG] ?? null;
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
  const [placingItem, setPlacingItem] = useState<PlacementItem | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<number | null>(null);
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);

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
  const placingColWidth = useSharedValue(0);
  const placingColHeight = useSharedValue(0);

  const selectedObject = useMemo(
    () => mapObjects.find(obj => obj.id === editingObjectId) ?? null,
    [editingObjectId, mapObjects],
  );

  const refreshMapObjects = () => {
    setMapObjects(db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects'));
  };

  const refreshCoins = () => {
    const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
    if (state) setCoins(state.coins);
  };

  const enterZone = (zone: Zone) => {
    setActiveZone(zone);
    setPlacingItem(null);
    setEditingObjectId(null);
    joyX.value = 0;
    joyY.value = 0;
    avatarIsPlaying.value = false;
    avatarDirection.value = 0;
    avatarX.value = TILE_SIZE * 2;
    avatarY.value = zone === 'sanctuary' ? TILE_SIZE * 2 : TILE_SIZE;
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

  const isPlacementValid = (
    row: number,
    col: number,
    itemId: string,
    ignoreObjectId: number | null = null,
  ) => {
    if (activeZone !== 'sanctuary') return false;
    const item = getItem(itemId);
    if (!item) return false;

    const occupiedByAvatar = new Set(
      avatarCells(avatarX.value, avatarY.value).map(cell => `${cell.row}:${cell.col}`),
    );

    for (let dr = 0; dr < item.colHeight; dr++) {
      for (let dc = 0; dc < item.colWidth; dc++) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        if (checkRow < 0 || checkRow >= mapRowsCount || checkCol < 0 || checkCol >= mapColsCount) {
          return false;
        }
        if (occupiedByAvatar.has(`${checkRow}:${checkCol}`)) return false;

        const tileType = mapData[checkRow][checkCol] as TileType;
        if (TILE_COLLISION[tileType]) return false;

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
        if (hasObject) return false;
      }
    }

    return true;
  };

  const placeInventoryItemAtTarget = () => {
    if (!placingItem) return;
    const target = getTargetedTile();
    if (!isPlacementValid(target.row, target.col, placingItem.itemId)) return;

    try {
      db.execSync('BEGIN TRANSACTION');
      const result = db.runSync(
        'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
        placingItem.itemId,
      );
      if (result.changes <= 0) {
        db.execSync('ROLLBACK');
        return;
      }
      db.runSync(
        'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
        placingItem.itemId, target.row, target.col,
      );
      db.execSync('COMMIT');
      setPlacingItem(null);
      refreshMapObjects();
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to place inventory item', e);
    }
  };

  const moveEditingObjectTo = (row: number, col: number) => {
    if (!selectedObject) return;
    if (!isPlacementValid(row, col, selectedObject.type, selectedObject.id)) return;

    try {
      db.runSync(
        'UPDATE sanctuary_objects SET row = ?, col = ? WHERE id = ?',
        row, col, selectedObject.id,
      );
      setEditingObjectId(null);
      refreshMapObjects();
    } catch (e) {
      console.warn('Failed to move object', e);
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
      setEditingObjectId(null);
      refreshMapObjects();
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to stash object', e);
    }
  };

  const screenToWorld = (screenX: number, screenY: number) => {
    const worldX = (screenX - cameraX.value) / mapScale.value;
    const worldY = (screenY - cameraY.value) / mapScale.value;
    return {
      col: Math.floor(worldX / TILE_SIZE),
      row: Math.floor(worldY / TILE_SIZE),
    };
  };

  const handleWorldTap = (screenX: number, screenY: number) => {
    if (!selectedObject) return;
    const target = screenToWorld(screenX, screenY);
    moveEditingObjectTo(target.row, target.col);
  };

  const handleObjectLongPress = (objectId: number) => {
    setPlacingItem(null);
    setEditingObjectId(objectId);
  };

  const handleShopSelectInventoryItem = (itemId: string) => {
    const item = getItem(itemId);
    if (!item) return;
    setEditingObjectId(null);
    setPlacingItem({ itemId, label: item.name });
    setIsShopOpen(false);
  };

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
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
    const item = getItem(placingItem?.itemId ?? null);
    placingColWidth.value = item?.colWidth ?? 0;
    placingColHeight.value = item?.colHeight ?? 0;
  }, [placingItem]);

  useEffect(() => {
    const flat = mapData.flat().map(tile => (TILE_COLLISION[tile as TileType] ? 1 : 0));

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
            flat[row * mapColsCount + col] = 1;
          }
        }
      });
    }

    collisionMap.value = flat;
    mapCols.value = mapColsCount;
    mapRows.value = mapRowsCount;
  }, [activeZone, mapObjects, mapData, mapColsCount, mapRowsCount]);

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

  const placementPreviewStyle = useAnimatedStyle(() => {
    if (placingColWidth.value <= 0 || placingColHeight.value <= 0) {
      return { opacity: 0, position: 'absolute', left: 0, top: 0, width: 0, height: 0 };
    }

    const footX = avatarX.value + AVATAR_FOOT_BOX.offsetX + AVATAR_FOOT_BOX.width / 2;
    const footY = avatarY.value + AVATAR_FOOT_BOX.offsetY + AVATAR_FOOT_BOX.height / 2;
    let col = Math.floor(footX / TILE_SIZE);
    let row = Math.floor(footY / TILE_SIZE);
    const dir = avatarDirection.value;
    if (dir === 0) row += 1;
    else if (dir === 1) col -= 1;
    else if (dir === 2) col += 1;
    else if (dir === 3) row -= 1;

    let valid = true;
    const avatarStartCol = Math.floor((avatarX.value + AVATAR_FOOT_BOX.offsetX) / TILE_SIZE);
    const avatarEndCol = Math.floor((avatarX.value + AVATAR_FOOT_BOX.offsetX + AVATAR_FOOT_BOX.width - 1) / TILE_SIZE);
    const avatarStartRow = Math.floor((avatarY.value + AVATAR_FOOT_BOX.offsetY) / TILE_SIZE);
    const avatarEndRow = Math.floor((avatarY.value + AVATAR_FOOT_BOX.offsetY + AVATAR_FOOT_BOX.height - 1) / TILE_SIZE);

    for (let dr = 0; dr < placingColHeight.value; dr++) {
      for (let dc = 0; dc < placingColWidth.value; dc++) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        if (checkRow < 0 || checkRow >= mapRows.value || checkCol < 0 || checkCol >= mapCols.value) {
          valid = false;
          break;
        }
        if (collisionMap.value[checkRow * mapCols.value + checkCol] === 1) {
          valid = false;
          break;
        }
        if (
          checkRow >= avatarStartRow &&
          checkRow <= avatarEndRow &&
          checkCol >= avatarStartCol &&
          checkCol <= avatarEndCol
        ) {
          valid = false;
          break;
        }
      }
    }

    return {
      position: 'absolute',
      left: col * TILE_SIZE,
      top: row * TILE_SIZE,
      width: placingColWidth.value * TILE_SIZE,
      height: placingColHeight.value * TILE_SIZE,
      borderWidth: 2,
      borderColor: valid ? '#2ecc71' : '#e74c3c',
      backgroundColor: valid ? 'rgba(46, 204, 113, 0.28)' : 'rgba(231, 76, 60, 0.3)',
      opacity: 1,
      zIndex: 1000,
    };
  });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = mapScale.value;
    })
    .onUpdate(event => {
      mapScale.value = clamp(pinchStartScale.value * event.scale, MIN_ZOOM, MAX_ZOOM);
    });

  const tapGesture = Gesture.Tap()
    .enabled(editingObjectId !== null)
    .onEnd(event => {
      runOnJS(handleWorldTap)(event.absoluteX, event.absoluteY);
    });

  const worldGesture = Gesture.Simultaneous(pinchGesture, tapGesture);

  function handleAttack() {
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

    if (placingItem) {
      placeInventoryItemAtTarget();
      return;
    }

    const target = getTargetedTile();
    if (activeZone === 'sanctuary') {
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
      case TileType.GRASS: return '#2ecc71';
      case TileType.WALL: return '#7f8c8d';
      case TileType.WATER: return '#3498db';
      case TileType.PORTAL_DUNGEON: return '#9b59b6';
      case TileType.PORTAL_SANCTUARY: return '#f1c40f';
      default: return '#000';
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
            <SanctuaryObject
              key={obj.id}
              id={obj.id}
              type={obj.type}
              row={obj.row}
              col={obj.col}
              avatarX={avatarX}
              avatarY={avatarY}
              isEditing={obj.id === editingObjectId}
              onMoveRequest={handleObjectLongPress}
            />
          ))}

          <Animated.View style={placementPreviewStyle} />

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

      {placingItem && (
        <View style={styles.modePill}>
          <Feather name="plus-square" size={15} color="#fff" />
          <Text style={styles.modeText}>{placingItem.label}: face a free tile, then Interact</Text>
        </View>
      )}

      {selectedObject && (
        <View style={styles.editBar}>
          <Pressable style={styles.editBtn} onPress={() => {
            const target = getTargetedTile();
            moveEditingObjectTo(target.row, target.col);
          }}>
            <Feather name="move" size={17} color="#fff" />
            <Text style={styles.editText}>Move</Text>
          </Pressable>
          <Pressable style={styles.editBtn} onPress={stashEditingObject}>
            <Feather name="archive" size={17} color="#fff" />
            <Text style={styles.editText}>Stash</Text>
          </Pressable>
          <Pressable style={styles.editBtn} onPress={() => setEditingObjectId(null)}>
            <Feather name="x" size={17} color="#fff" />
            <Text style={styles.editText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

      <View style={styles.actionBtns}>
        <Pressable style={styles.actionBtn} onPress={handleInteract}>
          <Feather name="mouse-pointer" size={20} color="#fff" />
          <Text style={styles.actionText}>Interact</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.attackBtn]} onPress={handleAttack}>
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
    borderColor: 'rgba(0,0,0,0.1)',
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
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 8,
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
  actionText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    marginTop: 3,
  },
});
