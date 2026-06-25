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

const AVATAR_SIZE = 64;
const SPEED = 200; // pixels per second

const WALK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Walk_with_shadow.png');
const ATTACK_SPRITE = require('../assets/craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_attack_with_shadow.png');

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
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);
  const [mapObjects, setMapObjects] = useState<{id: number, type: string, row: number, col: number}[]>([]);
  const [coins, setCoins] = useState(0);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [dragImageSource, setDragImageSource] = useState<any>(null);

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

  const isPlacementValid = (r: number, c: number, itemId: string | null) => {
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
      const data = db.getAllSync<{id: number, type: string, row: number, col: number}>('SELECT * FROM sanctuary_objects');
      setMapObjects(data);

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

    // Inject dynamic objects into the collision map
    if (activeZone === 'sanctuary') {
      mapObjects.forEach(obj => {
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
  }, [activeZone, mapObjects]);

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

    // Edge Panning during Drag Mode
    if (isDragging.value && dt) {
      const PAN_SPEED = 500;
      const margin = 100;
      let dx = 0;
      let dy = 0;

      // We check absolute coordinates of the drag pointer against the screen
      if (dragX.value < margin) dx = PAN_SPEED * dt;
      if (dragX.value > dimensions.width - margin) dx = -PAN_SPEED * dt;
      if (dragY.value < margin) dy = PAN_SPEED * dt;
      if (dragY.value > dimensions.height - margin) dy = -PAN_SPEED * dt;

      if (dx !== 0 || dy !== 0) {
        // Move avatar to automatically pan the camera mapTranslate
        avatarX.value = Math.max(0, Math.min(MAP_WIDTH, avatarX.value - dx));
        avatarY.value = Math.max(0, Math.min(MAP_HEIGHT, avatarY.value - dy));
      }
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
    const target = getTargetedTile();

    // Check if target tile is a specific type (e.g., Grass/Soil in Sanctuary)
    if (activeZone === 'sanctuary') {
      const tileType = SanctuaryMap[target.row]?.[target.col];
      if (tileType === TileType.GRASS) {
        // TODO: Open planting UI
        console.log(`[Interact] Inspecting soil at [${target.row}, ${target.col}]`);
      }
    }
  }

  const mapTranslateX = useDerivedValue(() => -(avatarX.value - (dimensions.width / 2) + (AVATAR_SIZE / 2)));
  const mapTranslateY = useDerivedValue(() => -(avatarY.value - (dimensions.height / 2) + (AVATAR_SIZE / 2)));

  const animatedWorldStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: mapTranslateX.value },
        { translateY: mapTranslateY.value },
      ],
    };
  });

  // Build Mode: Hover Preview Box Math
  useFrameCallback(() => {
    if (isDragging.value) {
      // Hardcoded mapScale = 1 since we haven't added pinch-to-zoom yet
      hoverCol.value = Math.floor((dragX.value - mapTranslateX.value) / TILE_SIZE);
      hoverRow.value = Math.floor((dragY.value - mapTranslateY.value) / TILE_SIZE);
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
        {activeZone === 'sanctuary' && mapObjects.map(obj => (
          <SanctuaryObject
            key={obj.id}
            type={obj.type}
            row={obj.row}
            col={obj.col}
            avatarY={avatarY}
            avatarX={avatarX}
          />
        ))}

        {/* Build Mode Preview Box */}
        <Animated.View style={previewStyle} />
      </Animated.View>

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

      {/* Controls */}
      <Joystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />

      {/* Action Buttons */}
      <View style={styles.actionBtns}>
        <Pressable style={styles.actionBtn} onPress={() => setIsShopOpen(true)}>
          <Feather name="shopping-bag" size={24} color="#fff" />
        </Pressable>
        <Pressable style={[styles.actionBtn, { marginLeft: 16 }]} onPress={handleInteract}>
          <Feather name="mouse-pointer" size={24} color="#fff" />
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#e74c3c', marginLeft: 16 }]} onPress={handleAttack}>
          <Feather name="crosshair" size={24} color="#fff" />
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
  actionBtns: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    flexDirection: 'row',
    zIndex: 100,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
