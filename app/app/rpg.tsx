import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useFrameCallback,
  useAnimatedReaction,
  runOnJS
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fonts } from '../src/theme/typography';
import { Joystick } from '../src/engine/Joystick';
import { SpriteAnimator } from '../src/engine/SpriteAnimator';
import { SanctuaryObject } from '../src/engine/SanctuaryObject';
import { SanctuaryShop, SHOP_CATALOG } from '../src/engine/SanctuaryShop';
import { SanctuaryMap, DungeonMap, TILE_SIZE, TileType, TILE_COLLISION } from '../src/engine/MapData';
import { db } from '../src/db/schema';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const AVATAR_SIZE = 64;
const SPEED = 200; // pixels per second
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;

const WALK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Walk_with_shadow.png');
const ATTACK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_attack_with_shadow.png');

type MapObject = { id: number, type: string, row: number, col: number };
type HeldItem = { itemId: string; objectId: number | null; label: string };

export default function RpgScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [activeZone, setActiveZone] = useState<'sanctuary' | 'dungeon'>('sanctuary');

  const mapData = activeZone === 'sanctuary' ? SanctuaryMap : DungeonMap;
  const MAP_WIDTH = mapData[0].length * TILE_SIZE;
  const MAP_HEIGHT = mapData.length * TILE_SIZE;

  // We convert the collision map to a flat 1D array for the UI thread worklet
  // 1 = blocked, 0 = walkable
  const collisionFlat = mapData.flat().map(t => TILE_COLLISION[t as TileType] ? 1 : 0);
  const collisionMap = useSharedValue(collisionFlat);
  const mapCols = useSharedValue(mapData[0].length);
  const mapRows = useSharedValue(mapData.length);

  const joyX = useSharedValue(0);
  const joyY = useSharedValue(0);

  // Avatar world coordinates
  const avatarX = useSharedValue(TILE_SIZE * 2);
  const avatarY = useSharedValue(TILE_SIZE * 2);
  const avatarDirection = useSharedValue(0);
  const avatarIsPlaying = useSharedValue(false);
  const isAttacking = useSharedValue(false);
  const isCarrying = useSharedValue(false);
  const mapScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [coins, setCoins] = useState(0);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [dragImageSource, setDragImageSource] = useState<any>(null);
  const [heldItem, setHeldItem] = useState<HeldItem | null>(null);
  const [zoomLabel, setZoomLabel] = useState('100%');

  // Drag & Drop Physics State
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragItemId = useSharedValue<string | null>(null);
  const dragItemColWidth = useSharedValue(1);
  const dragItemColHeight = useSharedValue(1);
  const dragItemVisWidth = useSharedValue(2);
  const dragItemVisHeight = useSharedValue(2);
  const hoverCol = useSharedValue(0);
  const hoverRow = useSharedValue(0);

  const isPlacementValid = (r: number, c: number, itemId: string | null, ignoreObjectId: number | null = null) => {
    if (activeZone !== 'sanctuary' || !itemId) return false;
    const catalogItem = SHOP_CATALOG[itemId as keyof typeof SHOP_CATALOG];
    const widthTiles = catalogItem?.colWidth || 1;
    const heightTiles = catalogItem?.colHeight || 1;

    for (let dr = 0; dr < heightTiles; dr++) {
      for (let dc = 0; dc < widthTiles; dc++) {
        const checkR = r + dr;
        const checkC = c + dc;
        if (checkR < 0 || checkR >= mapData.length || checkC < 0 || checkC >= mapData[0].length) {
          return false;
        }
        const tileType = mapData[checkR][checkC] as TileType;
        if (TILE_COLLISION[tileType]) return false;

        const hasObject = mapObjects.some(obj => {
          if (obj.id === ignoreObjectId) return false;
          const existingItem = SHOP_CATALOG[obj.type as keyof typeof SHOP_CATALOG];
          const existingW = existingItem?.colWidth || 1;
          const existingH = existingItem?.colHeight || 1;
          return (
            checkR >= obj.row &&
            checkR < obj.row + existingH &&
            checkC >= obj.col &&
            checkC < obj.col + existingW
          );
        });
        if (hasObject) return false;
      }
    }

    return true;
  };

  const refreshMapObjects = () => {
    const data = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
    setMapObjects(data);
  };

  const getObjectAtTile = (r: number, c: number) => {
    return mapObjects.find(obj => {
      const catalogItem = SHOP_CATALOG[obj.type as keyof typeof SHOP_CATALOG];
      const w = catalogItem?.colWidth || 1;
      const h = catalogItem?.colHeight || 1;
      return r >= obj.row && r < obj.row + h && c >= obj.col && c < obj.col + w;
    }) ?? null;
  };

  const clearHeldItem = () => {
    setHeldItem(null);
    setDragImageSource(null);
    isCarrying.value = false;
  };

  const beginHoldingItem = (itemId: string, objectId: number | null = null) => {
    const catalogItem = SHOP_CATALOG[itemId as keyof typeof SHOP_CATALOG];
    if (!catalogItem) return;
    setHeldItem({ itemId, objectId, label: catalogItem.name });
    setDragImageSource(catalogItem.source);
    dragItemId.value = itemId;
    dragItemColWidth.value = catalogItem.colWidth;
    dragItemColHeight.value = catalogItem.colHeight;
    dragItemVisWidth.value = catalogItem.visWidth;
    dragItemVisHeight.value = catalogItem.visHeight;
    isCarrying.value = true;
    setIsShopOpen(false);
  };

  const beginMovingObject = (objectId: number) => {
    const object = mapObjects.find(obj => obj.id === objectId);
    if (!object) return;
    beginHoldingItem(object.type, object.id);
  };

  const handlePlaceHeldItem = () => {
    if (!heldItem) return;
    const target = getTargetedTile();
    if (!isPlacementValid(target.row, target.col, heldItem.itemId, heldItem.objectId)) {
      console.warn("Cannot place item on blocked tile");
      return;
    }

    try {
      if (heldItem.objectId !== null) {
        db.runSync(
          'UPDATE sanctuary_objects SET row = ?, col = ? WHERE id = ?',
          target.row, target.col, heldItem.objectId,
        );
      } else {
        const result = db.runSync(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
          heldItem.itemId,
        );
        if (result.changes <= 0) {
          console.warn("Item not in inventory or quantity 0");
          return;
        }
        db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          heldItem.itemId, target.row, target.col,
        );
      }
      refreshMapObjects();
      clearHeldItem();
    } catch (e) {
      console.warn("Failed to place held item", e);
    }
  };

  const stashObject = (object: MapObject) => {
    try {
      db.execSync('BEGIN TRANSACTION');
      db.runSync('DELETE FROM sanctuary_objects WHERE id = ?', object.id);
      db.runSync(`
        INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
        ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1
      `, object.type);
      db.execSync('COMMIT');
      refreshMapObjects();
      if (heldItem?.objectId === object.id) clearHeldItem();
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn("Failed to stash object", e);
    }
  };

  const handleStashHeldItem = () => {
    if (!heldItem) return;
    if (heldItem.objectId === null) {
      clearHeldItem();
      return;
    }
    const object = mapObjects.find(obj => obj.id === heldItem.objectId);
    if (object) stashObject(object);
  };

  const handleMoveTargetObject = () => {
    const target = getTargetedTile();
    const object = getObjectAtTile(target.row, target.col);
    if (object) beginMovingObject(object.id);
  };

  const handleStashTargetObject = () => {
    const target = getTargetedTile();
    const object = getObjectAtTile(target.row, target.col);
    if (object) stashObject(object);
  };

  const handleDrop = (r: number, c: number, itemId: string | null) => {
    if (!isPlacementValid(r, c, itemId)) return;

    try {
      // Secure transaction: Only place if inventory actually decremented.
      const result = db.runSync(
        'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
        itemId,
      );

      if (result.changes > 0) {
        db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          itemId, r, c,
        );

        // Refresh objects
        const data = db.getAllSync<{id: number, type: string, row: number, col: number}>('SELECT * FROM sanctuary_objects');
        setMapObjects(data);
      } else {
        console.warn("Item not in inventory or quantity 0");
      }
    } catch (e) {
      console.warn("Failed to drop object", e);
    }
  };

  // Update dimensions on rotate
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove();
  }, []);

  // Fetch sanctuary objects and currency on mount
  useEffect(() => {
    try {
      refreshMapObjects();

      const state = db.getFirstSync<{coins: number}>('SELECT coins FROM rpg_state WHERE id = 1');
      if (state) setCoins(state.coins);
    } catch (e) {
      console.warn("Failed to load map data:", e);
    }
  }, []);

  // Update collision map when zone or objects change
  useEffect(() => {
    const currentMap = activeZone === 'sanctuary' ? SanctuaryMap : DungeonMap;
    const mapWidth = currentMap[0].length;

    const flat = currentMap.flat().map(t => TILE_COLLISION[t as TileType] ? 1 : 0);
    const heldObjectId = heldItem?.objectId ?? null;

    // Inject dynamic objects into the collision map
    if (activeZone === 'sanctuary') {
      mapObjects.forEach(obj => {
        if (obj.id === heldObjectId) return;
        const catalogItem = SHOP_CATALOG[obj.type as keyof typeof SHOP_CATALOG];
        const w = catalogItem?.colWidth || 1;
        const h = catalogItem?.colHeight || 1;

        for (let dr = 0; dr < h; dr++) {
          for (let dc = 0; dc < w; dc++) {
            const index = (obj.row + dr) * mapWidth + (obj.col + dc);
            if (index >= 0 && index < flat.length) {
              flat[index] = 1; // Mark as solid wall
            }
          }
        }
      });
    }

    collisionMap.value = flat;
    mapCols.value = currentMap[0].length;
    mapRows.value = currentMap.length;
  }, [activeZone, mapObjects, heldItem]);

  const handleJoystickMove = (dx: number, dy: number) => {
    joyX.value = dx;
    joyY.value = dy;
  };

  const handleJoystickRelease = () => {
    joyX.value = 0;
    joyY.value = 0;
  };

  useAnimatedReaction(
    () => isDragging.value,
    (isDraggingNow, wasDragging) => {
      if (wasDragging && !isDraggingNow) {
        runOnJS(handleDrop)(hoverRow.value, hoverCol.value, dragItemId.value);
      }
    }
  );

  useFrameCallback((frameInfo) => {
    if (!frameInfo.timeSincePreviousFrame) return;

    // delta time in seconds
    const dt = frameInfo.timeSincePreviousFrame / 1000;

    // Edge panning during drag/build mode. This runs before movement idles out,
    // so the camera still pans while the user holds an object at the edge.
    if (isDragging.value && dt) {
      const PAN_SPEED = 420 / mapScale.value;
      const margin = 50;
      let dx = 0;
      let dy = 0;

      if (dragX.value < margin) dx = PAN_SPEED * dt;
      if (dragX.value > dimensions.width - margin) dx = -PAN_SPEED * dt;
      if (dragY.value < margin) dy = PAN_SPEED * dt;
      if (dragY.value > dimensions.height - margin) dy = -PAN_SPEED * dt;

      if (dx !== 0 || dy !== 0) {
        avatarX.value = Math.max(0, Math.min(MAP_WIDTH, avatarX.value - dx));
        avatarY.value = Math.max(0, Math.min(MAP_HEIGHT, avatarY.value - dy));
      }
    }

    // Lock movement if attacking
    if (isAttacking.value) return;

    if (joyX.value === 0 && joyY.value === 0) {
      avatarIsPlaying.value = false;
      return;
    }

    avatarIsPlaying.value = true;
    // Determine direction (0: Down, 1: Left, 2: Right, 3: Up)
    if (Math.abs(joyX.value) > Math.abs(joyY.value)) {
      avatarDirection.value = joyX.value > 0 ? 2 : 1;
    } else {
      avatarDirection.value = joyY.value > 0 ? 0 : 3;
    }

    // Proposed new positions
    // In 2.5D top-down games, the physical collision box is at the character's feet!
    const feetYOffset = AVATAR_SIZE - 8; // Slightly above the absolute bottom pixel for a natural overlap
    const cx = avatarX.value + (AVATAR_SIZE / 2); // Center X is fine
    const cy = avatarY.value + feetYOffset;

    let nextX = avatarX.value + (joyX.value * SPEED * dt);
    let nextY = avatarY.value + (joyY.value * SPEED * dt);

    const nextCX = nextX + (AVATAR_SIZE / 2);
    const nextCY = nextY + feetYOffset;

    // Collision check helper
    const isBlocked = (checkX: number, checkY: number) => {
      'worklet';
      const col = Math.floor(checkX / TILE_SIZE);
      const row = Math.floor(checkY / TILE_SIZE);
      if (col < 0 || col >= mapCols.value || row < 0 || row >= mapRows.value) return true;
      return collisionMap.value[row * mapCols.value + col] === 1;
    };

    // Check X axis
    if (!isBlocked(nextCX, cy)) {
      avatarX.value = nextX;
    }
    // Check Y axis
    if (!isBlocked(avatarX.value + (AVATAR_SIZE / 2), nextCY)) {
      avatarY.value = nextY;
    }

  });

  function getTargetedTile() {
    // 0: Down, 1: Left, 2: Right, 3: Up
    const cx = avatarX.value + (AVATAR_SIZE / 2);
    const cy = avatarY.value + (AVATAR_SIZE / 2);
    let col = Math.floor(cx / TILE_SIZE);
    let row = Math.floor(cy / TILE_SIZE);

    const dir = avatarDirection.value;
    if (dir === 0) row += 1;
    else if (dir === 1) col -= 1;
    else if (dir === 2) col += 1;
    else if (dir === 3) row -= 1;

    return { row, col };
  }

  function handleAttack() {
    if (isAttacking.value) return;
    isAttacking.value = true;
    avatarIsPlaying.value = true;
    setSpriteSource(ATTACK_SPRITE);
    setSpriteFrameCount(8);

    const target = getTargetedTile();

    // ATK Math calculation
    try {
      const stats = db.getFirstSync<{ str: number, foc: number, agi: number, wis: number, res: number }>(`
        SELECT strength as str, focus as foc, agility as agi, wisdom as wis, resilience as res FROM rpg_state WHERE id = 1
      `);
      if (stats) {
        const atk = Math.floor((stats.str + stats.foc + stats.agi + stats.wis + stats.res) / 5);
        console.log(`[Combat] Hit tile [${target.row}, ${target.col}] with ATK: ${atk}`);
      }
    } catch {}

    // Unlock movement after animation completes (8 frames at 10fps = 800ms)
    setTimeout(() => {
      isAttacking.value = false;
      setSpriteSource(WALK_SPRITE);
      setSpriteFrameCount(6);
    }, 800);
  }

  function handleInteract() {
    if (isAttacking.value) return;
    if (heldItem) {
      handlePlaceHeldItem();
      return;
    }

    const target = getTargetedTile();

    if (activeZone === 'sanctuary') {
      const object = getObjectAtTile(target.row, target.col);
      if (object) {
        beginMovingObject(object.id);
        return;
      }

      const tileType = SanctuaryMap[target.row]?.[target.col];
      if (tileType === TileType.PORTAL_DUNGEON) {
        setActiveZone('dungeon');
        return;
      }
      console.log(`[Interact] Inspecting sanctuary tile [${target.row}, ${target.col}]`);
      return;
    }

    const tileType = DungeonMap[target.row]?.[target.col];
    if (tileType === TileType.PORTAL_SANCTUARY) {
      setActiveZone('sanctuary');
      return;
    }
    console.log(`[Interact] Inspecting dungeon tile [${target.row}, ${target.col}]`);
  }

  const mapTranslateX = useDerivedValue(() => dimensions.width / 2 - (avatarX.value + AVATAR_SIZE / 2) * mapScale.value);
  const mapTranslateY = useDerivedValue(() => dimensions.height / 2 - (avatarY.value + AVATAR_SIZE / 2) * mapScale.value);

  const animatedWorldStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: mapTranslateX.value },
        { translateY: mapTranslateY.value },
        { scale: mapScale.value },
      ],
    };
  });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = mapScale.value;
    })
    .onUpdate((event) => {
      mapScale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale.value * event.scale));
    })
    .onEnd(() => {
      runOnJS(setZoomLabel)(`${Math.round(mapScale.value * 100)}%`);
    });

  const setZoom = (nextScale: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
    mapScale.value = clamped;
    setZoomLabel(`${Math.round(clamped * 100)}%`);
  };

  // Build Mode: Hover Preview Box Math
  useFrameCallback(() => {
    if (isDragging.value) {
      hoverCol.value = Math.floor((dragX.value - mapTranslateX.value) / mapScale.value / TILE_SIZE);
      hoverRow.value = Math.floor((dragY.value - mapTranslateY.value) / mapScale.value / TILE_SIZE);
    }
  });

  const previewStyle = useAnimatedStyle(() => {
    if (!isDragging.value) {
      return { opacity: 0, position: 'absolute', left: 0, top: 0, width: 0, height: 0 };
    }
    const r = hoverRow.value;
    const c = hoverCol.value;

    if (isNaN(r) || isNaN(c)) return { opacity: 0 };

    const widthTiles = dragItemColWidth.value;
    const heightTiles = dragItemColHeight.value;

    let isValid = true;
    for (let dr = 0; dr < heightTiles; dr++) {
      for (let dc = 0; dc < widthTiles; dc++) {
        const checkR = r + dr;
        const checkC = c + dc;
        if (checkR < 0 || checkR >= mapRows.value || checkC < 0 || checkC >= mapCols.value) {
          isValid = false;
          break;
        }
        if (collisionMap.value[checkR * mapCols.value + checkC] === 1) {
          isValid = false;
          break;
        }
      }
    }

    return {
      position: 'absolute',
      left: c * TILE_SIZE,
      top: r * TILE_SIZE,
      width: widthTiles * TILE_SIZE,
      height: heightTiles * TILE_SIZE,
      backgroundColor: isValid ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)',
      opacity: 1,
      borderWidth: 2,
      borderColor: isValid ? '#2ecc71' : '#e74c3c',
      zIndex: 1000,
    };
  });

  const heldPreviewStyle = useAnimatedStyle(() => {
    if (!isCarrying.value) {
      return { opacity: 0, position: 'absolute', left: 0, top: 0, width: 0, height: 0 };
    }

    const widthTiles = dragItemColWidth.value;
    const heightTiles = dragItemColHeight.value;
    const col = Math.floor((avatarX.value + AVATAR_SIZE / 2) / TILE_SIZE);
    const row = Math.floor((avatarY.value + AVATAR_SIZE / 2) / TILE_SIZE);
    let targetCol = col;
    let targetRow = row;
    const dir = avatarDirection.value;
    if (dir === 0) targetRow += 1;
    else if (dir === 1) targetCol -= 1;
    else if (dir === 2) targetCol += 1;
    else if (dir === 3) targetRow -= 1;

    let isValid = true;
    for (let dr = 0; dr < heightTiles; dr++) {
      for (let dc = 0; dc < widthTiles; dc++) {
        const checkR = targetRow + dr;
        const checkC = targetCol + dc;
        if (checkR < 0 || checkR >= mapRows.value || checkC < 0 || checkC >= mapCols.value) {
          isValid = false;
          break;
        }
        if (collisionMap.value[checkR * mapCols.value + checkC] === 1) {
          isValid = false;
          break;
        }
      }
    }

    return {
      position: 'absolute',
      left: targetCol * TILE_SIZE,
      top: targetRow * TILE_SIZE,
      width: widthTiles * TILE_SIZE,
      height: heightTiles * TILE_SIZE,
      backgroundColor: isValid ? 'rgba(46, 204, 113, 0.32)' : 'rgba(231, 76, 60, 0.34)',
      opacity: 1,
      borderWidth: 2,
      borderColor: isValid ? '#2ecc71' : '#e74c3c',
      zIndex: 1001,
    };
  });

  const ghostStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: dragX.value - (dragItemVisWidth.value * TILE_SIZE) / 2, // Center visually
      top: dragY.value - (dragItemVisHeight.value * TILE_SIZE) / 2,
      width: dragItemVisWidth.value * TILE_SIZE,
      height: dragItemVisHeight.value * TILE_SIZE,
      opacity: isDragging.value ? 0.7 : 0,
      zIndex: 9999,
      pointerEvents: 'none',
    };
  });

  const avatarZIndexStyle = useAnimatedStyle(() => {
    return {
      // Z-Index must precisely match the collision feet point!
      zIndex: Math.floor((avatarY.value + AVATAR_SIZE - 8) / TILE_SIZE),
    };
  });

  function getTileColor(type: TileType) {
    switch(type) {
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
      {/* The World Container */}
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[styles.world, { width: MAP_WIDTH, height: MAP_HEIGHT }, animatedWorldStyle]}>
          {mapData.map((row, rIdx) => (
            <View key={`row-${rIdx}`} style={styles.mapRow}>
              {row.map((tile, cIdx) => (
                <View
                  key={`tile-${rIdx}-${cIdx}`}
                  style={[
                    styles.tile,
                    { backgroundColor: getTileColor(tile as TileType) }
                  ]}
                />
              ))}
            </View>
          ))}

          {/* Dynamic Objects */}
          {activeZone === 'sanctuary' && mapObjects.filter(obj => obj.id !== heldItem?.objectId).map(obj => (
            <SanctuaryObject
              key={obj.id}
              id={obj.id}
              type={obj.type}
              row={obj.row}
              col={obj.col}
              avatarY={avatarY}
              avatarX={avatarX}
              onMoveRequest={beginMovingObject}
            />
          ))}

          {/* Build Mode Preview Boxes */}
          <Animated.View style={previewStyle} />
          <Animated.View style={heldPreviewStyle} />
        </Animated.View>
      </GestureDetector>

      {/* The Avatar (Fixed in center of screen) */}
      <Animated.View style={[
        styles.avatarContainer,
        avatarZIndexStyle,
        {
          left: dimensions.width / 2 - AVATAR_SIZE / 2,
          top: dimensions.height / 2 - AVATAR_SIZE / 2
        }
      ]}>
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

      {/* Ghost Object for Dragging */}
      {dragImageSource && (
        <Animated.Image
          source={dragImageSource}
          style={[styles.ghostImage, ghostStyle]}
          resizeMode="contain"
        />
      )}

      {/* Build Mode Shop Drawer */}
      <SanctuaryShop
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        dragX={dragX}
        dragY={dragY}
        isDragging={isDragging}
        dragItemId={dragItemId}
        dragItemColWidth={dragItemColWidth}
        dragItemColHeight={dragItemColHeight}
        dragItemVisWidth={dragItemVisWidth}
        dragItemVisHeight={dragItemVisHeight}
        onDragStart={(id) => {
          setDragImageSource(SHOP_CATALOG[id]?.source);
        }}
        onSelectInventoryItem={(id) => beginHoldingItem(id, null)}
        onPurchaseRequest={(itemId, price) => {
          try {
            const state = db.getFirstSync<{coins: number}>('SELECT coins FROM rpg_state WHERE id = 1');
            if (state && state.coins >= price) {
              db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', price);
              db.runSync(`
                INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
                ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1
              `, itemId);
              setCoins(state.coins - price);
              // We could trigger a shop inventory refresh here, but it's okay, closing and reopening works.
            } else {
              console.warn("Not enough coins");
            }
          } catch (e) {
            console.warn("Failed to purchase item", e);
          }
        }}
      />

      {/* UI Overlay */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <View style={styles.tabs}>
          <Pressable onPress={() => setActiveZone('sanctuary')}>
            <Text style={[styles.tabText, activeZone === 'sanctuary' && styles.tabTextActive]}>Sanctuary</Text>
          </Pressable>
          <Pressable onPress={() => setActiveZone('dungeon')}>
            <Text style={[styles.tabText, activeZone === 'dungeon' && styles.tabTextActive]}>Dungeon</Text>
          </Pressable>
        </View>

        <View style={styles.currencyPill}>
          <Feather name="circle" size={16} color="#f1c40f" />
          <Text style={styles.currencyText}>{coins}</Text>
        </View>
      </View>

      {(heldItem || isShopOpen) && (
        <View style={styles.modePill}>
          <Feather name={heldItem ? 'move' : 'shopping-bag'} size={15} color="#fff" />
          <Text style={styles.modeText}>
            {heldItem ? `Holding ${heldItem.label}` : 'Choose an item, then press Use'}
          </Text>
        </View>
      )}

      {heldItem && (
        <View style={styles.stashZone}>
          <Feather name="archive" size={18} color="#fff" />
          <Text style={styles.stashText}>Stash returns placed items to inventory</Text>
        </View>
      )}

      {/* Controls */}
      <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

      {/* Action Buttons */}
      <View style={styles.actionBtns}>
        <Pressable style={styles.actionBtn} onPress={() => setIsShopOpen(true)}>
          <Feather name="shopping-bag" size={18} color="#fff" />
          <Text style={styles.actionText}>Shop</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleInteract}>
          <Feather name="mouse-pointer" size={18} color="#fff" />
          <Text style={styles.actionText}>{heldItem ? 'Place' : 'Interact'}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleMoveTargetObject}>
          <Feather name="move" size={18} color="#fff" />
          <Text style={styles.actionText}>Move</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={heldItem ? handleStashHeldItem : handleStashTargetObject}>
          <Feather name="archive" size={18} color="#fff" />
          <Text style={styles.actionText}>Stash</Text>
        </Pressable>
        {heldItem && (
          <Pressable style={styles.actionBtn} onPress={clearHeldItem}>
            <Feather name="x" size={18} color="#fff" />
            <Text style={styles.actionText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable style={[styles.actionBtn, styles.attackBtn]} onPress={handleAttack}>
          <Feather name="crosshair" size={18} color="#fff" />
          <Text style={styles.actionText}>Attack</Text>
        </Pressable>
      </View>

      <View style={styles.zoomBtns}>
        <Pressable style={styles.zoomBtn} onPress={() => setZoom(mapScale.value - 0.15)}>
          <Feather name="minus" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.zoomText}>{zoomLabel}</Text>
        <Pressable style={styles.zoomBtn} onPress={() => setZoom(mapScale.value + 0.15)}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>
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
  avatarContainer: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    // zIndex dynamically controlled via avatarZIndexStyle
  },
  ghostImage: {
    width: 128,
    height: 128,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
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
  modePill: {
    position: 'absolute',
    top: 102,
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
  stashZone: {
    position: 'absolute',
    bottom: 126,
    left: 164,
    right: 20,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  stashText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    marginLeft: 8,
  },
  actionBtns: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 276,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    zIndex: 100,
  },
  actionBtn: {
    width: 82,
    height: 48,
    borderRadius: 14,
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
  zoomBtns: {
    position: 'absolute',
    right: 20,
    top: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
    zIndex: 100,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    minWidth: 48,
    textAlign: 'center',
  },
});
