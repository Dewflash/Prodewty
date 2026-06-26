import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
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
  getResourceSellPrice,
  getRpgItem,
  RPG_UI_FRAMES,
  type RpgDrop,
  type RpgItemDefinition,
  type ShopCatalogItem,
} from '../src/engine/RpgObjectCatalog';
import { RPG_ARCHIVE_FRAMES } from '../src/engine/RpgAssetRegistry';
import { DungeonMap, SanctuaryMap, TILE_COLLISION, TILE_SIZE, TileType } from '../src/engine/MapData';
import { DUNGEON_ENEMY_DEFS, DUNGEON_ENEMY_SPAWNS, type EnemyDefId } from '../src/engine/Enemies';
import { BridgeTile, FLOOR_TILE_COORD, PathTile, TilledTile, TilesetTile, WALL_TILE_COORD, WaterTile } from '../src/engine/TileArt';
import { db } from '../src/db/schema';
import {
  advanceGardenPlotWithInventoryItem,
  getInventoryQuantity,
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
  getSanctuaryObjectInteractionCount,
  markSanctuaryObjectInteraction,
  setSanctuaryObjectInteractionActive,
} from '../src/db/sanctuaryInteractions';
import {
  deleteSanctuaryObjectRelationsForObject,
  getSanctuaryObjectRelations,
  upsertSanctuaryObjectRelation,
  type SanctuaryObjectRelationKind,
} from '../src/db/sanctuaryObjectRelations';
import { claimSanctuaryReward } from '../src/db/sanctuaryRewards';
import { bootstrapSanctuaryGrowth, getPlotGrowthInfo } from '../src/engine/SanctuaryBootstrapper';
import { RPG_WATER_DROPS_ITEM_ID, RPG_WOOD_ITEM_ID } from '../src/engine/RpgItemIds';

const DUNGEON_ENTRY_COST = 20;
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
const SHOW_NORMAL_TARGET_DEBUG = false;

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
type ToolId = 'shovel' | 'bridge' | 'path' | 'plow' | 'watering';
const TOOLS: { id: ToolId; itemId: string; label: string; icon: keyof typeof Feather.glyphMap; hint: string }[] = [
  { id: 'shovel', itemId: 'rpg_tool_shovel', label: 'Shovel', icon: 'tool', hint: 'Dig grass into a river (5 coins)' },
  { id: 'bridge', itemId: 'rpg_tool_bridge', label: 'Bridge Kit', icon: 'link', hint: 'Bridge a river tile (3 wood)' },
  { id: 'path', itemId: 'rpg_tool_path', label: 'Path', icon: 'minus', hint: 'Lay a walking path (1 wood)' },
  { id: 'plow', itemId: 'rpg_tool_plow', label: 'Plow', icon: 'grid', hint: 'Till grass for planting (3 energy)' },
  { id: 'watering', itemId: 'rpg_tool_watering_can', label: 'Water', icon: 'droplet', hint: 'Water a crop with energy and Water Drops' },
];
const STARTER_TOOL_ITEM_IDS = TOOLS.map(t => t.itemId);
const TOOL_ENERGY_COST: Record<ToolId, number> = {
  shovel: 6,
  bridge: 4,
  path: 2,
  plow: 3,
  watering: 4,
};

type InteractionTargetKind = 'object' | 'plot' | 'portal' | 'enemy';
type InteractionTargetCell = { row: number; col: number };
type LiveEnemy = { uid: string; defId: EnemyDefId; row: number; col: number; hp: number };
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
  enemy?: LiveEnemy;
};
type ResolvedInteractionTarget = {
  row: number;
  col: number;
  target: InteractionTarget | null;
};

function applyTerrainOverrides(base: TileType[][], overrides: Record<string, TileType>): TileType[][] {
  if (Object.keys(overrides).length === 0) return base;
  return base.map((row, r) => row.map((tile, c) => overrides[`${r}:${c}`] ?? tile));
}

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
  const [playerHp, setPlayerHp] = useState({ hp: 100, hp_max: 100, mp: 100 });
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [buildItem, setBuildItem] = useState<BuildItem | null>(null);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isRaining, setIsRaining] = useState(false);
  const [interactingObjectId, setInteractingObjectId] = useState<number | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<InteractionTarget | null>(null);
  const [worldToast, setWorldToast] = useState<WorldToast | null>(null);
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);
  const [enemies, setEnemies] = useState<LiveEnemy[]>([]);
  const [terrainOverrides, setTerrainOverrides] = useState<Record<string, TileType>>({});
  const [equippedTool, setEquippedTool] = useState<ToolId | null>(null);
  const worldToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forageCooldowns = useRef<Record<number, number>>({});
  const defeatedEnemyUids = useRef<Set<string>>(new Set());
  const emptyInteractCooldownUntil = useRef(0);

  const effectiveSanctuaryMap = useMemo(
    () => applyTerrainOverrides(SanctuaryMap, terrainOverrides),
    [terrainOverrides],
  );
  const mapData = activeZone === 'sanctuary' ? effectiveSanctuaryMap : DungeonMap;
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
  const staticFrame = useSharedValue(false);
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

  const activeTool = activeZone === 'sanctuary' ? TOOLS.find(t => t.id === equippedTool) ?? null : null;
  const buildCatalogItem = getItem(buildItem?.itemId ?? null);
  const buildSeedItem = buildItem?.mode === 'plant' ? getRpgItem(buildItem.itemId) : null;
  const buildGhostWidth = (buildItem?.mode === 'plant' ? 1 : buildCatalogItem?.visWidth ?? 0) * TILE_SIZE;
  const buildGhostHeight = (buildItem?.mode === 'plant' ? 1 : buildCatalogItem?.visHeight ?? 0) * TILE_SIZE;

  const getObjectMechanicState = (obj: MapObject): 'open_gate' | 'disabled_trap' | null => {
    const item = getItem(obj.type);
    const tags = item?.tags ?? [];
    if (tags.includes('gate') && getSanctuaryObjectInteractionCount(obj.id, 'open_gate') % 2 === 1) {
      return 'open_gate';
    }
    if (
      (tags.includes('trap') || tags.includes('hazard')) &&
      getSanctuaryObjectInteractionCount(obj.id, 'disable_trap') % 2 === 1
    ) {
      return 'disabled_trap';
    }
    return null;
  };

  const isObjectMechanicallyPassable = (obj: MapObject) => getObjectMechanicState(obj) !== null;

  const makeMovementCollisionFlat = (objects: MapObject[], zone: Zone = activeZone, data: TileType[][] = mapData) => {
    const cols = data[0]?.length ?? 0;
    const flat = data.flat().map(tile => (TILE_COLLISION[tile as TileType] ? 1 : 0));
    if (zone !== 'sanctuary') return flat;

    objects.forEach(obj => {
      if (isObjectMechanicallyPassable(obj)) return;
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

  const refreshPlayerHp = () => {
    const state = db.getFirstSync<{ hp: number; hp_max: number; mp: number }>('SELECT hp, hp_max, mp FROM rpg_state WHERE id = 1');
    if (state) setPlayerHp(state);
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

  const spendToolEnergy = (toolId: ToolId) => {
    const cost = TOOL_ENERGY_COST[toolId];
    if (cost <= 0) return true;
    const state = db.getFirstSync<{ mp: number }>('SELECT mp FROM rpg_state WHERE id = 1');
    const currentMp = state?.mp ?? 0;
    if (currentMp < cost) {
      showWorldToast({ text: `Too tired: need ${cost} energy`, tone: 'warn' });
      return false;
    }
    db.runSync('UPDATE rpg_state SET mp = MAX(0, mp - ?) WHERE id = 1', cost);
    refreshPlayerHp();
    return true;
  };

  const enterZone = (zone: Zone) => {
    setActiveZone(zone);
    setBuildItem(null);
    setPlacementReport(null);
    setIsShopOpen(false);
    setIsBackpackOpen(false);
    setIsArchiveOpen(false);
    setIsCharacterOpen(false);
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
    setEnemies(zone === 'dungeon'
      ? DUNGEON_ENEMY_SPAWNS
          .filter(spawn => !defeatedEnemyUids.current.has(spawn.uid))
          .map(spawn => ({
            uid: spawn.uid,
            defId: spawn.defId,
            row: spawn.row,
            col: spawn.col,
            hp: DUNGEON_ENEMY_DEFS[spawn.defId].maxHp,
          }))
      : []);
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
    setIsCharacterOpen(false);
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
    setIsCharacterOpen(false);
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

  const getTargetedTile = useCallback(() => {
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
  }, [avatarDirection, avatarX, avatarY]);

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

    const enemy = enemies.find(e => e.row === row && e.col === col);
    if (enemy) {
      const def = DUNGEON_ENEMY_DEFS[enemy.defId];
      return {
        kind: 'enemy',
        row,
        col,
        cells: [{ row, col }],
        label: def.name,
        detail: `HP ${enemy.hp}/${def.maxHp}`,
        enemy,
      };
    }

    if (DungeonMap[row]?.[col] === TileType.PORTAL_SANCTUARY) {
      return { kind: 'portal', row, col, cells: [{ row, col }], label: 'Sanctuary portal', detail: 'Portal' };
    }
    return null;
  }, [activeZone, buildItem, enemies, gardenPlots, mapObjects]);

  const updateInteractionPromptFromTile = useCallback((row: number, col: number) => {
    setInteractionPrompt(resolveInteractionTargetAt(row, col));
  }, [resolveInteractionTargetAt]);

  const resolveCurrentInteractionTarget = useCallback((): ResolvedInteractionTarget => {
    const tile = getTargetedTile();
    return {
      ...tile,
      target: resolveInteractionTargetAt(tile.row, tile.col),
    };
  }, [getTargetedTile, resolveInteractionTargetAt]);

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
            ? mapData[checkRow][checkCol] !== TileType.TILLED
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
    const item = getRpgItem(buildItem.itemId);
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
        showWorldToast({ text: `Moved ${buildItem.label}`, item, tone: 'success' });
      } else {
        db.execSync('BEGIN TRANSACTION');
        const result = db.runSync(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
          buildItem.itemId,
        );
        if (result.changes <= 0) {
          db.execSync('ROLLBACK');
          showWorldToast({ text: 'No item left', item, tone: 'warn' });
          return;
        }
        db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          buildItem.itemId, row, col,
        );
        db.execSync('COMMIT');
        recordRpgDiscovery(buildItem.itemId, 'place');
        showWorldToast({ text: `Placed ${buildItem.label}`, item, tone: 'success' });
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

  const handleSellItem = (itemId: string) => {
    const price = getResourceSellPrice(itemId);
    if (price <= 0 || getInventoryQuantity(itemId) <= 0) return;
    addSandboxInventoryItem(itemId, -1, 'inventory');
    db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', price);
    refreshCoins();
    showWorldToast({ text: `Sold ${getRpgItem(itemId)?.name ?? itemId} for +${price} coins`, tone: 'success' });
  };

  const handleSellAllItem = (itemId: string) => {
    const price = getResourceSellPrice(itemId);
    const quantity = getInventoryQuantity(itemId);
    if (price <= 0 || quantity <= 0) return;
    addSandboxInventoryItem(itemId, -quantity, 'inventory');
    const total = price * quantity;
    db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', total);
    refreshCoins();
    showWorldToast({ text: `Sold ${quantity} ${getRpgItem(itemId)?.name ?? itemId} for +${total} coins`, tone: 'success' });
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
      refreshPlayerHp();
      refreshWeather();
      const kills = db.getAllSync<{ uid: string }>('SELECT uid FROM dungeon_enemy_kills');
      kills.forEach(row => defeatedEnemyUids.current.add(row.uid));

      const overrideRows = db.getAllSync<{ row: number; col: number; tile_type: number }>(
        'SELECT row, col, tile_type FROM sanctuary_terrain_overrides',
      );
      if (overrideRows.length > 0) {
        const overrides: Record<string, TileType> = {};
        overrideRows.forEach(o => { overrides[`${o.row}:${o.col}`] = o.tile_type as TileType; });
        setTerrainOverrides(overrides);
      }

      STARTER_TOOL_ITEM_IDS.forEach(itemId => {
        db.runSync(
          'INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1) ON CONFLICT(item_id) DO NOTHING',
          itemId,
        );
      });
      bumpInventoryRevision();
    } catch (e) {
      console.warn('Failed to load RPG sandbox state', e);
    }
  }, []);

  useEffect(() => {
    if (activeZone !== 'dungeon') return;
    const interval = setInterval(() => {
      const state = db.getFirstSync<{ hp: number }>('SELECT hp FROM rpg_state WHERE id = 1');
      const foot = getAvatarFootCell();
      let totalDamage = 0;
      let attackerName = '';

      setEnemies(prev => {
        const occupied = new Set(prev.map(e => `${e.row}:${e.col}`));
        return prev.map(enemy => {
          const def = DUNGEON_ENEMY_DEFS[enemy.defId];
          const dr = foot.row - enemy.row;
          const dc = foot.col - enemy.col;
          const dist = Math.max(Math.abs(dr), Math.abs(dc));

          if (dist <= 1) {
            if (state && state.hp > 0) {
              totalDamage += def.atk;
              attackerName = def.name;
            }
            return enemy;
          }

          if (dist > def.aggroRange) return enemy;

          const stepRow = enemy.row + Math.sign(dr);
          const stepCol = enemy.col + Math.sign(dc);
          const key = `${stepRow}:${stepCol}`;
          const blocked = TILE_COLLISION[DungeonMap[stepRow]?.[stepCol] as TileType] || occupied.has(key);
          if (blocked) return enemy;

          occupied.delete(`${enemy.row}:${enemy.col}`);
          occupied.add(key);
          return { ...enemy, row: stepRow, col: stepCol };
        });
      });

      if (totalDamage > 0) {
        db.runSync('UPDATE rpg_state SET hp = MAX(0, hp - ?) WHERE id = 1', totalDamage);
        refreshPlayerHp();
        showWorldToast({ text: `${attackerName} hits you for ${totalDamage}`, tone: 'warn' });
      }
    }, 700);
    return () => clearInterval(interval);
  }, [activeZone]);

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
    const current = resolveCurrentInteractionTarget();
    setInteractionPrompt(current.target);
  }, [activeZone, buildItem, mapObjects, gardenPlots, resolveCurrentInteractionTarget]);

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

  const showEmptyInteractionFeedback = (zone: Zone) => {
    const now = Date.now();
    if (emptyInteractCooldownUntil.current > now) return;
    emptyInteractCooldownUntil.current = now + 650;
    showWorldToast({
      text: zone === 'sanctuary' ? 'Nothing here' : 'Nothing nearby',
      tone: 'muted',
    });
  };

  const showAttackFeedback = (current: ResolvedInteractionTarget) => {
    const target = current.target;
    if (target?.kind === 'object' && target.object) {
      pulseObject(target.object.id);
      showWorldToast({ text: `Struck ${target.label}`, item: target.item, tone: 'muted' });
      return;
    }

    if (target?.kind === 'plot') {
      showWorldToast({ text: 'Careful: crop', item: target.item, tone: 'warn' });
      return;
    }

    if (target?.kind === 'portal') {
      showWorldToast({ text: 'Weapon passes through', tone: 'muted' });
      return;
    }

    if (target?.kind === 'enemy') {
      return;
    }

    showWorldToast({ text: 'Swing', tone: 'muted' });
  };

  const resolveEnemyHit = (enemy: LiveEnemy, atk: number) => {
    const def = DUNGEON_ENEMY_DEFS[enemy.defId];
    const nextHp = enemy.hp - Math.max(1, atk);

    if (nextHp <= 0) {
      defeatedEnemyUids.current.add(enemy.uid);
      db.runSync('INSERT OR IGNORE INTO dungeon_enemy_kills (uid) VALUES (?)', enemy.uid);
      setEnemies(prev => prev.filter(e => e.uid !== enemy.uid));
      const drops = rollHarvestDrops(def.drops);
      drops.forEach(drop => addSandboxInventoryItem(drop.itemId, drop.quantity, 'loot'));
      if (def.coins > 0) {
        db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', def.coins);
        refreshCoins();
      }
      showWorldToast({
        text: `Defeated ${def.name}! ${getRewardText(def.coins, drops)}`,
        item: drops[0] ? getRpgItem(drops[0].itemId) : null,
        tone: 'success',
      });
      return;
    }

    setEnemies(prev => prev.map(e => (e.uid === enemy.uid ? { ...e, hp: nextHp } : e)));
    showWorldToast({ text: `Hit ${def.name} for ${atk} (${nextHp}/${def.maxHp} HP)`, tone: 'muted' });
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
    if (tags?.includes('tree')) return 'Tree needs time to regrow';
    if (tags?.some(tag => tag === 'bush' || tag === 'fern')) return 'Brush is resting';
    return 'Object is resting';
  };

  const getForageEmptyText = (item: ShopCatalogItem) => {
    const tags = item.tags ?? [];
    if (tags.includes('crystal')) return 'No shards this time';
    if (tags.includes('tree')) return 'No wood came loose';
    if (tags.some(tag => tag === 'bush' || tag === 'fern' || tag === 'flower')) return 'Nothing in the brush';
    return 'Nothing dropped';
  };

  const getForageSuccessText = (item: ShopCatalogItem, dropDef: RpgItemDefinition | null, quantity: number) => {
    const tags = item.tags ?? [];
    const reward = `+${quantity} ${dropDef?.name ?? 'item'}`;
    if (tags.includes('crystal')) return `Chipped crystal: ${reward}`;
    if (tags.includes('tree')) return `Chopped tree: ${reward}`;
    if (tags.some(tag => tag === 'bush' || tag === 'fern' || tag === 'flower')) return `Foraged brush: ${reward}`;
    return reward;
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

  const relationTargetKind = (relationKind: SanctuaryObjectRelationKind) => (
    relationKind === 'lever_opens_gate' ? 'gate' : 'trap'
  );

  const objectDistanceScore = (source: MapObject, target: MapObject) => {
    const dr = source.row - target.row;
    const dc = source.col - target.col;
    return dr * dr + dc * dc;
  };

  const findNearestMechanicTarget = (
    source: MapObject,
    relationKind: SanctuaryObjectRelationKind,
  ) => (
    mapObjects
      .filter(candidate => candidate.id !== source.id)
      .filter(candidate => {
        const candidateItem = getPlaceableItem(candidate.type);
        if (!candidateItem) return false;
        return relationKind === 'lever_opens_gate'
          ? isGateObject(candidateItem)
          : isTrapObject(candidateItem);
      })
      .sort((a, b) => objectDistanceScore(source, a) - objectDistanceScore(source, b))[0] ?? null
  );

  const ensureLeverRelations = (lever: MapObject) => {
    const existing = getSanctuaryObjectRelations(lever.id);
    const relationKinds: SanctuaryObjectRelationKind[] = ['lever_opens_gate', 'lever_disarms_trap'];
    const linked: string[] = [];

    relationKinds.forEach(relationKind => {
      if (existing.some(relation => relation.relation_kind === relationKind)) return;
      const target = findNearestMechanicTarget(lever, relationKind);
      if (!target) return;
      const result = upsertSanctuaryObjectRelation(
        lever.id,
        target.id,
        relationKind,
        lever.type,
        target.type,
      );
      if (result.ok) {
        const targetItem = getPlaceableItem(target.type);
        linked.push(targetItem?.name ?? relationTargetKind(relationKind));
      }
    });

    return {
      relations: getSanctuaryObjectRelations(lever.id),
      linked,
    };
  };

  const applyLeverRelation = (
    relationKind: SanctuaryObjectRelationKind,
    target: MapObject,
    active: boolean,
  ) => {
    const targetItem = getPlaceableItem(target.type);
    const result = relationKind === 'lever_opens_gate'
      ? setSanctuaryObjectInteractionActive(target.id, target.type, 'open_gate', active)
      : setSanctuaryObjectInteractionActive(target.id, target.type, 'disable_trap', active);
    if (!result.ok) return null;
    pulseObject(target.id);
    const label = targetItem?.name ?? relationTargetKind(relationKind);
    if (relationKind === 'lever_opens_gate') return `${label} ${active ? 'open' : 'closed'}`;
    return `${label} ${active ? 'safe' : 'armed'}`;
  };

  const getObjectInspectText = (item: ShopCatalogItem | null, fallbackType: string, isFirstInspect: boolean) => {
    const tags = item?.tags ?? [];
    const detail = (() => {
      if (tags.includes('trap') || tags.includes('hazard')) return 'Trap can be disarmed';
      if (tags.includes('lever')) return 'Lever links to nearby mechanisms';
      if (tags.includes('gate')) return 'Gate can be linked to a lever';
      if (tags.includes('mechanism')) return 'Mechanism can be linked';
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
      const { relations, linked } = ensureLeverRelations(object);
      const affected = relations
        .map(relation => {
          const target = mapObjects.find(candidate => candidate.id === relation.target_object_id);
          if (!target) return null;
          return applyLeverRelation(relation.relation_kind, target, isOn);
        })
        .filter(Boolean) as string[];

      applyMovementCollision(mapObjects);
      const affectedText = affected.length > 2
        ? `${affected.slice(0, 2).join(', ')} +${affected.length - 2}`
        : affected.join(', ');
      showWorldToast({
        text: affected.length
          ? `Lever ${isOn ? 'on' : 'off'}: ${affectedText}`
          : linked.length
            ? `Lever linked: ${linked.slice(0, 2).join(', ')}`
            : `Lever switched ${isOn ? 'on' : 'off'} (nothing linked)`,
        item,
        tone: affected.length ? 'success' : 'muted',
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
      applyMovementCollision(mapObjects);
      showWorldToast({
        text: isDisabled ? 'Trap disarmed' : 'Trap re-armed',
        item,
        tone: isDisabled ? 'success' : 'muted',
      });
      return;
    }

    if (isGateObject(item)) {
      if (getSanctuaryObjectInteractionCount(object.id, 'open_gate') % 2 === 1) {
        showWorldToast({ text: 'Gate is open', item, tone: 'success' });
        return;
      }
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

    if (item.interactLoot?.repeatable) {
      const drops = rollHarvestDrops(item.interactLoot.drops);
      drops.forEach(drop => addSandboxInventoryItem(drop.itemId, drop.quantity, 'loot'));
      if (item.interactLoot.coins > 0) {
        db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', item.interactLoot.coins);
        refreshCoins();
      }
      showWorldToast({
        text: `+${item.interactLoot.coins} coins`,
        item,
        tone: 'success',
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
      showWorldToast({ text: getForageEmptyText(item), item, tone: 'muted' });
      return;
    }

    const dropDef = getRpgItem(drop.itemId);
    addSandboxInventoryItem(drop.itemId, drop.quantity, 'forage');
    showWorldToast({
      text: getForageSuccessText(item, dropDef, drop.quantity),
      item: dropDef,
      tone: 'success',
    });
  };

  const waterGardenPlot = (plot: GardenPlot) => {
    const growth = getPlotGrowthInfo(plot);
    if (!growth.crop) {
      showWorldToast({ text: 'Crop data missing', tone: 'warn' });
      return;
    }

    if (growth.stage >= 2) {
      showWorldToast({ text: 'Ready to harvest', item: getRpgItem(plot.seed_item_id), tone: 'success' });
      return;
    }

    const nextStage = Math.min(2, growth.stage + 1) as GrowthStage;
    if (isRaining) {
      if (!spendToolEnergy('watering')) return;
      updatePlantGrowth(plot.id, nextStage);
      refreshGardenPlots();
      showWorldToast({
        text: nextStage >= 2 ? 'Rain helped it mature' : 'Rain helped water crop',
        item: getRpgItem(plot.seed_item_id),
        tone: 'success',
      });
      return;
    }

    if (getInventoryQuantity(RPG_WATER_DROPS_ITEM_ID) <= 0) {
      showWorldToast({ text: 'Need Water Drops', item: getRpgItem(RPG_WATER_DROPS_ITEM_ID), tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('watering')) return;
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
          ? 'Need Water Drops'
          : result.reason === 'no_plot'
            ? 'Plot missing'
            : 'Could not water',
        item: result.reason === 'no_item' ? getRpgItem(RPG_WATER_DROPS_ITEM_ID) : getRpgItem(plot.seed_item_id),
        tone: 'warn',
      });
    }
  };

  const inspectOrHarvestPlot = (plot: GardenPlot) => {
    const growth = getPlotGrowthInfo(plot);
    if (!growth.crop) {
      showWorldToast({ text: 'Crop data missing', tone: 'warn' });
      return;
    }

    if (growth.stage < 2) {
      if (isRaining) {
        const nextStage = Math.min(2, growth.stage + 1) as GrowthStage;
        updatePlantGrowth(plot.id, nextStage);
        refreshGardenPlots();
        showWorldToast({
          text: nextStage >= 2 ? 'Rain matured crop' : 'Rain watered crop',
          item: getRpgItem(plot.seed_item_id),
          tone: 'success',
        });
        return;
      }
      showWorldToast({
        text: `${growth.label}: ${growth.remainingMinutes}m left`,
        item: getRpgItem(plot.seed_item_id),
        tone: 'muted',
      });
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

    const current = resolveCurrentInteractionTarget();
    setInteractionPrompt(current.target);
    showAttackFeedback(current);
    try {
      const stats = db.getFirstSync<{ str: number; foc: number; agi: number; wis: number; res: number }>(
        'SELECT strength as str, focus as foc, agility as agi, wisdom as wis, resilience as res FROM rpg_state WHERE id = 1',
      );
      if (stats && current.target?.kind === 'enemy' && current.target.enemy) {
        const atk = Math.floor((stats.str + stats.foc + stats.agi + stats.wis + stats.res) / 5);
        resolveEnemyHit(current.target.enemy, atk);
      }
    } catch {}

    setTimeout(() => {
      isAttacking.value = false;
      setSpriteSource(WALK_SPRITE);
      setSpriteFrameCount(6);
    }, 800);
  }

  const setSanctuaryTile = (row: number, col: number, tile: TileType) => {
    const key = `${row}:${col}`;
    const nextOverrides = { ...terrainOverrides, [key]: tile };
    setTerrainOverrides(nextOverrides);
    db.runSync(
      'INSERT OR REPLACE INTO sanctuary_terrain_overrides (row, col, tile_type) VALUES (?, ?, ?)',
      row, col, tile,
    );
    const newMap = applyTerrainOverrides(SanctuaryMap, nextOverrides);
    applyMovementCollision(mapObjects, 'sanctuary', newMap);
  };

  const DIG_COST = 5;

  const digTile = (row: number, col: number) => {
    const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
    if (!state || state.coins < DIG_COST) {
      showWorldToast({ text: `Need ${DIG_COST} coins to dig`, tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('shovel')) return;
    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', DIG_COST);
    refreshCoins();
    setSanctuaryTile(row, col, TileType.WATER);
    showWorldToast({ text: `Dug a channel — water flows in (-${DIG_COST} coins)`, tone: 'success' });
  };

  const BRIDGE_WOOD_COST = 3;

  const buildBridge = (row: number, col: number) => {
    if (getInventoryQuantity(RPG_WOOD_ITEM_ID) < BRIDGE_WOOD_COST) {
      showWorldToast({ text: `Need ${BRIDGE_WOOD_COST} wood to build a bridge`, tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('bridge')) return;
    addSandboxInventoryItem(RPG_WOOD_ITEM_ID, -BRIDGE_WOOD_COST, 'inventory');
    setSanctuaryTile(row, col, TileType.BRIDGE);
    showWorldToast({ text: `Built a bridge (-${BRIDGE_WOOD_COST} wood)`, tone: 'success' });
  };

  const PATH_WOOD_COST = 1;

  const placePath = (row: number, col: number) => {
    if (getInventoryQuantity(RPG_WOOD_ITEM_ID) < PATH_WOOD_COST) {
      showWorldToast({ text: `Need ${PATH_WOOD_COST} wood to lay a path`, tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('path')) return;
    addSandboxInventoryItem(RPG_WOOD_ITEM_ID, -PATH_WOOD_COST, 'inventory');
    setSanctuaryTile(row, col, TileType.PATH);
    showWorldToast({ text: `Laid a path (-${PATH_WOOD_COST} wood)`, tone: 'success' });
  };

  const plowTile = (row: number, col: number) => {
    if (!spendToolEnergy('plow')) return;
    setSanctuaryTile(row, col, TileType.TILLED);
    showWorldToast({ text: 'Tilled the soil — ready to plant', tone: 'success' });
  };

  const useEquippedTool = (row: number, col: number) => {
    const tile = mapData[row]?.[col];
    const plot = gardenPlots.find(item => item.row === row && item.col === col);
    if (equippedTool === 'watering') {
      if (!plot) {
        showWorldToast({ text: 'Watering Can needs a crop', tone: 'warn' });
        return;
      }
      waterGardenPlot(plot);
      return;
    }
    if (equippedTool === 'shovel') {
      if (tile !== TileType.GRASS) {
        showWorldToast({ text: 'Shovel only works on grass', tone: 'warn' });
        return;
      }
      if (Math.abs(row - 18) <= 1 && Math.abs(col - 10) <= 1) {
        showWorldToast({ text: "Can't dig this close to the portal", tone: 'warn' });
        return;
      }
      digTile(row, col);
      return;
    }
    if (equippedTool === 'bridge') {
      if (tile !== TileType.WATER) {
        showWorldToast({ text: 'Bridge Kit only works on water', tone: 'warn' });
        return;
      }
      buildBridge(row, col);
      return;
    }
    if (equippedTool === 'path') {
      if (tile !== TileType.GRASS && tile !== TileType.TILLED) {
        showWorldToast({ text: 'Path can only be laid on grass', tone: 'warn' });
        return;
      }
      placePath(row, col);
      return;
    }
    if (equippedTool === 'plow') {
      if (tile !== TileType.GRASS) {
        showWorldToast({ text: 'Plow only works on grass', tone: 'warn' });
        return;
      }
      plowTile(row, col);
      return;
    }
  };

  function handleInteract() {
    if (isAttacking.value) return;

    if (buildItem) {
      confirmBuildPlacement();
      return;
    }

    const current = resolveCurrentInteractionTarget();
    setInteractionPrompt(current.target);
    const resolvedTarget = current.target;

    if (activeZone === 'sanctuary' && equippedTool) {
      useEquippedTool(current.row, current.col);
      return;
    }

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

      showEmptyInteractionFeedback('sanctuary');
      return;
    }

    if (resolvedTarget?.kind === 'portal') enterZone('sanctuary');
    else showEmptyInteractionFeedback('dungeon');
  }

  function getTileColor(type: TileType) {
    switch (type) {
      case TileType.GRASS: return '#5c8f56';
      case TileType.WALL: return '#56615b';
      case TileType.WATER: return '#4d8aa8';
      case TileType.PORTAL_DUNGEON: return '#8f63b8';
      case TileType.PORTAL_SANCTUARY: return '#d7b84b';
      case TileType.BRIDGE: return '#9a6b3c';
      case TileType.PATH: return '#c2a06b';
      case TileType.TILLED: return '#6b4a2e';
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
                activeZone === 'dungeon' && (tile === TileType.GRASS || tile === TileType.WALL) ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={styles.tile}>
                    <TilesetTile {...(tile === TileType.WALL ? WALL_TILE_COORD : FLOOR_TILE_COORD)} />
                  </View>
                ) : tile === TileType.WATER ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={styles.tile}>
                    <WaterTile />
                  </View>
                ) : tile === TileType.BRIDGE ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={styles.tile}>
                    <BridgeTile />
                  </View>
                ) : tile === TileType.PATH ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={styles.tile}>
                    <PathTile />
                  </View>
                ) : tile === TileType.TILLED ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={styles.tile}>
                    <TilledTile />
                  </View>
                ) : (
                  <View
                    key={`tile-${rowIndex}-${colIndex}`}
                    style={[styles.tile, { backgroundColor: getTileColor(tile as TileType) }]}
                  />
                )
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
              isTargeted={SHOW_NORMAL_TARGET_DEBUG && interactionPrompt?.kind === 'object' && interactionPrompt.object?.id === obj.id}
              mechanicState={getObjectMechanicState(obj)}
              onMoveRequest={handleObjectLongPress}
            />
          ))}

          {activeZone === 'sanctuary' && gardenPlots.map(plot => {
            const growth = getPlotGrowthInfo(plot);
            const cropFrame = growth.crop?.stageFrames?.[growth.stage] ?? null;
            const stageTotalMinutes = growth.crop
              ? growth.stage >= 2
                ? 0
                : growth.crop.stageMinutes[(growth.stage + 1) as 0 | 1 | 2] - growth.crop.stageMinutes[growth.stage]
              : 0;
            const growthPercent = growth.stage >= 2
              ? 100
              : stageTotalMinutes > 0
                ? Math.min(100, Math.max(0, ((stageTotalMinutes - growth.remainingMinutes) / stageTotalMinutes) * 100))
                : 0;
            return (
              <View
                key={plot.id}
                pointerEvents="none"
                style={[
                  styles.gardenPlot,
                  growth.stage === 1 && styles.gardenPlotGrowing,
                  growth.stage >= 2 && styles.gardenPlotMature,
                  SHOW_NORMAL_TARGET_DEBUG && interactionPrompt?.kind === 'plot' && interactionPrompt.plot?.id === plot.id && styles.gardenPlotTargeted,
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
                {growth.crop && growth.stage < 2 && (
                  <View style={styles.gardenGrowthTrack}>
                    <View style={[styles.gardenGrowthFill, { width: `${growthPercent}%` }]} />
                  </View>
                )}
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

          {SHOW_NORMAL_TARGET_DEBUG && !buildItem && interactionPrompt?.cells.map((cell, index) => (
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

          {activeZone === 'dungeon' && enemies.map(enemy => {
            const def = DUNGEON_ENEMY_DEFS[enemy.defId];
            const visualScale = def.isBoss ? 1.5 : 1;
            const left = enemy.col * TILE_SIZE - (def.frameWidth * visualScale - TILE_SIZE) / 2;
            const top = enemy.row * TILE_SIZE - (def.frameHeight * visualScale - TILE_SIZE);
            return (
              <View
                key={enemy.uid}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: def.frameWidth * visualScale,
                  zIndex: Math.floor((enemy.row * TILE_SIZE + def.frameHeight * visualScale) / TILE_SIZE),
                }}
              >
                {def.isBoss && <Text style={styles.enemyBossLabel}>{def.name}</Text>}
                <View style={styles.enemyHpTrack}>
                  <View style={[
                    styles.enemyHpFill,
                    def.isBoss && styles.enemyHpFillBoss,
                    { width: `${Math.max(0, (enemy.hp / def.maxHp) * 100)}%` },
                  ]} />
                </View>
                <View style={{ transform: [{ scale: visualScale }] }}>
                  <SpriteAnimator
                    source={def.sprite}
                    frameWidth={def.frameWidth}
                    frameHeight={def.frameHeight}
                    frameCount={4}
                    fps={1}
                    isPlaying={staticFrame}
                  />
                </View>
              </View>
            );
          })}

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
            {activeTool && (
              <View style={styles.equippedToolBadge}>
                <Feather name={activeTool.icon} size={12} color="#fff" />
              </View>
            )}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave RPG sandbox"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#fff" />
        </Pressable>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter sanctuary"
            accessibilityState={{ selected: activeZone === 'sanctuary' }}
            onPress={() => enterZone('sanctuary')}
          >
            <Text style={[styles.tabText, activeZone === 'sanctuary' && styles.tabTextActive]}>Sanctuary</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter dungeon"
            accessibilityState={{ selected: activeZone === 'dungeon' }}
            onPress={() => {
              if (activeZone === 'dungeon') return;
              const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
              if (!state || state.coins < DUNGEON_ENTRY_COST) {
                Alert.alert('Not enough coins', `Entering the dungeon costs ${DUNGEON_ENTRY_COST} coins.`);
                return;
              }
              db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', DUNGEON_ENTRY_COST);
              refreshCoins();
              enterZone('dungeon');
            }}
          >
            <Text style={[styles.tabText, activeZone === 'dungeon' && styles.tabTextActive]}>Dungeon</Text>
          </Pressable>
        </View>

        <View style={styles.currencyStack}>
          {activeZone === 'dungeon' && (
            <View style={styles.currencyPill}>
              <Feather name="heart" size={16} color="#e74c3c" />
              <Text style={styles.currencyText}>{playerHp.hp}/{playerHp.hp_max}</Text>
            </View>
          )}
          {activeZone === 'sanctuary' && (
            <View style={styles.currencyPill}>
              <Feather name="zap" size={16} color="#70d6ff" />
              <Text style={styles.energyText}>{playerHp.mp}/100</Text>
            </View>
          )}
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
                  setIsCharacterOpen(false);
                  setIsBackpackOpen(true);
                }}
              >
                <RpgSpriteFrameView frame={RPG_UI_FRAMES.backpack} size={24} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open character equipment"
                style={styles.iconHudBtn}
                onPress={() => {
                  setIsShopOpen(false);
                  setIsArchiveOpen(false);
                  setIsBackpackOpen(false);
                  setIsCharacterOpen(true);
                }}
              >
                <Feather name="user" size={18} color="#fff2bb" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open archive"
                style={styles.iconHudBtn}
                onPress={() => {
                  setIsShopOpen(false);
                  setIsBackpackOpen(false);
                  setIsCharacterOpen(false);
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
                  setIsCharacterOpen(false);
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

      {activeZone === 'sanctuary' && !buildItem && (
        <View style={styles.hotbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unequip tool (back to Interact)"
            style={[styles.hotbarSlot, !equippedTool && styles.hotbarSlotActive]}
            onPress={() => setEquippedTool(null)}
          >
            <Feather name="mouse-pointer" size={20} color={equippedTool ? 'rgba(255,255,255,0.55)' : '#fff'} />
          </Pressable>
          {TOOLS.map(tool => (
            <Pressable
              key={tool.id}
              accessibilityRole="button"
              accessibilityLabel={equippedTool === tool.id ? `Unequip ${tool.label}` : `Equip ${tool.label}`}
              style={[styles.hotbarSlot, equippedTool === tool.id && styles.hotbarSlotActive]}
              onPress={() => setEquippedTool(current => (current === tool.id ? null : tool.id))}
            >
              <Feather name={tool.icon} size={20} color={equippedTool === tool.id ? '#fff' : 'rgba(255,255,255,0.55)'} />
            </Pressable>
          ))}
        </View>
      )}

      {buildItem && (
        <View style={styles.modePill}>
          <Feather name={buildItem.mode === 'edit' ? 'move' : 'plus-square'} size={15} color="#fff" />
          <Text style={styles.modeText}>
            {placementReport?.valid
              ? `${buildItem.label}: drag ghost, Interact confirms`
              : placementReport?.reason === 'Terrain' && buildItem.mode === 'plant'
                ? 'Needs plowed soil — equip the Plow tool first'
                : `${placementReport?.reason ?? 'Unavailable'}: drag to a clear cell`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel build mode"
            style={styles.modeCloseBtn}
            onPress={clearBuildMode}
          >
            <Feather name="x" size={14} color="#fff" />
          </Pressable>
        </View>
      )}

      {selectedObject && (
        <View style={styles.editBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Stash ${buildItem?.label ?? 'object'}`}
            style={styles.editBtn}
            onPress={stashEditingObject}
          >
            <Feather name="archive" size={17} color="#fff" />
            <Text style={styles.editText}>Stash</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel moving object"
            style={styles.editBtn}
            onPress={clearBuildMode}
          >
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

      {isCharacterOpen && !buildItem && (
        <View style={styles.characterPanel}>
          <View style={styles.characterHeader}>
            <View style={styles.characterPortrait}>
              <Feather name="user" size={30} color="#fff2bb" />
              {activeTool && (
                <View style={styles.characterToolBadge}>
                  <Feather name={activeTool.icon} size={13} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.characterTitleStack}>
              <Text style={styles.characterTitle}>Character</Text>
              <Text style={styles.characterSubtitle}>
                {activeTool ? `Equipped: ${activeTool.label}` : 'No tool equipped'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close character equipment"
              style={styles.characterCloseButton}
              onPress={() => setIsCharacterOpen(false)}
            >
              <Feather name="x" size={15} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.characterBars}>
            <View style={styles.characterBarRow}>
              <Text style={styles.characterBarLabel}>HP</Text>
              <View style={styles.characterBarTrack}>
                <View style={[styles.characterHpFill, { width: `${Math.max(0, Math.min(100, (playerHp.hp / Math.max(1, playerHp.hp_max)) * 100))}%` }]} />
              </View>
              <Text style={styles.characterBarValue}>{playerHp.hp}/{playerHp.hp_max}</Text>
            </View>
            <View style={styles.characterBarRow}>
              <Text style={styles.characterBarLabel}>Energy</Text>
              <View style={styles.characterBarTrack}>
                <View style={[styles.characterEnergyFill, { width: `${Math.max(0, Math.min(100, playerHp.mp))}%` }]} />
              </View>
              <Text style={styles.characterBarValue}>{playerHp.mp}/100</Text>
            </View>
          </View>
          <View style={styles.characterSlots}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unequip current tool"
              style={[styles.characterToolSlot, !equippedTool && styles.characterToolSlotActive]}
              onPress={() => setEquippedTool(null)}
            >
              <Feather name="mouse-pointer" size={17} color="#fff" />
              <Text numberOfLines={1} style={styles.characterToolLabel}>Hands</Text>
            </Pressable>
            {TOOLS.map(tool => (
              <Pressable
                key={tool.id}
                accessibilityRole="button"
                accessibilityLabel={equippedTool === tool.id ? `Unequip ${tool.label}` : `Equip ${tool.label}`}
                style={[styles.characterToolSlot, equippedTool === tool.id && styles.characterToolSlotActive]}
                onPress={() => setEquippedTool(current => (current === tool.id ? null : tool.id))}
              >
                <Feather name={tool.icon} size={17} color="#fff" />
                <Text numberOfLines={1} style={styles.characterToolLabel}>{tool.label}</Text>
                <Text numberOfLines={1} style={styles.characterToolCost}>{TOOL_ENERGY_COST[tool.id]} EN</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionBtns}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            buildItem
              ? `Confirm ${buildItem.label}`
              : activeTool
                ? `Use ${activeTool.label}`
                : interactionPrompt
                  ? `Interact with ${interactionPrompt.label}`
                  : 'Interact'
          }
          accessibilityHint={
            buildItem
              ? 'Confirms the current build placement when the footprint is valid.'
              : activeTool
                ? activeTool.hint
                : 'Uses the object, crop, or portal in front of the character.'
          }
          style={styles.actionBtn}
          onPress={handleInteract}
        >
          <Feather name={activeTool ? activeTool.icon : 'mouse-pointer'} size={20} color="#fff" />
          <Text style={styles.actionText}>Interact</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            buildItem
              ? 'Attack unavailable while building'
              : interactionPrompt
                ? `Attack toward ${interactionPrompt.label}`
                : 'Attack'
          }
          accessibilityHint="Swings toward the tile in front of the character."
          style={[styles.actionBtn, styles.attackBtn, buildItem && styles.disabledBtn]}
          onPress={handleAttack}
          disabled={!!buildItem}
          accessibilityState={{ disabled: !!buildItem }}
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
        onSellItem={handleSellItem}
        onSellAllItem={handleSellAllItem}
        equippedToolId={TOOLS.find(t => t.id === equippedTool)?.itemId ?? null}
        onEquipTool={(itemId) => {
          const tool = TOOLS.find(t => t.itemId === itemId);
          setEquippedTool(tool?.id ?? null);
          setIsBackpackOpen(false);
          showWorldToast({ text: tool ? `Equipped ${tool.label}` : 'Unequipped tool', tone: 'success' });
        }}
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
  gardenGrowthTrack: {
    position: 'absolute',
    bottom: 2,
    left: 3,
    right: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  gardenGrowthFill: {
    height: 3,
    backgroundColor: '#7ed957',
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
  enemyHpTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
    marginBottom: 2,
  },
  enemyHpFill: {
    height: 4,
    backgroundColor: '#e74c3c',
  },
  enemyHpFillBoss: {
    backgroundColor: '#f1c40f',
  },
  enemyBossLabel: {
    color: '#f1c40f',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 2,
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
  energyText: {
    color: '#70d6ff',
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
  equippedToolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: '#7ed957',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  hotbar: {
    position: 'absolute',
    bottom: 104,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 100,
  },
  hotbarSlot: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotbarSlotActive: {
    backgroundColor: 'rgba(53,255,112,0.32)',
    borderColor: '#7ed957',
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
  characterPanel: {
    position: 'absolute',
    top: 128,
    right: 20,
    width: 272,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(20,18,16,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.32)',
    zIndex: 115,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  characterPortrait: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(255,242,187,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterToolBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2d6a4f',
    borderWidth: 1,
    borderColor: '#b7ffb0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterTitleStack: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  characterTitle: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  characterSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  characterCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterBars: {
    gap: 6,
    marginBottom: 10,
  },
  characterBarRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  characterBarLabel: {
    width: 44,
    color: 'rgba(255,242,187,0.72)',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  characterBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.48)',
    overflow: 'hidden',
  },
  characterHpFill: {
    height: 6,
    backgroundColor: '#e74c3c',
  },
  characterEnergyFill: {
    height: 6,
    backgroundColor: '#70d6ff',
  },
  characterBarValue: {
    width: 48,
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    textAlign: 'right',
  },
  characterSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  characterToolSlot: {
    width: 80,
    height: 54,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  characterToolSlotActive: {
    backgroundColor: 'rgba(53,255,112,0.24)',
    borderColor: '#7ed957',
  },
  characterToolLabel: {
    marginTop: 3,
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  characterToolCost: {
    marginTop: 1,
    color: 'rgba(112,214,255,0.86)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
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
