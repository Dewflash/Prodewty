import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View, AppState, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
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
import { SpriteAnimator, GlobalTicker } from '../src/engine/SpriteAnimator';
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
import { DungeonMap, getResponsiveTileSize, SanctuaryMap, TILE_COLLISION, TILE_SIZE as DEFAULT_TILE_SIZE, TileType } from '../src/engine/MapData';
import { DUNGEON_ENEMY_DEFS, DUNGEON_ENEMY_SPAWNS, type EnemyDefId } from '../src/engine/Enemies';
import { FLOOR_TILE_COORD, TilesetTile, WALL_TILE_COORD, WaterTile } from '../src/engine/TileArt';
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
import { RPG_CRYSTAL_SHARDS_ITEM_ID, RPG_STONE_ITEM_ID, RPG_WATER_DROPS_ITEM_ID, RPG_WOOD_ITEM_ID } from '../src/engine/RpgItemIds';
import { getToolDef } from '../src/engine/ToolCatalog';
import { equipItem, getEquipment, unequipItem } from '../src/db/equipment';
import { getBuildingDef, isBuildingShell, isStation, type BuildingRole } from '../src/engine/BuildingCatalog';
import { startConstruction, checkAndCompleteConstructions, getConstructionForObject } from '../src/db/construction';
import { startCrafting, claimCrafting, getActiveCraftingJobs, type CraftingJob } from '../src/db/crafting';
import { getCraftingRecipe, getAllCraftingRecipes } from '../src/engine/CraftingCatalog';
import { sqlNow } from '../src/utils/date';
import { getSkillState, getMasteryTier, ALL_SKILLS, POINTS_PER_MASTERY, type SkillType } from '../src/db/skills';
import {
  tillSoil,
  plantSeed as plantFarmSeed,
  waterPlot as waterFarmPlot,
  harvestPlot as harvestFarmPlot,
  applyFertilizer,
  useSprinkler,
  type FarmingPlot,
} from '../src/db/farming';
import { getCalendarState, sleepOvernight, fastForwardTime, type CalendarState } from '../src/db/time';
import { tryDropBlueprint } from '../src/db/blueprints';
import { travelToZone } from '../src/db/zones';
import { getZoneDef } from '../src/engine/ZoneCatalog';
import { getBiomeTree } from '../src/engine/BiomeTreeCatalog';
import { logicalToday } from '../src/db/dayBoundary';

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
// Verification hook for the zoneCellMap O(1) lookup (Phase 1, 2026-06-30)
// — flip true to render each cell the Map actually contains, with its
// zone id, directly over the Sanctuary so the in-memory layer can be
// visually confirmed on-device instead of trusting console logs alone.
const TESTING_SHOW_ZONE_MAP = false;

type Zone = 'sanctuary' | 'dungeon';
type MapObject = { id: number; type: string; row: number; col: number };
// Player-declared Sanctuary zones (Pond/Garden/Building Plot). interior/
// perimeter are kept as separate cell-key arrays so a breach check ("did
// the tile that just got mined belong to a wall?") and a containment
// check ("is this tile inside a Garden?") are both single Map lookups —
// see zoneCellMap below. state stays addressable after a breach (not
// deleted) so a future repair flow can resolve back to 'active'.
type SanctuaryZoneType = 'pond' | 'garden' | 'building_plot';
type SanctuaryZoneState = 'active' | 'breached';
type SanctuaryZoneRecord = {
  id: number;
  type: SanctuaryZoneType;
  state: SanctuaryZoneState;
  interiorCells: string[];
  perimeterCells: string[];
};
type PendingZoneCandidate = { interiorCells: string[]; perimeterCells: string[] };
type BuildItem = {
  mode: 'place' | 'edit' | 'plant' | 'terrain';
  itemId: string;
  label: string;
  objectId: number | null;
};

// Terrain-edit Backpack items (Bridge Kit, Path) — placed via the normal
// build-mode flow, but the confirm action edits the tile instead of
// spawning a sanctuary_objects row. See "Universal placement rule" in
// RPG_ARCHITECTURE.md.
const TERRAIN_EDIT_ITEM_IDS = ['rpg_bridge_kit', 'rpg_path_kit'] as const;
// Real food-crop seeds (turnip/cabbage/pumpkin, src/db/farming.ts's
// farming_plots) vs decorative CraftPix tree/flower seeds (garden_plots,
// the original Sanctuary system) — distinguished by sourceLabel since
// both live in the same RPG_CROP_CATALOG/getCropForSeed lookup.
function isFarmingSeed(itemId: string): boolean {
  return getRpgItem(itemId)?.sourceLabel === 'Crop Seeds';
}
const STARTER_FARMING_SEED_ITEM_IDS = ['rpg_turnip_seed', 'rpg_cabbage_seed', 'rpg_pumpkin_seed'];
const MASTERY_ICONS: Record<SkillType, keyof typeof Feather.glyphMap> = {
  farming: 'sun',
  mining: 'triangle',
  combat: 'crosshair',
  foraging: 'package',
  fishing: 'droplet',
  crafting: 'tool',
  livestock: 'github', // placeholder — no animal icon in Feather
  language: 'message-circle',
  trading: 'shopping-bag',
  hunting: 'target',
  surviving: 'shield',
  research: 'book',
};
const MASTERY_LABELS: Record<SkillType, string> = {
  farming: 'Farming',
  mining: 'Mining',
  combat: 'Attacking',
  foraging: 'Foraging',
  fishing: 'Fishing',
  crafting: 'Crafting',
  livestock: 'Livestock',
  language: 'Language',
  trading: 'Trading',
  hunting: 'Hunting',
  surviving: 'Surviving',
  research: 'Research',
};

function terrainEditAllowsTile(itemId: string, tile: TileType): boolean {
  if (itemId === 'rpg_bridge_kit') return tile === TileType.WATER;
  if (itemId === 'rpg_path_kit') return tile === TileType.GRASS || tile === TileType.TILLED;
  return false;
}
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
type WorldCellReaction = {
  id: number;
  row: number;
  col: number;
  colWidth: number;
  label: string;
  item?: RpgItemDefinition | null;
  tone: 'success' | 'muted' | 'warn';
};
type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
// Real equippable tools, persisted via player_equipment/equipItem (see
// src/db/equipment.ts, src/engine/ToolCatalog.ts) — not local React state.
// Bridge Kit/Path are NOT tools; they're placeable Backpack items (see
// TERRAIN_EDIT_ITEM_IDS above) per the Universal Placement Rule.
const EQUIPPABLE_TOOL_ITEM_IDS = ['rpg_axe_basic', 'rpg_pickaxe_basic', 'rpg_hoe_basic', 'rpg_watering_can_basic', 'rpg_rake_basic', 'rpg_shovel_basic'];
// Granted free on first load. Bridge/Path kits are temporarily included
// here too — until Crafting (Phase 5) gives a real acquisition path,
// there'd be no way to test terrain-edit placement otherwise.
const STARTER_TOOL_ITEM_IDS = [...EQUIPPABLE_TOOL_ITEM_IDS, ...TERRAIN_EDIT_ITEM_IDS];
const CLUTTER_ENERGY_COST = 3;
const ANIMAL_PRODUCT_COOLDOWN_MS = 30000;
const CLUTTER_ITEM_IDS = ['rpg_clutter_weeds', 'rpg_clutter_twig', 'rpg_clutter_rock'];
const STARTER_CLUTTER_SPAWNS = [
  { type: 'rpg_clutter_weeds', row: 4, col: 5 },
  { type: 'rpg_clutter_weeds', row: 6, col: 8 },
  { type: 'rpg_clutter_weeds', row: 12, col: 6 },
  { type: 'rpg_clutter_twig', row: 5, col: 12 },
  { type: 'rpg_clutter_twig', row: 13, col: 13 },
  { type: 'rpg_clutter_rock', row: 8, col: 14 },
  { type: 'rpg_clutter_rock', row: 15, col: 8 },
];
// Minimal villager stub spawn — one fixed NPC, seeded once. Real spawning
// (via Villager House construction) is part of the deferred full social
// system; this is just enough to test Interact -> blueprint-chance.
const STARTER_VILLAGER_SPAWN = { type: 'rpg_villager_brog', row: 10, col: 10 };
// Free, naturally-occurring mining nodes (RPG resource dynamics, 2026-06-30)
// — not purchasable, unlike the Cave pack's decorative rocks. Same
// seed-once + nightly-respawn pattern as clutter, just Pickaxe-gated.
const STARTER_ROCK_VEIN_SPAWNS = [
  { type: 'rpg_rock_vein', row: 3, col: 9 },
  { type: 'rpg_rock_vein', row: 9, col: 16 },
  { type: 'rpg_rock_vein', row: 16, col: 3 },
  { type: 'rpg_rock_vein', row: 17, col: 14 },
];
// Recipes now live in src/engine/CraftingCatalog.ts (timed, real
// crafting_queue jobs) — see startCraftingJob/claimCraftingJob below.
const SEASON_CONFIG: Record<SeasonId, { label: string; icon: keyof typeof Feather.glyphMap; color: string; bonus: HarvestDrop; hint: string }> = {
  spring: {
    label: 'Spring',
    icon: 'wind',
    color: '#9ee6a8',
    bonus: { itemId: 'rpg_leaves', quantity: 1 },
    hint: '+Leaves on harvest',
  },
  summer: {
    label: 'Summer',
    icon: 'sun',
    color: '#ffd166',
    bonus: { itemId: RPG_WATER_DROPS_ITEM_ID, quantity: 1 },
    hint: '+Water Drops on harvest',
  },
  autumn: {
    label: 'Autumn',
    icon: 'package',
    color: '#f4a261',
    bonus: { itemId: RPG_WOOD_ITEM_ID, quantity: 1 },
    hint: '+Wood on harvest',
  },
  winter: {
    label: 'Winter',
    icon: 'cloud-snow',
    color: '#9bd7ff',
    bonus: { itemId: RPG_CRYSTAL_SHARDS_ITEM_ID, quantity: 1 },
    hint: '+Crystal Shards on harvest',
  },
};

type InteractionTargetKind = 'object' | 'plot' | 'farmplot' | 'portal' | 'enemy';
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
  farmPlot?: FarmingPlot;
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

function cellsForRect(x: number, y: number, width: number, height: number, tileSize: number) {
  const startCol = Math.floor(x / tileSize);
  const endCol = Math.floor((x + width - 1) / tileSize);
  const startRow = Math.floor(y / tileSize);
  const endRow = Math.floor((y + height - 1) / tileSize);
  const cells: { row: number; col: number }[] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

function avatarCells(avatarX: number, avatarY: number, tileSize: number) {
  return cellsForRect(
    avatarX + AVATAR_FOOT_BOX.offsetX,
    avatarY + AVATAR_FOOT_BOX.offsetY,
    AVATAR_FOOT_BOX.width,
    AVATAR_FOOT_BOX.height,
    tileSize,
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
  const { width: windowWidth } = useWindowDimensions();
  const TILE_SIZE = getResponsiveTileSize(windowWidth);
  const safeAreaInsets = useSafeAreaInsets();

  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'background' || nextState === 'inactive') {
        setBuildItem(null);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // RPG sandbox allows free rotation between portrait and landscape while
  // playing; rest of the app (mood/journaling/etc.) is portrait-only.
  // Unlock on mount, restore portrait-only on leaving this screen.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const [calendar, setCalendar] = useState<CalendarState>({ current_season: 'spring', current_day: 1, current_year: 1 });
  const currentSeason = calendar.current_season as SeasonId;
  const seasonInfo = SEASON_CONFIG[currentSeason];
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [activeZone, setActiveZone] = useState<Zone>('sanctuary');
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [sanctuaryZones, setSanctuaryZones] = useState<SanctuaryZoneRecord[]>([]);
  const [pendingZoneCandidates, setPendingZoneCandidates] = useState<PendingZoneCandidate[]>([]);

  const zonesById = useMemo(() => {
    const map: Record<number, SanctuaryZoneRecord> = {};
    sanctuaryZones.forEach(zone => { map[zone.id] = zone; });
    return map;
  }, [sanctuaryZones]);

  // O(1) tile->zone lookup. Only 'active' zones are mapped — a breach
  // pulls its cells out of this Map entirely (per spec), so a Hoe/Shovel
  // zone-gate check or a building's containment check both naturally see
  // "not in an active zone" without a separate state check.
  const zoneCellMap = useMemo(() => {
    const map = new Map<string, number>();
    sanctuaryZones.forEach(zone => {
      if (zone.state !== 'active') return;
      zone.interiorCells.forEach(key => map.set(key, zone.id));
      zone.perimeterCells.forEach(key => map.set(key, zone.id));
    });
    // Verification hook: if the Map's size doesn't match the sum of every
    // active zone's recorded cells, two zones are silently claiming the
    // same tile (overlapping declarations / a key collision). Surface it
    // immediately rather than letting it manifest as a confusing gameplay
    // bug three systems later.
    const expectedSize = sanctuaryZones
      .filter(zone => zone.state === 'active')
      .reduce((sum, zone) => sum + zone.interiorCells.length + zone.perimeterCells.length, 0);
    if (map.size !== expectedSize) {
      console.warn(
        `[zones] cellMap size mismatch: ${map.size} entries built, ${expectedSize} expected — zones may overlap`,
        sanctuaryZones.filter(z => z.state === 'active').map(z => ({ id: z.id, type: z.type, cells: z.interiorCells.length + z.perimeterCells.length })),
      );
    }
    return map;
  }, [sanctuaryZones]);

  const [gardenPlots, setGardenPlots] = useState<GardenPlot[]>([]);
  const [coins, setCoins] = useState(0);
  const [playerHp, setPlayerHp] = useState({ hp: 100, hp_max: 100, energy: 100, energy_max: 100 });
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [craftingPage, setCraftingPage] = useState(0);
  const [craftingJobsRevision, setCraftingJobsRevision] = useState(0);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [buildItem, setBuildItem] = useState<BuildItem | null>(null);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isRaining, setIsRaining] = useState(false);
  const [interactingObjectId, setInteractingObjectId] = useState<number | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<InteractionTarget | null>(null);
  const [worldToast, setWorldToast] = useState<WorldToast | null>(null);
  const [worldCellReaction, setWorldCellReaction] = useState<WorldCellReaction | null>(null);
  const [spriteSource, setSpriteSource] = useState(WALK_SPRITE);
  const [spriteFrameCount, setSpriteFrameCount] = useState(6);
  const [enemies, setEnemies] = useState<LiveEnemy[]>([]);
  const [terrainOverrides, setTerrainOverrides] = useState<Record<string, TileType>>({});
  const [equippedToolItemId, setEquippedToolItemId] = useState<string | null>(null);
  const worldToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worldCellReactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // TILE_SIZE is responsive to viewport width (see getResponsiveTileSize),
  // so it changes sharply between portrait and landscape. Avatar position
  // is stored in raw pixels, not tile units — without this, rotating the
  // device would leave the same pixel coordinate landing on a totally
  // different tile, looking like the player teleported.
  const lastTileSizeRef = useRef(TILE_SIZE);
  useEffect(() => {
    const prevTileSize = lastTileSizeRef.current;
    if (prevTileSize !== TILE_SIZE) {
      const ratio = TILE_SIZE / prevTileSize;
      avatarX.value *= ratio;
      avatarY.value *= ratio;
      lastTileSizeRef.current = TILE_SIZE;
    }
  }, [TILE_SIZE]);
  const avatarDirection = useSharedValue(0);
  const avatarIsPlaying = useSharedValue(false);
  const isAttacking = useSharedValue(false);
  const staticFrame = useSharedValue(false);
  const mapScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const collisionMap = useSharedValue<number[]>([]);
  const waterMap = useSharedValue<number[]>([]);
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

  const equippedToolItem = activeZone === 'sanctuary' && equippedToolItemId ? getRpgItem(equippedToolItemId) : null;
  const activeTool = equippedToolItem
    ? {
        itemId: equippedToolItemId as string,
        label: equippedToolItem.name,
        icon: (equippedToolItem.featherIcon ?? 'tool') as keyof typeof Feather.glyphMap,
        hint: equippedToolItem.description ?? `Use ${equippedToolItem.name}`,
      }
    : null;
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
      const item = getItem(obj.type);
      // Entrance pieces (Door/Rope/Gate) are always walk-through, regardless
      // of any toggleable-mechanism state — they're a perimeter piece you're
      // meant to pass through, not a gate you open/close.
      if (item?.tags?.includes('entrance')) return;
      if (isObjectMechanicallyPassable(obj)) return;
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
    waterMap.value = data.flat().map(tile => (tile === TileType.WATER ? 1 : 0));
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
    try {
      const state = db.getFirstSync<{ hp: number; hp_max: number; energy: number; energy_max: number }>(
        'SELECT hp, hp_max, energy, energy_max FROM rpg_state WHERE id = 1',
      );
      if (state) {
        setPlayerHp({
          hp: state.hp ?? 0,
          hp_max: state.hp_max ?? 100,
          energy: state.energy ?? 0,
          energy_max: state.energy_max ?? 100,
        });
      }
    } catch (e) {
      console.warn('Failed to refresh player HP/energy', e);
    }
  };

  const refreshEquippedTool = () => {
    setEquippedToolItemId(getEquipment('tool')?.item_id ?? null);
  };

  const refreshCalendar = () => {
    setCalendar(getCalendarState());
  };

  const handleSleep = () => {
    const result = sleepOvernight();
    if (result !== 'ok') {
      showWorldToast({ text: 'Could not sleep right now', tone: 'warn' });
      return;
    }
    refreshCalendar();
    refreshPlayerHp();
    refreshGardenPlots();
    respawnStarterSpawns(STARTER_CLUTTER_SPAWNS);
    respawnStarterSpawns(STARTER_ROCK_VEIN_SPAWNS);
    refreshMapObjects();
    bumpInventoryRevision();
    showWorldToast({ text: 'You wake up refreshed — a new day begins', tone: 'success' });
  };

  const handleEquipTool = (itemId: string | null) => {
    const result = itemId ? equipItem(itemId) : unequipItem('tool');
    if (result !== 'ok') {
      showWorldToast({
        text: result === 'no_item' ? "You don't have that tool" : 'Could not equip tool',
        tone: 'warn',
      });
      return;
    }
    refreshEquippedTool();
    bumpInventoryRevision();
  };

  const ensureStarterSpawns = (spawns: { type: string; row: number; col: number }[], discoveryFlag: string) => {
    const seeded = db.getFirstSync<{ item_id: string }>(
      'SELECT item_id FROM rpg_discoveries WHERE item_id = ? LIMIT 1', discoveryFlag,
    );
    if (seeded) return false;

    const objects = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
    const plots = db.getAllSync<{ row: number; col: number }>('SELECT row, col FROM garden_plots');
    const occupied = new Set<string>();
    objects.forEach(obj => {
      const item = getItem(obj.type);
      const width = item?.colWidth ?? 1;
      const height = item?.colHeight ?? 1;
      for (let dr = 0; dr < height; dr++) {
        for (let dc = 0; dc < width; dc++) {
          occupied.add(`${obj.row + dr}:${obj.col + dc}`);
        }
      }
    });
    plots.forEach(plot => occupied.add(`${plot.row}:${plot.col}`));

    let inserted = 0;
    db.execSync('BEGIN TRANSACTION');
    try {
      spawns.forEach(spawn => {
        const key = `${spawn.row}:${spawn.col}`;
        if (occupied.has(key)) return;
        if (SanctuaryMap[spawn.row]?.[spawn.col] !== TileType.GRASS) return;
        db.runSync('INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)', spawn.type, spawn.row, spawn.col);
        occupied.add(key);
        inserted += 1;
      });
      db.runSync(
        "INSERT OR REPLACE INTO rpg_discoveries (item_id, source, last_seen_at) VALUES (?, 'system', datetime('now', 'localtime'))",
        discoveryFlag,
      );
      db.execSync('COMMIT');
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to seed starter spawns', e);
      return false;
    }
    return inserted > 0;
  };

  // Refills any cleared/mined spots from a starter spawn list — unlike
  // ensureStarterSpawns (one-time-ever seeding gated by a discovery flag),
  // this has no "only once" gate and is meant to run every sleep/day-boundary.
  const respawnStarterSpawns = (spawns: { type: string; row: number; col: number }[]) => {
    const objects = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
    const plots = db.getAllSync<{ row: number; col: number }>('SELECT row, col FROM garden_plots');
    const occupied = new Set<string>();
    objects.forEach(obj => {
      const item = getItem(obj.type);
      const width = item?.colWidth ?? 1;
      const height = item?.colHeight ?? 1;
      for (let dr = 0; dr < height; dr++) {
        for (let dc = 0; dc < width; dc++) {
          occupied.add(`${obj.row + dr}:${obj.col + dc}`);
        }
      }
    });
    plots.forEach(plot => occupied.add(`${plot.row}:${plot.col}`));

    let inserted = 0;
    db.execSync('BEGIN TRANSACTION');
    try {
      spawns.forEach(spawn => {
        const key = `${spawn.row}:${spawn.col}`;
        if (occupied.has(key)) return;
        if (SanctuaryMap[spawn.row]?.[spawn.col] !== TileType.GRASS) return;
        db.runSync('INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)', spawn.type, spawn.row, spawn.col);
        occupied.add(key);
        inserted += 1;
      });
      db.execSync('COMMIT');
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to respawn starter spawns', e);
      return false;
    }
    return inserted > 0;
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

  const spendEnergy = (cost: number) => {
    if (cost <= 0) return true;
    const state = db.getFirstSync<{ energy: number }>('SELECT energy FROM rpg_state WHERE id = 1');
    const currentEnergy = state?.energy ?? 0;
    if (currentEnergy < cost) {
      showWorldToast({ text: `Too tired: need ${cost} energy`, tone: 'warn' });
      return false;
    }
    db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1', cost);
    refreshPlayerHp();
    return true;
  };

  const spendToolEnergy = (toolItemId: string) => spendEnergy(getToolDef(toolItemId)?.energyCost ?? 0);

  const enterZone = (zone: Zone) => {
    setActiveZone(zone);
    setBuildItem(null);
    setPlacementReport(null);
    setIsShopOpen(false);
    setIsBackpackOpen(false);
    setIsArchiveOpen(false);
    setIsCharacterOpen(false);
    setIsCraftingOpen(false);
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
    setIsCraftingOpen(false);
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
    setIsCraftingOpen(false);
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

      const farmPlot = getFarmingPlotAt(row, col);
      if (farmPlot?.planted_seed_id) {
        const cropDef = getCropForSeed(farmPlot.planted_seed_id);
        return {
          kind: 'farmplot',
          row,
          col,
          cells: [{ row, col }],
          label: cropDef?.name ?? 'Crop',
          detail: farmPlot.growth_stage >= 2 ? 'Ready' : farmPlot.is_watered ? 'Watered' : 'Needs water',
          item: getRpgItem(farmPlot.planted_seed_id),
          farmPlot,
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
    const cells = avatarCells(avatarX.value, avatarY.value, TILE_SIZE);
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

  // Finds the building-shell object (if any) whose footprint covers
  // (row, col), and whether its construction has finished. Used to gate
  // station placement (Furnace, Loom, ...) per the Universal Placement
  // Rule's "stations only go inside a completed matching building" rule.
  const findBuildingShellAt = (row: number, col: number) => {
    for (const obj of mapObjects) {
      const def = getBuildingDef(obj.type);
      if (!def || !isBuildingShell(def)) continue;
      if (row >= obj.row && row < obj.row + def.colHeight && col >= obj.col && col < obj.col + def.colWidth) {
        const construction = getConstructionForObject(obj.id);
        return { object: obj, def, isComplete: construction?.is_complete ?? false };
      }
    }
    return null;
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

    const stationDef = mode === 'place' ? getBuildingDef(itemId) : null;
    const requiredRole: BuildingRole | undefined = stationDef && isStation(stationDef)
      ? stationDef.requiredBuildingRole
      : undefined;
    let stationParentBuildingId: number | null = null;
    if (requiredRole) {
      const parent = findBuildingShellAt(row, col);
      if (!parent || parent.def.role !== requiredRole) {
        return {
          row, col, valid: false, reason: 'Unavailable',
          cells: [{ row, col, valid: false, reason: 'Unavailable' }],
        };
      }
      if (!parent.isComplete) {
        return {
          row, col, valid: false, reason: 'Unavailable',
          cells: [{ row, col, valid: false, reason: 'Unavailable' }],
        };
      }
      stationParentBuildingId = parent.object.id;
    }

    const occupiedByAvatar = new Set(
      avatarCells(avatarX.value, avatarY.value, TILE_SIZE).map(cell => `${cell.row}:${cell.col}`),
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
            ? (isFarmingSeed(itemId) ? mapData[checkRow][checkCol] !== TileType.TILLED : TILE_COLLISION[mapData[checkRow][checkCol] as TileType])
            : mode === 'terrain'
              ? !terrainEditAllowsTile(itemId, mapData[checkRow][checkCol] as TileType)
              : TILE_COLLISION[mapData[checkRow][checkCol] as TileType]
        ) {
          valid = false;
          cellReason = 'Terrain';
        } else {
          const hasObject = mapObjects.some(obj => {
            if (obj.id === ignoreObjectId || obj.id === stationParentBuildingId) return false;
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

        if (isFarmingSeed(buildItem.itemId)) {
          // Real food crop — goes through farming.ts's farming_plots,
          // not the decorative garden_plots system. tillSoil already ran
          // (Hoe), so a plot row should already exist here.
          plantFarmSeed(row, col, buildItem.itemId).then(result => {
            if (result !== 'ok') {
              showWorldToast({
                text: result === 'no_plot' ? 'Till this tile first (equip Hoe)'
                  : result === 'no_seed' ? 'No seed left'
                    : result === 'occupied' ? 'Plot occupied'
                      : result === 'no_energy' ? 'Too tired'
                        : 'Could not plant',
                tone: 'warn',
              });
              return;
            }
            recordRpgDiscovery(buildItem.itemId, 'plant');
            bumpInventoryRevision();
            showWorldToast({ text: `${crop.name} planted`, item: getRpgItem(buildItem.itemId), tone: 'success' });
          });
          clearBuildMode();
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
      } else if (buildItem.mode === 'terrain') {
        const result = db.runSync(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ? AND quantity > 0',
          buildItem.itemId,
        );
        if (result.changes <= 0) {
          showWorldToast({ text: 'No item left', item, tone: 'warn' });
          return;
        }
        const nextTile = buildItem.itemId === 'rpg_bridge_kit' ? TileType.BRIDGE : TileType.PATH;
        setSanctuaryTile(row, col, nextTile);
        recordRpgDiscovery(buildItem.itemId, 'place');
        showWorldToast({ text: `Placed ${buildItem.label}`, item, tone: 'success' });
        bumpInventoryRevision();
        clearBuildMode();
        return;
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
        const insertResult = db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          buildItem.itemId, row, col,
        );
        db.execSync('COMMIT');
        recordRpgDiscovery(buildItem.itemId, 'place');

        const buildingDef = getBuildingDef(buildItem.itemId);
        if (buildingDef) {
          const construction = startConstruction(insertResult.lastInsertRowId, buildItem.itemId);
          if (construction.ok) {
            showWorldToast({ text: `Construction started: ${buildItem.label}`, item, tone: 'success' });
          } else {
            showWorldToast({ text: `Placed ${buildItem.label}`, item, tone: 'success' });
          }
        } else {
          showWorldToast({ text: `Placed ${buildItem.label}`, item, tone: 'success' });
        }
      }
      bumpInventoryRevision();
      clearBuildMode();
      const freshObjects = refreshMapObjects();
      const placedTags = getItem(buildItem.itemId)?.tags;
      if (placedTags?.includes('structure_piece') || placedTags?.includes('entrance')) {
        scanForZoneCandidates(freshObjects);
      }
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
      breachZoneIfPerimeterRemoved(selectedObject);
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
    const mode = (TERRAIN_EDIT_ITEM_IDS as readonly string[]).includes(itemId) ? 'terrain' : 'place';
    beginBuildMode(mode, itemId);
  };

  const handleBackpackPlantSeed = (itemId: string) => {
    beginPlantMode(itemId);
  };

  // A completed Vendor Stall (Market station) bumps sell prices — the
  // backend gate is "is one built at all", same convention as
  // findStationObjectId's other callers (crafting stations).
  const getSellPriceWithStallBonus = (itemId: string): { price: number; hasStall: boolean } => {
    const base = getResourceSellPrice(itemId);
    if (base <= 0) return { price: base, hasStall: false };
    const hasStall = findStationObjectId('VendorStall') !== null;
    return { price: hasStall ? Math.round(base * 1.2) : base, hasStall };
  };

  const handleSellItem = (itemId: string) => {
    const { price, hasStall } = getSellPriceWithStallBonus(itemId);
    if (price <= 0 || getInventoryQuantity(itemId) <= 0) return;
    addSandboxInventoryItem(itemId, -1, 'inventory');
    db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', price);
    refreshCoins();
    showWorldToast({
      text: `Sold ${getRpgItem(itemId)?.name ?? itemId} for +${price} coins${hasStall ? ' (Vendor Stall bonus)' : ''}`,
      tone: 'success',
    });
  };

  const handleSellAllItem = (itemId: string) => {
    const { price, hasStall } = getSellPriceWithStallBonus(itemId);
    const quantity = getInventoryQuantity(itemId);
    if (price <= 0 || quantity <= 0) return;
    addSandboxInventoryItem(itemId, -quantity, 'inventory');
    const total = price * quantity;
    db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', total);
    refreshCoins();
    showWorldToast({
      text: `Sold ${quantity} ${getRpgItem(itemId)?.name ?? itemId} for +${total} coins${hasStall ? ' (Vendor Stall bonus)' : ''}`,
      tone: 'success',
    });
  };

  const handleUseOnNearestPlot = (itemId: string) => {
    const avatarBaseCol = Math.floor((avatarX.value + AVATAR_FOOT_BOX.offsetX) / TILE_SIZE);
    const avatarBaseRow = Math.floor((avatarY.value + AVATAR_FOOT_BOX.offsetY) / TILE_SIZE);
    const plots = db.getAllSync<FarmingPlot>('SELECT * FROM farming_plots');
    let nearest: FarmingPlot | null = null;
    let nearestDist = Infinity;
    for (const plot of plots) {
      const dist = Math.abs(plot.row - avatarBaseRow) + Math.abs(plot.col - avatarBaseCol);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = plot;
      }
    }
    if (!nearest || nearestDist > 2) {
      showWorldToast({ text: 'No tilled plot nearby', tone: 'warn' });
      return;
    }
    const action = itemId === 'rpg_fertiliser' ? applyFertilizer : itemId === 'rpg_sprinkler' ? useSprinkler : null;
    if (!action) return;
    action(nearest.row, nearest.col).then(result => {
      if (result !== 'ok') {
        showWorldToast({
          text: result === 'already_fertilized' ? 'Already fertilized'
            : result === 'no_item' ? `No ${getRpgItem(itemId)?.name ?? 'item'} left`
              : 'Could not use on this plot',
          tone: 'warn',
        });
        return;
      }
      bumpInventoryRevision();
      showWorldToast({ text: `Used ${getRpgItem(itemId)?.name ?? itemId}`, item: getRpgItem(itemId), tone: 'success' });
    });
  };

  // Finds a completed, matching station object somewhere in the
  // Sanctuary for a recipe's requiredBuilding (Furnace/Loom/...).
  // Proximity isn't enforced yet — "is one built at all" is the backend
  // gate for now; standing-near-it can be a later UI nicety.
  const findStationObjectId = (stationType: string): number | null => {
    for (const obj of mapObjects) {
      const def = getBuildingDef(obj.type);
      if (def?.type !== stationType) continue;
      const construction = getConstructionForObject(obj.id);
      if (construction?.is_complete) return obj.id;
    }
    return null;
  };

  const startCraftingJob = (recipeId: string) => {
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return;
    const outputItem = getRpgItem(recipe.outputItemId);

    let buildingObjectId: number | null = null;
    if (recipe.requiredBuilding) {
      buildingObjectId = findStationObjectId(recipe.requiredBuilding);
      if (!buildingObjectId) {
        showWorldToast({ text: `Need a built ${recipe.requiredBuilding} first`, item: outputItem, tone: 'warn' });
        return;
      }
    }

    const result = startCrafting(recipeId, buildingObjectId);
    if (result !== 'ok') {
      showWorldToast({
        text: result === 'missing_ingredients' ? 'Missing ingredients'
          : result === 'building_busy' ? `${recipe.requiredBuilding} is busy`
            : 'Could not start crafting',
        item: outputItem,
        tone: 'warn',
      });
      return;
    }
    bumpInventoryRevision();
    setCraftingJobsRevision(rev => rev + 1);
    showWorldToast({ text: `Started crafting ${outputItem?.name ?? recipe.outputItemId}`, item: outputItem, tone: 'success' });
  };

  const claimCraftingJob = (jobId: number, recipeId: string) => {
    const recipe = getCraftingRecipe(recipeId);
    const outputItem = recipe ? getRpgItem(recipe.outputItemId) : null;
    const result = claimCrafting(jobId);
    if (result !== 'ok') {
      showWorldToast({
        text: result === 'not_ready' ? 'Not finished yet' : 'Could not claim',
        item: outputItem,
        tone: 'warn',
      });
      return;
    }
    if (recipe) recordRpgDiscovery(recipe.outputItemId, 'inventory');
    bumpInventoryRevision();
    setCraftingJobsRevision(rev => rev + 1);
    showWorldToast({ text: `Crafted ${outputItem?.name ?? recipeId}`, item: outputItem, tone: 'success' });
  };

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);

  useEffect(() => () => {
    if (worldToastTimer.current) clearTimeout(worldToastTimer.current);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    if (worldCellReactionTimer.current) clearTimeout(worldCellReactionTimer.current);
  }, []);

  // Flips sanctuary_constructions.is_complete once finish_at has passed.
  // No dedicated game-tick engine exists yet (System B's GameTicker.tsx
  // is unused) — a lightweight interval is the pragmatic stand-in.
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const completed = checkAndCompleteConstructions();
        if (completed > 0) {
          showWorldToast({ text: `${completed} construction${completed > 1 ? 's' : ''} finished`, tone: 'success' });
        }
      } catch (e) {
        console.warn('Failed to check construction completion', e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Re-renders the open Crafting panel periodically so "In progress" jobs
  // flip to "Claim" once their timer passes, without needing a manual action.
  useEffect(() => {
    if (!isCraftingOpen) return;
    const interval = setInterval(() => setCraftingJobsRevision(rev => rev + 1), 5000);
    return () => clearInterval(interval);
  }, [isCraftingOpen]);

  useEffect(() => {
    try {
      // One-time test-state wipe (2026-06-30, requested for big-building
      // testing) — clears all placed objects/plots/terrain so the Sanctuary
      // is a blank canvas. Gated so it only ever runs once.
      const mapCleared = db.getFirstSync<{ item_id: string }>(
        "SELECT item_id FROM rpg_discoveries WHERE item_id = 'system.sanctuary_map_clear_test_v1' LIMIT 1",
      );
      if (!mapCleared) {
        db.runSync('DELETE FROM sanctuary_objects');
        db.runSync('DELETE FROM garden_plots');
        db.runSync('DELETE FROM farming_plots');
        db.runSync('DELETE FROM sanctuary_terrain_overrides');
        db.runSync('DELETE FROM sanctuary_object_interactions');
        db.runSync('DELETE FROM sanctuary_object_relations');
        db.runSync('DELETE FROM sanctuary_reward_claims');
        db.runSync('DELETE FROM sanctuary_ponds');
        db.runSync('DELETE FROM sanctuary_building_plots');
        db.runSync('DELETE FROM sanctuary_zones');
        // Also reset the natural-spawn seed flags (clutter/rock veins/
        // villager) and the zone-migration flag — otherwise
        // ensureStarterSpawns below sees them as "already seeded" and
        // skips re-inserting what was just deleted, and migrateLegacyZones
        // skips re-running against the now-empty legacy tables (which is
        // harmless, but leaves the flag pointing at a wipe that no longer
        // exists).
        db.runSync(
          "DELETE FROM rpg_discoveries WHERE item_id IN ('system.sanctuary_clutter_v1', 'system.sanctuary_rock_veins_v1', 'system.sanctuary_zones_migration_v1')",
        );
        db.runSync(
          "INSERT OR REPLACE INTO rpg_discoveries (item_id, source, last_seen_at) VALUES ('system.sanctuary_map_clear_test_v1', 'system', datetime('now', 'localtime'))",
        );
      }

      const rpgRow = db.getFirstSync<{ last_active_date: string | null }>(
        'SELECT last_active_date FROM rpg_state WHERE id = 1',
      );
      const today = logicalToday();
      if (rpgRow?.last_active_date && rpgRow.last_active_date < today) {
        const daysPassed = Math.floor(
          (new Date(today).getTime() - new Date(rpgRow.last_active_date).getTime()) / 86400000,
        );
        if (daysPassed > 0) {
          fastForwardTime(daysPassed);
          respawnStarterSpawns(STARTER_CLUTTER_SPAWNS);
          respawnStarterSpawns(STARTER_ROCK_VEIN_SPAWNS);
        }
      }
      refreshCalendar();
      refreshMapObjects();
      refreshGardenPlots();
      refreshCoins();
      refreshPlayerHp();
      refreshEquippedTool();
      refreshWeather();
      const kills = db.getAllSync<{ uid: string }>('SELECT uid FROM dungeon_enemy_kills');
      kills.forEach(row => defeatedEnemyUids.current.add(row.uid));

      const overrideRows = db.getAllSync<{ row: number; col: number; tile_type: number }>(
        'SELECT row, col, tile_type FROM sanctuary_terrain_overrides',
      );
      let loadedOverrides: Record<string, TileType> = {};
      if (overrideRows.length > 0) {
        overrideRows.forEach(o => { loadedOverrides[`${o.row}:${o.col}`] = o.tile_type as TileType; });
        setTerrainOverrides(loadedOverrides);
      }
      // One-time legacy backfill, then a retroactive scan — picks up any
      // ring that was already fully built before zone declaration
      // existed, not just ones completed by a brand-new placement going
      // forward. zonesOverride is passed explicitly since the
      // sanctuaryZones state set by refreshSanctuaryZones() here won't
      // be visible via closure until next render.
      migrateLegacyZones();
      const loadedZones = refreshSanctuaryZones();
      const loadedObjects = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
      scanForZoneCandidates(loadedObjects, loadedOverrides, loadedZones);

      if (ensureStarterSpawns(STARTER_CLUTTER_SPAWNS, 'system.sanctuary_clutter_v1')) {
        refreshMapObjects();
      }
      if (ensureStarterSpawns(STARTER_ROCK_VEIN_SPAWNS, 'system.sanctuary_rock_veins_v1')) {
        refreshMapObjects();
      }

      const villagerExists = db.getFirstSync<{ id: number }>(
        'SELECT id FROM sanctuary_objects WHERE type = ?',
        STARTER_VILLAGER_SPAWN.type,
      );
      if (!villagerExists) {
        db.runSync(
          'INSERT INTO sanctuary_objects (type, row, col) VALUES (?, ?, ?)',
          STARTER_VILLAGER_SPAWN.type, STARTER_VILLAGER_SPAWN.row, STARTER_VILLAGER_SPAWN.col,
        );
        refreshMapObjects();
      }

      STARTER_TOOL_ITEM_IDS.forEach(itemId => {
        db.runSync(
          'INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1) ON CONFLICT(item_id) DO NOTHING',
          itemId,
        );
      });
      // Real food-crop seeds have no in-game acquisition path yet (no
      // Shop entry, no forage drop) — granted for testability, same as
      // the starter tools above, until a real source exists.
      STARTER_FARMING_SEED_ITEM_IDS.forEach(itemId => {
        db.runSync(
          'INSERT INTO user_inventory (item_id, quantity) VALUES (?, 3) ON CONFLICT(item_id) DO NOTHING',
          itemId,
        );
      });
      // Fertiliser/Sprinkler have a real acquisition path (craft at Tool
      // Shed stations), but that's a long Build→wait→Build→wait→Craft→wait
      // chain to reach just to test the effect — granted directly too,
      // same testability rationale as the starter seeds above.
      db.runSync(
        "INSERT INTO user_inventory (item_id, quantity) VALUES ('rpg_fertiliser', 2) ON CONFLICT(item_id) DO NOTHING",
      );
      db.runSync(
        "INSERT INTO user_inventory (item_id, quantity) VALUES ('rpg_sprinkler', 2) ON CONFLICT(item_id) DO NOTHING",
      );
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
    const ownCol = Math.floor(footX / TILE_SIZE);
    const ownRow = Math.floor(footY / TILE_SIZE);

    // Water is walkable but a hazard — falling in sends you back to spawn.
    // Bridge tiles are the actual safe way across (different TileType).
    if (
      ownRow >= 0 && ownRow < mapRows.value && ownCol >= 0 && ownCol < mapCols.value &&
      waterMap.value[ownRow * mapCols.value + ownCol] === 1
    ) {
      avatarX.value = TILE_SIZE * 2;
      avatarY.value = TILE_SIZE * 2;
      runOnJS(showWorldToast)({ text: 'Swept back to shore!', tone: 'warn' });
      return;
    }

    let col = ownCol;
    let row = ownRow;
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

  const showObjectReaction = (
    object: MapObject,
    label: string,
    item: RpgItemDefinition | null | undefined,
    tone: WorldCellReaction['tone'] = 'muted',
  ) => {
    const objectItem = getPlaceableItem(object.type);
    if (worldCellReactionTimer.current) clearTimeout(worldCellReactionTimer.current);
    setWorldCellReaction({
      id: Date.now(),
      row: object.row,
      col: object.col,
      colWidth: objectItem?.colWidth ?? 1,
      label,
      item,
      tone,
    });
    worldCellReactionTimer.current = setTimeout(() => setWorldCellReaction(null), 900);
  };

  const showPlotReaction = (
    plot: GardenPlot,
    label: string,
    item: RpgItemDefinition | null | undefined,
    tone: WorldCellReaction['tone'] = 'muted',
  ) => {
    if (worldCellReactionTimer.current) clearTimeout(worldCellReactionTimer.current);
    setWorldCellReaction({
      id: Date.now(),
      row: plot.row,
      col: plot.col,
      colWidth: 1,
      label,
      item,
      tone,
    });
    worldCellReactionTimer.current = setTimeout(() => setWorldCellReaction(null), 900);
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
    if (tags?.includes('animal')) return 'Animal needs a little time';
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

  const isFarmAnimalObject = (item: ShopCatalogItem) => item.tags?.includes('animal') && item.tags?.includes('livestock');

  const getAnimalProductText = (item: ShopCatalogItem, dropDef: RpgItemDefinition | null, quantity: number) => {
    const reward = `+${quantity} ${dropDef?.name ?? 'product'}`;
    if (item.tags?.includes('chick')) return `Collected egg: ${reward}`;
    if (item.tags?.includes('piglet')) return `Piglet found: ${reward}`;
    if (item.tags?.includes('sheep')) return `Gathered wool: ${reward}`;
    if (item.tags?.includes('calf')) return `Collected milk: ${reward}`;
    return `Animal product: ${reward}`;
  };

  const collectAnimalProduct = (object: MapObject, item: ShopCatalogItem) => {
    const now = Date.now();
    if ((forageCooldowns.current[object.id] ?? 0) > now) {
      showObjectReaction(object, '...', item, 'muted');
      showWorldToast({ text: 'Animal needs a little time', item, tone: 'muted' });
      return;
    }

    forageCooldowns.current[object.id] = now + ANIMAL_PRODUCT_COOLDOWN_MS;
    const drop = rollForageDrop(item.forageDrops ?? []);
    if (!drop) {
      showObjectReaction(object, 'rest', item, 'muted');
      showWorldToast({ text: `${item.name} is resting`, item, tone: 'muted' });
      return;
    }

    const dropDef = getRpgItem(drop.itemId);
    addSandboxInventoryItem(drop.itemId, drop.quantity, 'forage');
    showObjectReaction(object, `+${drop.quantity}`, dropDef, 'success');
    showWorldToast({
      text: getAnimalProductText(item, dropDef, drop.quantity),
      item: dropDef,
      tone: 'success',
    });
  };

  const isVillagerObject = (item: ShopCatalogItem) => item.tags?.includes('villager');

  // Minimal villager stub (RPG resource dynamics spec, 2026-06-30): Interact
  // always succeeds — it never blocks, even once the blueprint pool is dry,
  // because the future villager system needs Interact to stay a stable verb
  // (NPC-to-NPC trading etc). It just has nothing to give once exhausted.
  const VILLAGER_BLUEPRINT_CHANCE = 0.2;
  const interactWithVillager = (object: MapObject, item: ShopCatalogItem) => {
    if (Math.random() < VILLAGER_BLUEPRINT_CHANCE) {
      const blueprintId = tryDropBlueprint();
      if (blueprintId) {
        bumpInventoryRevision();
        const blueprintItem = getRpgItem(blueprintId);
        showWorldToast({ text: `${item.name} hands you: ${blueprintItem?.name ?? blueprintId}`, item: blueprintItem, tone: 'success' });
        showObjectReaction(object, '!', item, 'success');
        return;
      }
    }
    showWorldToast({ text: `${item.name} has nothing for you right now`, item, tone: 'muted' });
    showObjectReaction(object, '...', item, 'muted');
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
      if (tags.includes('clutter')) return 'Clearable land clutter';
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

  const isClearableClutter = (item: ShopCatalogItem) => item.tags?.includes('clutter') && item.tags?.includes('clearable');

  const getClutterDrops = (item: ShopCatalogItem): HarvestDrop[] => {
    if (item.tags?.includes('weed')) {
      return rollHarvestDrops([{ itemId: 'rpg_leaves', chance: 1, min: 1, max: 2 }]);
    }
    if (item.tags?.includes('twig')) {
      return rollHarvestDrops([{ itemId: RPG_WOOD_ITEM_ID, chance: 1, min: 1, max: 2 }]);
    }
    if (item.tags?.includes('rock')) {
      return rollHarvestDrops([
        { itemId: RPG_STONE_ITEM_ID, chance: 1, min: 1, max: 2 },
        { itemId: RPG_CRYSTAL_SHARDS_ITEM_ID, chance: 0.65, min: 1, max: 1 },
      ]);
    }
    return [];
  };

  const clearClutterObject = (object: MapObject, item: ShopCatalogItem) => {
    if (!spendEnergy(CLUTTER_ENERGY_COST)) return;
    const drops = getClutterDrops(item);

    try {
      db.execSync('BEGIN TRANSACTION');
      if (!deleteSanctuaryObjectInteractions(object.id)) {
        throw new Error('Failed to clean clutter interactions');
      }
      if (!deleteSanctuaryObjectRelationsForObject(object.id)) {
        throw new Error('Failed to clean clutter relations');
      }
      db.runSync('DELETE FROM sanctuary_objects WHERE id = ?', object.id);
      drops.forEach(drop => {
        if (drop.quantity <= 0) return;
        db.runSync(
          `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
           ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
          drop.itemId,
          drop.quantity,
        );
        recordRpgDiscovery(drop.itemId, 'forage');
      });
      db.execSync('COMMIT');
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to clear sanctuary clutter', e);
      showWorldToast({ text: 'Could not clear clutter', item, tone: 'warn' });
      return;
    }

    bumpInventoryRevision();
    const nextObjects = refreshMapObjects();
    applyMovementCollision(nextObjects);
    const rewardText = drops.length
      ? drops.map(drop => {
          const dropItem = getRpgItem(drop.itemId);
          return `+${drop.quantity} ${dropItem?.name ?? drop.itemId}`;
        }).join(', ')
      : 'ground cleared';
    showWorldToast({
      text: `Cleared ${item.name}: ${rewardText}`,
      item: drops[0] ? getRpgItem(drops[0].itemId) : item,
      tone: 'success',
    });
    showObjectReaction(object, drops.length ? rewardText : 'clear', drops[0] ? getRpgItem(drops[0].itemId) : item, 'success');
  };

  // Free, naturally-occurring rock — Pickaxe-gated, unlike clutter (which
  // any tool can clear). Same delete-then-nightly-respawn shape as clutter,
  // just with mining drops (Stone + a real Coal source) instead.
  const mineRockVein = (object: MapObject) => {
    if (!spendToolEnergy('rpg_pickaxe_basic')) return;
    const drops = rollHarvestDrops([
      { itemId: RPG_STONE_ITEM_ID, chance: 1, min: 1, max: 3 },
      { itemId: 'rpg_coal', chance: 0.3, min: 1, max: 1 },
    ]);
    try {
      db.execSync('BEGIN TRANSACTION');
      deleteSanctuaryObjectInteractions(object.id);
      deleteSanctuaryObjectRelationsForObject(object.id);
      db.runSync('DELETE FROM sanctuary_objects WHERE id = ?', object.id);
      drops.forEach(drop => {
        if (drop.quantity <= 0) return;
        db.runSync(
          `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
           ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
          drop.itemId, drop.quantity,
        );
        recordRpgDiscovery(drop.itemId, 'forage');
      });
      db.execSync('COMMIT');
    } catch (e) {
      try { db.execSync('ROLLBACK'); } catch {}
      console.warn('Failed to mine rock vein', e);
      showWorldToast({ text: 'Could not mine this', tone: 'warn' });
      return;
    }
    bumpInventoryRevision();
    refreshMapObjects();
    const rewardText = drops.map(drop => `+${drop.quantity} ${getRpgItem(drop.itemId)?.name ?? drop.itemId}`).join(', ');
    showWorldToast({ text: `Mined: ${rewardText}`, item: getRpgItem(drops[0]?.itemId ?? null), tone: 'success' });
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

    if (isClearableClutter(item)) {
      clearClutterObject(object, item);
      return;
    }

    if (isVillagerObject(item)) {
      interactWithVillager(object, item);
      return;
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
      showObjectReaction(object, isOn ? 'ON' : 'OFF', item, affected.length ? 'success' : 'muted');
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
      showObjectReaction(object, isDisabled ? 'safe' : 'armed', item, isDisabled ? 'success' : 'muted');
      return;
    }

    if (isGateObject(item)) {
      if (getSanctuaryObjectInteractionCount(object.id, 'open_gate') % 2 === 1) {
        showObjectReaction(object, 'open', item, 'success');
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
      showObjectReaction(object, 'locked', item, 'muted');
      return;
    }

    if (isFarmAnimalObject(item)) {
      collectAnimalProduct(object, item);
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
      showObjectReaction(object, `+${item.interactLoot.coins}`, item, 'success');
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
        showObjectReaction(object, result.drops[0] ? `+${result.drops[0].quantity}` : `+${result.coins}`, firstDrop ? getRpgItem(firstDrop.itemId) : item, 'success');
      } else {
        showWorldToast({
          text: result.reason === 'already_claimed' ? 'Chest is empty' : 'Chest jammed',
          item,
          tone: result.reason === 'already_claimed' ? 'muted' : 'warn',
        });
        showObjectReaction(object, result.reason === 'already_claimed' ? 'empty' : 'jam', item, result.reason === 'already_claimed' ? 'muted' : 'warn');
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
      showObjectReaction(object, '...', item, 'muted');
      showWorldToast({ text: getForageCooldownText(item.tags), tone: 'muted' });
      return;
    }
    forageCooldowns.current[object.id] = now + 1200;

    const drop = rollForageDrop(item.forageDrops);
    if (!drop) {
      showObjectReaction(object, 'none', item, 'muted');
      showWorldToast({ text: getForageEmptyText(item), item, tone: 'muted' });
      return;
    }

    const dropDef = getRpgItem(drop.itemId);
    addSandboxInventoryItem(drop.itemId, drop.quantity, 'forage');
    showObjectReaction(object, `+${drop.quantity}`, dropDef, 'success');
    showWorldToast({
      text: getForageSuccessText(item, dropDef, drop.quantity),
      item: dropDef,
      tone: 'success',
    });
  };

  const waterGardenPlot = (plot: GardenPlot) => {
    const growth = getPlotGrowthInfo(plot);
    if (!growth.crop) {
      showPlotReaction(plot, 'missing', null, 'warn');
      showWorldToast({ text: 'Crop data missing', tone: 'warn' });
      return;
    }

    if (growth.stage >= 2) {
      showPlotReaction(plot, 'ready', getRpgItem(plot.seed_item_id), 'success');
      showWorldToast({ text: 'Ready to harvest', item: getRpgItem(plot.seed_item_id), tone: 'success' });
      return;
    }

    const nextStage = Math.min(2, growth.stage + 1) as GrowthStage;
    if (isRaining) {
      if (!spendToolEnergy('rpg_watering_can_basic')) return;
      updatePlantGrowth(plot.id, nextStage);
      refreshGardenPlots();
      showPlotReaction(plot, nextStage >= 2 ? 'mature' : '+growth', getRpgItem(plot.seed_item_id), 'success');
      showWorldToast({
        text: nextStage >= 2 ? 'Rain helped it mature' : 'Rain helped water crop',
        item: getRpgItem(plot.seed_item_id),
        tone: 'success',
      });
      return;
    }

    if (getInventoryQuantity(RPG_WATER_DROPS_ITEM_ID) <= 0) {
      showPlotReaction(plot, 'need drop', getRpgItem(RPG_WATER_DROPS_ITEM_ID), 'warn');
      showWorldToast({ text: 'Need Water Drops', item: getRpgItem(RPG_WATER_DROPS_ITEM_ID), tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('rpg_watering_can_basic')) return;
    const result = advanceGardenPlotWithInventoryItem(plot.id, RPG_WATER_DROPS_ITEM_ID, nextStage);
    if (result.ok) {
      bumpInventoryRevision();
      refreshGardenPlots();
      showPlotReaction(plot, result.stage >= 2 ? 'mature' : '+growth', getRpgItem(RPG_WATER_DROPS_ITEM_ID), 'success');
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
      showPlotReaction(
        plot,
        result.reason === 'no_item' ? 'need drop' : result.reason === 'no_plot' ? 'missing' : 'failed',
        result.reason === 'no_item' ? getRpgItem(RPG_WATER_DROPS_ITEM_ID) : getRpgItem(plot.seed_item_id),
        'warn',
      );
    }
  };

  const inspectOrHarvestPlot = (plot: GardenPlot) => {
    const growth = getPlotGrowthInfo(plot);
    if (!growth.crop) {
      showPlotReaction(plot, 'missing', null, 'warn');
      showWorldToast({ text: 'Crop data missing', tone: 'warn' });
      return;
    }

    if (growth.stage < 2) {
      if (isRaining) {
        const nextStage = Math.min(2, growth.stage + 1) as GrowthStage;
        updatePlantGrowth(plot.id, nextStage);
        refreshGardenPlots();
        showPlotReaction(plot, nextStage >= 2 ? 'mature' : '+rain', getRpgItem(plot.seed_item_id), 'success');
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
      showPlotReaction(plot, `${growth.remainingMinutes}m`, getRpgItem(plot.seed_item_id), 'muted');
      return;
    }

    const seasonalBonus = { ...seasonInfo.bonus };
    const cropAffinityDrop = growth.crop.preferredSeasons.includes(currentSeason)
      ? { itemId: growth.crop.harvest.drops[0]?.itemId ?? 'rpg_leaves', quantity: 1 }
      : null;
    const drops = [
      ...rollHarvestDrops(growth.crop.harvest.drops),
      seasonalBonus,
      ...(cropAffinityDrop ? [cropAffinityDrop] : []),
    ];
    const result = harvestGardenPlot(plot.id, growth.crop.harvest.coins, drops);
    if (!result.ok) {
      showWorldToast({
        text: result.reason === 'no_plot' ? 'Already harvested' : 'Harvest failed',
        tone: 'warn',
      });
      showPlotReaction(plot, result.reason === 'no_plot' ? 'gone' : 'failed', getRpgItem(plot.seed_item_id), 'warn');
      refreshGardenPlots();
      return;
    }

    refreshCoins();
    bumpInventoryRevision();
    refreshGardenPlots();

    const firstDrop = result.drops[0];
    const firstDropItem = firstDrop ? getRpgItem(firstDrop.itemId) : null;
    const dropText = firstDrop ? `, +${firstDrop.quantity} ${firstDropItem?.name ?? firstDrop.itemId}` : '';
    const seasonalItem = getRpgItem(seasonalBonus.itemId);
    const affinityItem = cropAffinityDrop ? getRpgItem(cropAffinityDrop.itemId) : null;
    const affinityText = cropAffinityDrop && affinityItem ? `, in-season +${cropAffinityDrop.quantity} ${affinityItem.name}` : '';
    showPlotReaction(plot, cropAffinityDrop ? 'season+' : `+${result.coins}`, affinityItem ?? firstDropItem ?? seasonalItem ?? getRpgItem(plot.seed_item_id), 'success');
    showWorldToast({
      text: `Harvested +${result.coins} coins${dropText}, ${seasonInfo.label} +${seasonalBonus.quantity} ${seasonalItem?.name ?? seasonalBonus.itemId}${affinityText}`,
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
      // Enemies have chase AI and move every frame — requiring them to sit
      // on the exact single front-facing tile makes melee feel like it
      // whiffs constantly. Attack is lenient: it hits any enemy on the
      // avatar's own tile or the 4 tiles around it, preferring the one
      // directly faced if there's a choice.
      const ownCell = getAvatarFootCell();
      const candidateCells = [
        current,
        ownCell,
        { row: ownCell.row - 1, col: ownCell.col },
        { row: ownCell.row + 1, col: ownCell.col },
        { row: ownCell.row, col: ownCell.col - 1 },
        { row: ownCell.row, col: ownCell.col + 1 },
      ];
      let targetEnemy: LiveEnemy | null = current.target?.kind === 'enemy' ? current.target.enemy ?? null : null;
      if (!targetEnemy) {
        for (const cell of candidateCells) {
          const hit = enemies.find(e => e.row === cell.row && e.col === cell.col);
          if (hit) { targetEnemy = hit; break; }
        }
      }

      const stats = db.getFirstSync<{ str: number; foc: number; agi: number; wis: number; res: number }>(
        'SELECT strength as str, focus as foc, agility as agi, wisdom as wis, resilience as res FROM rpg_state WHERE id = 1',
      );
      if (stats && targetEnemy) {
        const atk = Math.floor((stats.str + stats.foc + stats.agi + stats.wis + stats.res) / 5);
        resolveEnemyHit(targetEnemy, atk);
      } else if (activeZone === 'dungeon') {
        showWorldToast({ text: 'No enemy in range', tone: 'muted' });
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
    return nextOverrides;
  };

  // Any object tagged as a structure piece (Stone Wall/Brick/Wooden Pole)
  // or an entrance (Door/Rope/Gate) can seal a zone ring — declaration is
  // free-form (the perimeter material no longer dictates the zone type),
  // so detection only needs one tag check instead of three per-type ones.
  const isZonePerimeterObject = (obj: MapObject) => {
    const tags = getItem(obj.type)?.tags;
    return !!tags && (tags.includes('structure_piece') || tags.includes('entrance'));
  };

  const zoneCandidateKey = (candidate: PendingZoneCandidate) => [...candidate.interiorCells].sort().join(',');

  // Generalized replacement for the old checkPondCompletion/
  // checkBuildingPlotCompletion duplicated flood-fill. Since declaration
  // is now free-form, this no longer cares what tile type is inside the
  // ring. Uses a flood-from-the-outside algorithm (see Step 1/2 below):
  // an enclosed region is any walkable area the map's open exterior
  // cannot reach. Returns every currently-enclosed, not-yet-zoned region
  // — callers diff against pendingZoneCandidates to know what's new.
  const findEnclosures = (
    objectsOverride?: MapObject[],
    overridesOverride?: Record<string, TileType>,
    zonesOverride?: SanctuaryZoneRecord[],
  ): PendingZoneCandidate[] => {
    const overrides = overridesOverride ?? terrainOverrides;
    const objects = objectsOverride ?? mapObjects;
    const zones = zonesOverride ?? sanctuaryZones;

    const perimeterCoords = new Set(objects.filter(isZonePerimeterObject).map(obj => `${obj.row}:${obj.col}`));
    if (perimeterCoords.size === 0) return [];

    // Cells already part of any recorded zone (active or breached) are
    // off-limits to fresh detection — a breached zone must be explicitly
    // repaired/redeclared, not silently rediscovered as a new candidate.
    const alreadyZoned = new Set(zones.flatMap(z => [...z.interiorCells, ...z.perimeterCells]));

    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const rows = SanctuaryMap.length;
    const cols = SanctuaryMap[0].length;

    // "Open" = a cell the player could walk through that is NOT a barrier.
    // Barriers are: out of bounds, collision tiles (incl. the map's outer
    // wall), the player's own perimeter pieces, and cells owned by an
    // existing zone. The exterior flood and the enclosed grouping below
    // both move only through open cells.
    const isOpen = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
      const key = `${r}:${c}`;
      if (perimeterCoords.has(key) || alreadyZoned.has(key)) return false;
      const tile = (overrides[key] ?? SanctuaryMap[r][c]) as TileType;
      return !TILE_COLLISION[tile];
    };

    // Step 1 — flood the EXTERIOR. This is the "flood from the outside"
    // approach, which is correct by construction and replaces the old
    // seed-from-each-wall + size-cap heuristic that produced phantom
    // sliver zones. Seed from the open ring just inside the map's outer
    // wall (the main play area always touches it) and flood through every
    // open cell. Everything reachable from there is, by definition, NOT
    // enclosed — including the whole open map, so a breach gap can never
    // turn the map into one giant zone. Consequence (intentional): a
    // zone must be sealed ENTIRELY by perimeter pieces; the map edge
    // cannot serve as one of its walls.
    const exterior = new Set<string>();
    const stack: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const onInnerRing = r === 1 || c === 1 || r === rows - 2 || c === cols - 2;
        if (onInnerRing && isOpen(r, c)) stack.push([r, c]);
      }
    }
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r}:${c}`;
      if (exterior.has(key)) continue;
      exterior.add(key);
      for (const [dr, dc] of deltas) {
        if (isOpen(r + dr, c + dc) && !exterior.has(`${r + dr}:${c + dc}`)) {
          stack.push([r + dr, c + dc]);
        }
      }
    }

    // Step 2 — every open cell NOT in the exterior is enclosed. Group
    // them into connected components; each component is one zone
    // candidate, with its bordering perimeter pieces recorded.
    const visited = new Set<string>();
    const results: PendingZoneCandidate[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}:${c}`;
        if (!isOpen(r, c) || exterior.has(key) || visited.has(key)) continue;

        const component: string[] = [];
        const perimeterTouched = new Set<string>();
        const compStack: [number, number][] = [[r, c]];
        while (compStack.length > 0) {
          const [cr, cc] = compStack.pop()!;
          const ck = `${cr}:${cc}`;
          if (visited.has(ck)) continue;
          visited.add(ck);
          component.push(ck);
          for (const [dr, dc] of deltas) {
            const nKey = `${cr + dr}:${cc + dc}`;
            if (perimeterCoords.has(nKey)) {
              perimeterTouched.add(nKey);
            } else if (isOpen(cr + dr, cc + dc) && !exterior.has(nKey)) {
              compStack.push([cr + dr, cc + dc]);
            }
          }
        }

        if (perimeterTouched.size > 0 && component.length > 0) {
          results.push({ interiorCells: component, perimeterCells: [...perimeterTouched] });
        }
      }
    }
    return results;
  };

  const scanForZoneCandidates = (
    objectsOverride?: MapObject[],
    overridesOverride?: Record<string, TileType>,
    zonesOverride?: SanctuaryZoneRecord[],
  ) => {
    const found = findEnclosures(objectsOverride, overridesOverride, zonesOverride);
    setPendingZoneCandidates(prev => {
      const prevKeys = new Set(prev.map(zoneCandidateKey));
      const isNew = found.some(c => !prevKeys.has(zoneCandidateKey(c)));
      if (isNew) {
        showWorldToast({ text: 'Zone formed — step inside and Interact to declare its purpose', tone: 'success' });
      }
      return found;
    });
  };

  const refreshSanctuaryZones = () => {
    const rows = db.getAllSync<{ id: number; type: string; state: string; interior_cells: string; perimeter_cells: string }>(
      'SELECT id, type, state, interior_cells, perimeter_cells FROM sanctuary_zones',
    );
    const parsed: SanctuaryZoneRecord[] = rows.map(r => ({
      id: r.id,
      type: r.type as SanctuaryZoneType,
      state: r.state as SanctuaryZoneState,
      interiorCells: JSON.parse(r.interior_cells),
      perimeterCells: JSON.parse(r.perimeter_cells),
    }));
    setSanctuaryZones(parsed);
    return parsed;
  };

  const ZONE_TYPE_LABEL: Record<SanctuaryZoneType, string> = {
    pond: 'Pond',
    garden: 'Garden',
    building_plot: 'Building Plot',
  };

  const declareZone = (candidate: PendingZoneCandidate, type: SanctuaryZoneType) => {
    db.runSync(
      'INSERT INTO sanctuary_zones (type, state, interior_cells, perimeter_cells, created_at) VALUES (?, ?, ?, ?, ?)',
      type, 'active', JSON.stringify(candidate.interiorCells), JSON.stringify(candidate.perimeterCells), Date.now(),
    );
    refreshSanctuaryZones();
    const candidateId = zoneCandidateKey(candidate);
    setPendingZoneCandidates(prev => prev.filter(c => zoneCandidateKey(c) !== candidateId));
    showWorldToast({ text: `${ZONE_TYPE_LABEL[type]} declared!`, tone: 'success' });
  };

  const promptZoneDeclaration = (candidate: PendingZoneCandidate) => {
    Alert.alert(
      'Declare Zone',
      `This enclosed area (${candidate.interiorCells.length} tiles) can become a Pond, Garden, or Building Plot.`,
      [
        { text: 'Pond', onPress: () => declareZone(candidate, 'pond') },
        { text: 'Garden', onPress: () => declareZone(candidate, 'garden') },
        { text: 'Building Plot', onPress: () => declareZone(candidate, 'building_plot') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // Dev-only testing tool (requested 2026-06-30) — standing in any
  // existing zone (active or breached) and Interacting offers a one-tap
  // way to wipe its DB row, so a declared/breached zone can be redeclared
  // from scratch without manually clearing the database. Same convenience
  // philosophy as the TESTING_FREE_SHOP-style flags elsewhere; revisit
  // before launch.
  const promptZoneDevUndo = (zone: SanctuaryZoneRecord) => {
    Alert.alert(
      `${ZONE_TYPE_LABEL[zone.type]} (${zone.state})`,
      'Dev testing tool — delete this zone record so the area can be redeclared from scratch.',
      [
        {
          text: 'Delete Zone (test)',
          style: 'destructive',
          onPress: () => {
            db.runSync('DELETE FROM sanctuary_zones WHERE id = ?', zone.id);
            refreshSanctuaryZones();
            showWorldToast({ text: 'Zone deleted (test)', tone: 'warn' });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // Breach failsafe: removing a perimeter piece that belongs to an active
  // zone flips that zone to 'breached' rather than deleting it — its
  // cells drop out of zoneCellMap immediately (the memo only maps
  // 'active' zones), but the DB row persists so a future repair flow can
  // resolve it back to 'active' without redeclaring from scratch.
  const breachZoneIfPerimeterRemoved = (object: MapObject) => {
    if (!isZonePerimeterObject(object)) return;
    const key = `${object.row}:${object.col}`;
    const zone = sanctuaryZones.find(z => z.state === 'active' && z.perimeterCells.includes(key));
    if (!zone) return;
    db.runSync('UPDATE sanctuary_zones SET state = ? WHERE id = ?', 'breached', zone.id);
    refreshSanctuaryZones();
    showWorldToast({
      text: `${ZONE_TYPE_LABEL[zone.type]} breached! Repair the perimeter to restore it.`,
      tone: 'warn',
    });
  };

  // One-time migration: the old sanctuary_ponds/sanctuary_building_plots
  // tables stored a flat list of tile_keys with no grouping field at all
  // — there was no way to tell which tiles belonged to the same pond if a
  // player had built two. Re-derive distinct zone instances via the same
  // connected-component grouping, then recompute each one's perimeter by
  // checking which structure/entrance pieces actually border it.
  const migrateLegacyZones = () => {
    const flag = db.getFirstSync<{ item_id: string }>(
      "SELECT item_id FROM rpg_discoveries WHERE item_id = 'system.sanctuary_zones_migration_v1' LIMIT 1",
    );
    if (flag) return;

    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const groupTileKeys = (tileKeys: string[]): string[][] => {
      const set = new Set(tileKeys);
      const visited = new Set<string>();
      const groups: string[][] = [];
      for (const start of set) {
        if (visited.has(start)) continue;
        const component: string[] = [];
        const stack = [start];
        while (stack.length > 0) {
          const key = stack.pop()!;
          if (visited.has(key)) continue;
          visited.add(key);
          component.push(key);
          const [r, c] = key.split(':').map(Number);
          for (const [dr, dc] of deltas) {
            const nKey = `${r + dr}:${c + dc}`;
            if (set.has(nKey) && !visited.has(nKey)) stack.push(nKey);
          }
        }
        groups.push(component);
      }
      return groups;
    };

    const findPerimeterFor = (component: string[], objects: MapObject[]): string[] => {
      const componentSet = new Set(component);
      const perimeter = new Set<string>();
      objects.filter(isZonePerimeterObject).forEach(obj => {
        for (const [dr, dc] of deltas) {
          if (componentSet.has(`${obj.row + dr}:${obj.col + dc}`)) {
            perimeter.add(`${obj.row}:${obj.col}`);
            break;
          }
        }
      });
      return [...perimeter];
    };

    const objects = db.getAllSync<MapObject>('SELECT * FROM sanctuary_objects');
    const pondTiles = db.getAllSync<{ tile_key: string }>('SELECT tile_key FROM sanctuary_ponds').map(r => r.tile_key);
    const plotTiles = db.getAllSync<{ tile_key: string }>('SELECT tile_key FROM sanctuary_building_plots').map(r => r.tile_key);

    groupTileKeys(pondTiles).forEach(component => {
      db.runSync(
        'INSERT INTO sanctuary_zones (type, state, interior_cells, perimeter_cells, created_at) VALUES (?, ?, ?, ?, ?)',
        'pond', 'active', JSON.stringify(component), JSON.stringify(findPerimeterFor(component, objects)), Date.now(),
      );
    });
    groupTileKeys(plotTiles).forEach(component => {
      db.runSync(
        'INSERT INTO sanctuary_zones (type, state, interior_cells, perimeter_cells, created_at) VALUES (?, ?, ?, ?, ?)',
        'building_plot', 'active', JSON.stringify(component), JSON.stringify(findPerimeterFor(component, objects)), Date.now(),
      );
    });

    db.runSync(
      "INSERT OR REPLACE INTO rpg_discoveries (item_id, source, last_seen_at) VALUES ('system.sanctuary_zones_migration_v1', 'system', datetime('now', 'localtime'))",
    );
  };

  const rakeTile = (row: number, col: number) => {
    if (!spendToolEnergy('rpg_rake_basic')) return;
    const nextOverrides = setSanctuaryTile(row, col, TileType.SAND);
    scanForZoneCandidates(undefined, nextOverrides);
    showWorldToast({ text: 'Cleared into sandy land — ring it with structure pieces to mark out a zone', tone: 'success' });
  };

  const DIG_COST = 5;

  const digTile = (row: number, col: number) => {
    const state = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id = 1');
    if (!state || state.coins < DIG_COST) {
      showWorldToast({ text: `Need ${DIG_COST} coins to dig`, tone: 'warn' });
      return;
    }
    if (!spendToolEnergy('rpg_shovel_basic')) return;
    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', DIG_COST);
    refreshCoins();
    const nextOverrides = setSanctuaryTile(row, col, TileType.WATER);
    addSandboxInventoryItem('rpg_mud', 1 + Math.floor(Math.random() * 2), 'forage');
    bumpInventoryRevision();
    scanForZoneCandidates(undefined, nextOverrides);
    showWorldToast({ text: `Dug a channel — water flows in, mud collected (-${DIG_COST} coins)`, tone: 'success' });
  };

  const plowTile = (row: number, col: number) => {
    // tillSoil (farming.ts) is now the source of truth for the energy
    // cost and the real farming_plots row — not spendToolEnergy, which
    // would double-charge energy on top of tillSoil's own TILL_COST.
    tillSoil(row, col).then(result => {
      if (result !== 'ok') {
        showWorldToast({
          text: result === 'no_energy' ? 'Too tired to till'
            : result === 'occupied' ? 'Something is already here'
              : 'Could not till',
          tone: 'warn',
        });
        return;
      }
      setSanctuaryTile(row, col, TileType.TILLED);
      refreshPlayerHp();
      showWorldToast({ text: 'Tilled the soil — ready to plant', tone: 'success' });
    });
  };

  // Dispatches by the equipped item's ToolCatalog *type*, not its itemId —
  // works for any future tier (rpg_hoe_basic, rpg_hoe_copper, ...) without
  // touching this function. Bridge/Path are NOT handled here — they're
  // placeable Backpack items now (see TERRAIN_EDIT_ITEM_IDS), not tools.
  const getFarmingPlotAt = (row: number, col: number): FarmingPlot | null => {
    try {
      return db.getFirstSync<FarmingPlot>('SELECT * FROM farming_plots WHERE row = ? AND col = ?', row, col) ?? null;
    } catch {
      return null;
    }
  };

  const inspectOrHarvestFarmPlot = (plot: FarmingPlot) => {
    if (plot.growth_stage < 2) {
      showWorldToast({
        text: plot.is_watered ? 'Still growing' : 'Needs water',
        item: getRpgItem(plot.planted_seed_id),
        tone: 'muted',
      });
      return;
    }
    harvestFarmPlot(plot.row, plot.col).then(result => {
      if (result !== 'ok') {
        showWorldToast({ text: result === 'not_ready' ? 'Not ready yet' : 'Could not harvest', tone: 'warn' });
        return;
      }
      const cropDef = getCropForSeed(plot.planted_seed_id);
      bumpInventoryRevision();
      refreshCoins();
      showWorldToast({ text: `Harvested ${cropDef?.name ?? 'crop'}`, item: getRpgItem(plot.planted_seed_id), tone: 'success' });
    });
  };

  const useEquippedTool = (row: number, col: number) => {
    const tile = mapData[row]?.[col];
    const plot = gardenPlots.find(item => item.row === row && item.col === col);
    const toolType = equippedToolItemId ? getToolDef(equippedToolItemId)?.type : null;

    if (toolType === 'WateringCan') {
      const farmPlot = getFarmingPlotAt(row, col);
      if (farmPlot?.planted_seed_id) {
        waterFarmPlot(row, col).then(result => {
          if (result !== 'ok') {
            showWorldToast({
              text: result === 'already_watered' ? 'Already watered'
                : result === 'no_energy' ? 'Too tired'
                  : 'Could not water',
              tone: 'warn',
            });
            return;
          }
          refreshPlayerHp();
          showWorldToast({ text: 'Watered', tone: 'success' });
        });
        return;
      }
      if (!plot) {
        showWorldToast({ text: 'Watering Can needs a crop', tone: 'warn' });
        return;
      }
      waterGardenPlot(plot);
      return;
    }
    if (toolType === 'Pickaxe') {
      // Rock Veins are solid (block movement, like clutter) — the avatar
      // can never literally stand on the same tile as one, so check a
      // radius around the avatar instead of just their own tile.
      const candidateCells = [
        { row, col },
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];
      const rockVein = mapObjects.find(obj => (
        obj.type === 'rpg_rock_vein' && candidateCells.some(cell => cell.row === obj.row && cell.col === obj.col)
      ));
      if (rockVein) {
        mineRockVein(rockVein);
        return;
      }
      showWorldToast({ text: 'No rock here to mine', tone: 'warn' });
      return;
    }
    if (toolType === 'Shovel') {
      if (tile !== TileType.GRASS) {
        showWorldToast({ text: 'Shovel can only dig grass into a river here', tone: 'warn' });
        return;
      }
      if (Math.abs(row - 18) <= 1 && Math.abs(col - 10) <= 1) {
        showWorldToast({ text: "Can't dig this close to the portal", tone: 'warn' });
        return;
      }
      digTile(row, col);
      return;
    }
    if (toolType === 'Hoe') {
      if (tile !== TileType.GRASS) {
        showWorldToast({ text: 'Hoe only works on grass', tone: 'warn' });
        return;
      }
      plowTile(row, col);
      return;
    }
    if (toolType === 'Rake') {
      if (tile !== TileType.GRASS) {
        showWorldToast({ text: 'Rake only works on grass', tone: 'warn' });
        return;
      }
      rakeTile(row, col);
      return;
    }
    // Axe: tree-chopping still runs through plain Interact/forage today,
    // not gated by this dispatcher yet — see RPG_ARCHITECTURE_AUDIT.md.
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

    if (activeZone === 'sanctuary' && equippedToolItemId) {
      // Till/dig/water act on the tile the player is standing on, not the
      // tile they're facing — only plain Interact (trees, objects, portals)
      // targets the adjacent front tile.
      const ownTile = getAvatarFootCell();
      useEquippedTool(ownTile.row, ownTile.col);
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

      if (resolvedTarget?.kind === 'farmplot' && resolvedTarget.farmPlot) {
        inspectOrHarvestFarmPlot(resolvedTarget.farmPlot);
        return;
      }

      if (resolvedTarget?.kind === 'portal') {
        enterZone('dungeon');
        return;
      }

      const ownFoot = getAvatarFootCell();
      const ownKey = `${ownFoot.row}:${ownFoot.col}`;
      const pendingHere = pendingZoneCandidates.find(c => c.interiorCells.includes(ownKey));
      if (pendingHere) {
        promptZoneDeclaration(pendingHere);
        return;
      }

      const zoneHere = sanctuaryZones.find(z => z.interiorCells.includes(ownKey) || z.perimeterCells.includes(ownKey));
      if (zoneHere) {
        promptZoneDevUndo(zoneHere);
        return;
      }

      showEmptyInteractionFeedback('sanctuary');
      return;
    }

    if (resolvedTarget?.kind === 'portal') enterZone('sanctuary');
    else showEmptyInteractionFeedback('dungeon');
  }

  function getZoneOverlayColor(type: SanctuaryZoneType) {
    switch (type) {
      case 'pond': return 'rgba(77,138,168,0.45)';
      case 'garden': return 'rgba(139,94,52,0.45)';
      case 'building_plot': return 'rgba(91,168,91,0.45)';
      default: return 'rgba(255,255,255,0.35)';
    }
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
      case TileType.SAND: return '#d9c08a';
      default: return '#1b1f1b';
    }
  }

  return (
    <View style={styles.container}>
      <GlobalTicker />
      <GestureDetector gesture={worldGesture}>
        <Animated.View style={[styles.world, { width: mapWidth, height: mapHeight }, worldStyle]}>
          {mapData.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.mapRow}>
              {row.map((tile, colIndex) => (
                activeZone === 'dungeon' && (tile === TileType.GRASS || tile === TileType.WALL) ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE }]}>
                    <TilesetTile {...(tile === TileType.WALL ? WALL_TILE_COORD : FLOOR_TILE_COORD)} tileSize={TILE_SIZE} />
                  </View>
                ) : tile === TileType.WATER ? (
                  <View key={`tile-${rowIndex}-${colIndex}`} style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE }]}>
                    <WaterTile tileSize={TILE_SIZE} />
                  </View>
                ) : (
                  <View
                    key={`tile-${rowIndex}-${colIndex}`}
                    style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: getTileColor(tile as TileType) }]}
                  />
                )
              ))}
            </View>
          ))}

          {activeZone === 'sanctuary' && pendingZoneCandidates.flatMap(c => c.interiorCells).map(key => {
            const [row, col] = key.split(':').map(Number);
            return (
              <View
                key={`zone-pending-${key}`}
                pointerEvents="none"
                style={[styles.zoneOverlay, { left: col * TILE_SIZE, top: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, backgroundColor: 'rgba(255,255,255,0.35)' }]}
              />
            );
          })}

          {activeZone === 'sanctuary' && sanctuaryZones.filter(z => z.state === 'active').map(zone => (
            [...zone.interiorCells, ...zone.perimeterCells].map(key => {
              const [row, col] = key.split(':').map(Number);
              return (
                <View
                  key={`zone-${zone.id}-${key}`}
                  pointerEvents="none"
                  style={[styles.zoneOverlay, { left: col * TILE_SIZE, top: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, backgroundColor: getZoneOverlayColor(zone.type) }]}
                />
              );
            })
          ))}

          {TESTING_SHOW_ZONE_MAP && activeZone === 'sanctuary' && [...zoneCellMap.entries()].map(([key, zoneId]) => {
            const [row, col] = key.split(':').map(Number);
            return (
              <View
                key={`zone-debug-${key}`}
                pointerEvents="none"
                style={[styles.zoneDebugLabel, { left: col * TILE_SIZE, top: row * TILE_SIZE }]}
              >
                <Text style={styles.zoneDebugLabelText}>{zoneId}</Text>
              </View>
            );
          })}

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
              tileSize={TILE_SIZE}
              onMoveRequest={handleObjectLongPress}
            />
          ))}

          {activeZone === 'sanctuary' && mapObjects.map(obj => {
            const buildingDef = getBuildingDef(obj.type);
            if (!buildingDef) return null;
            const construction = getConstructionForObject(obj.id);
            if (!construction || construction.is_complete) return null;
            const remainingMs = new Date(construction.finish_at.replace(' ', 'T')).getTime() - Date.now();
            const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
            return (
              <View
                key={`construction-${obj.id}`}
                pointerEvents="none"
                style={[
                  styles.constructionBadge,
                  { left: obj.col * TILE_SIZE, top: obj.row * TILE_SIZE - 20, width: buildingDef.colWidth * TILE_SIZE },
                ]}
              >
                <Feather name="clock" size={11} color="#fff" />
                <Text style={styles.constructionBadgeText}>
                  {remainingMinutes > 0 ? `${remainingMinutes}m left` : 'Finishing…'}
                </Text>
              </View>
            );
          })}

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
                    width: TILE_SIZE,
                    height: TILE_SIZE,
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

          {/* Real food crops (farming_plots) had zero visual rendering until
              now — only gardenPlots (decorative trees) were drawn. Turnip/
              Cabbage/Pumpkin have no dedicated growth-stage art, so this
              reuses the same icon-fallback pattern gardenPlots uses above. */}
          {activeZone === 'sanctuary' && db.getAllSync<FarmingPlot>(
            'SELECT * FROM farming_plots WHERE planted_seed_id IS NOT NULL',
          ).map(plot => (
            <View
              key={`farm-${plot.id}`}
              pointerEvents="none"
              style={[
                styles.gardenPlot,
                plot.growth_stage === 1 && styles.gardenPlotGrowing,
                plot.growth_stage >= 2 && styles.gardenPlotMature,
                {
                  left: plot.col * TILE_SIZE,
                  top: plot.row * TILE_SIZE,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  zIndex: plot.row,
                },
              ]}
            >
              <RpgItemIcon
                item={getRpgItem(plot.planted_seed_id)}
                size={plot.growth_stage >= 2 ? 25 : 22}
                fallbackLabel={plot.planted_seed_id ?? undefined}
              />
              <Text style={[styles.gardenStageText, plot.growth_stage >= 2 && styles.gardenStageMatureText]}>
                {plot.growth_stage >= 2 ? '!' : plot.growth_stage === 1 ? '+' : plot.is_watered ? '~' : ''}
              </Text>
            </View>
          ))}

          {activeZone === 'sanctuary' && worldCellReaction && (
            <View
              key={worldCellReaction.id}
              pointerEvents="none"
              style={[
                styles.worldCellReaction,
                worldCellReaction.tone === 'success' && styles.worldCellReactionSuccess,
                worldCellReaction.tone === 'warn' && styles.worldCellReactionWarn,
                {
                  left: (worldCellReaction.col + worldCellReaction.colWidth / 2) * TILE_SIZE - 36,
                  top: worldCellReaction.row * TILE_SIZE - 28,
                },
              ]}
            >
              {worldCellReaction.item ? (
                <RpgItemIcon item={worldCellReaction.item} size={18} />
              ) : (
                <Feather name={worldCellReaction.tone === 'warn' ? 'alert-circle' : 'star'} size={14} color="#fff2bb" />
              )}
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.worldCellReactionText}>{worldCellReaction.label}</Text>
            </View>
          )}

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
                      width: TILE_SIZE,
                      height: TILE_SIZE,
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
                  width: TILE_SIZE,
                  height: TILE_SIZE,
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

      <View style={[styles.header, { top: safeAreaInsets.top + 10 }]}>
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
              <Text style={styles.energyText}>{playerHp.energy}/{playerHp.energy_max}</Text>
            </View>
          )}
          <View style={styles.currencyPill}>
            <Feather name="circle" size={16} color="#f1c40f" />
            <Text style={styles.currencyText}>{coins}</Text>
          </View>
          {activeZone === 'sanctuary' && (
            <View style={[styles.weatherPill, { borderColor: seasonInfo.color }]}>
              <Feather name={isRaining ? 'cloud-rain' : seasonInfo.icon} size={13} color={seasonInfo.color} />
              <View style={styles.weatherTextStack}>
                <Text numberOfLines={1} style={[styles.weatherText, { color: seasonInfo.color }]}>
                  {seasonInfo.label} {isRaining ? 'Rain' : 'Clear'}
                </Text>
                <Text numberOfLines={1} style={styles.weatherHint}>{seasonInfo.hint}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {!buildItem && (
        <View style={[styles.hudActions, { top: safeAreaInsets.top + 56, left: 20 + safeAreaInsets.left }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open backpack"
            style={styles.iconHudBtn}
            onPress={() => {
              setIsShopOpen(false);
              setIsArchiveOpen(false);
              setIsCharacterOpen(false);
              setIsCraftingOpen(false);
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
              setIsCraftingOpen(false);
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
              setIsCraftingOpen(false);
              setIsArchiveOpen(true);
            }}
          >
            <RpgSpriteFrameView frame={RPG_ARCHIVE_FRAMES.closedBook} size={24} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open crafting"
            style={styles.iconHudBtn}
            onPress={() => {
              setIsShopOpen(false);
              setIsArchiveOpen(false);
              setIsBackpackOpen(false);
              setIsCharacterOpen(false);
              setIsCraftingOpen(true);
            }}
          >
            <Feather name="tool" size={18} color="#fff2bb" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open explore"
            style={styles.iconHudBtn}
            onPress={() => {
              setIsShopOpen(false);
              setIsArchiveOpen(false);
              setIsBackpackOpen(false);
              setIsCharacterOpen(false);
              setIsCraftingOpen(false);
              setIsExploreOpen(true);
            }}
          >
            <Feather name="map" size={18} color="#fff2bb" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open shop"
            style={styles.shopBtn}
            onPress={() => {
              setIsBackpackOpen(false);
              setIsArchiveOpen(false);
              setIsCharacterOpen(false);
              setIsCraftingOpen(false);
              setIsShopOpen(true);
            }}
          >
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text style={styles.shopText}>Shop</Text>
          </Pressable>
        </View>
      )}

      {activeZone === 'sanctuary' && !buildItem && (
        <View style={[styles.hotbar, { bottom: 170 + safeAreaInsets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unequip tool (back to Interact)"
            style={[styles.hotbarSlot, !equippedToolItemId && styles.hotbarSlotActive]}
            onPress={() => handleEquipTool(null)}
          >
            <Feather name="mouse-pointer" size={20} color={equippedToolItemId ? 'rgba(255,255,255,0.55)' : '#fff'} />
          </Pressable>
          {EQUIPPABLE_TOOL_ITEM_IDS.map(itemId => {
            const item = getRpgItem(itemId);
            const isEquipped = equippedToolItemId === itemId;
            return (
              <Pressable
                key={itemId}
                accessibilityRole="button"
                accessibilityLabel={isEquipped ? `Unequip ${item?.name ?? itemId}` : `Equip ${item?.name ?? itemId}`}
                style={[styles.hotbarSlot, isEquipped && styles.hotbarSlotActive]}
                onPress={() => handleEquipTool(isEquipped ? null : itemId)}
              >
                <Feather
                  name={(item?.featherIcon as keyof typeof Feather.glyphMap) ?? 'circle'}
                  size={20}
                  color={isEquipped ? '#fff' : 'rgba(255,255,255,0.55)'}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {buildItem && (
        <View style={[styles.modePill, { top: 112 + safeAreaInsets.top, left: 20 + safeAreaInsets.left, right: 20 + safeAreaInsets.right }]}>
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
        <View style={[styles.editBar, { bottom: 104 + safeAreaInsets.bottom, right: 20 + safeAreaInsets.right }]}>
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

      <Joystick
        onMove={handleJoystickMove}
        onRelease={handleJoystickRelease}
        bottomInset={safeAreaInsets.bottom}
        leftInset={safeAreaInsets.left}
      />

      {worldToast && (
        <View style={[styles.worldToast, { top: 158 + safeAreaInsets.top }, worldToast.tone === 'success' && styles.worldToastSuccess]}>
          {worldToast.item ? (
            <RpgItemIcon item={worldToast.item} size={22} />
          ) : (
            <Feather name={worldToast.tone === 'warn' ? 'alert-circle' : 'info'} size={16} color="#fff" />
          )}
          <Text style={styles.worldToastText}>{worldToast.text}</Text>
        </View>
      )}

      {!buildItem && interactionPrompt && (
        <View style={[styles.interactionPrompt, { bottom: 150 + safeAreaInsets.bottom, right: 24 + safeAreaInsets.right }]}>
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

      {isCraftingOpen && !buildItem && (
        <View style={[styles.craftingPanel, { top: 128 + safeAreaInsets.top, right: 20 + safeAreaInsets.right }]}>
          <View style={styles.craftingHeader}>
            <View>
              <Text style={styles.craftingTitle}>Craft</Text>
              <Text style={styles.craftingSubtitle}>Turn gathered resources into placeable items</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close crafting"
              style={styles.characterCloseButton}
              onPress={() => setIsCraftingOpen(false)}
            >
              <Feather name="x" size={15} color="#fff" />
            </Pressable>
          </View>
          {(() => {
            const allRecipes = getAllCraftingRecipes();
            const pageIndex = Math.min(craftingPage, Math.max(0, allRecipes.length - 1));
            const recipe = allRecipes[pageIndex];
            if (!recipe) return <Text style={styles.recipeOutputText}>No recipes yet</Text>;
            const outputItem = getRpgItem(recipe.outputItemId);
            const canCraft = recipe.ingredients.every(ingredient => getInventoryQuantity(ingredient.itemId) >= ingredient.quantity);
            const hasStation = !recipe.requiredBuilding || !!findStationObjectId(recipe.requiredBuilding);
            const activeJob = getActiveCraftingJobs().find(job => job.recipe_id === recipe.recipeId);
            const isReady = activeJob ? activeJob.completes_at <= sqlNow() : false;
            return (
              <>
                <View style={styles.craftingPageControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous recipe"
                    disabled={pageIndex === 0}
                    onPress={() => setCraftingPage(p => Math.max(0, p - 1))}
                    style={[styles.pageButton, pageIndex === 0 && styles.pageDisabled]}
                  >
                    <Feather name="chevron-left" size={18} color="#f7e6a5" />
                  </Pressable>
                  <Text style={styles.craftingPageText}>{pageIndex + 1}/{allRecipes.length}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next recipe"
                    disabled={pageIndex >= allRecipes.length - 1}
                    onPress={() => setCraftingPage(p => Math.min(allRecipes.length - 1, p + 1))}
                    style={[styles.pageButton, pageIndex >= allRecipes.length - 1 && styles.pageDisabled]}
                  >
                    <Feather name="chevron-right" size={18} color="#f7e6a5" />
                  </Pressable>
                </View>
                <View style={styles.recipeList}>
                <View key={recipe.recipeId} style={styles.recipeCard}>
                  <View style={styles.recipeOutput}>
                    <RpgItemIcon item={outputItem} size={34} fallbackLabel={recipe.outputItemId} />
                    <View style={styles.recipeTitleStack}>
                      <Text numberOfLines={1} style={styles.recipeName}>{outputItem?.name ?? recipe.outputItemId}</Text>
                      <Text numberOfLines={1} style={styles.recipeOutputText}>
                        {recipe.requiredBuilding ? `Needs ${recipe.requiredBuilding} · ${recipe.timeMinutes}m` : `${recipe.timeMinutes}m`}
                      </Text>
                    </View>
                  </View>
                  {!activeJob && (
                    <View style={styles.recipeIngredients}>
                      {recipe.ingredients.map(ingredient => {
                        const ingredientItem = getRpgItem(ingredient.itemId);
                        const owned = getInventoryQuantity(ingredient.itemId);
                        const enough = owned >= ingredient.quantity;
                        return (
                          <View key={`${recipe.recipeId}-${ingredient.itemId}`} style={[styles.ingredientPill, !enough && styles.ingredientPillMissing]}>
                            <RpgItemIcon item={ingredientItem} size={16} fallbackLabel={ingredient.itemId} />
                            <Text numberOfLines={1} style={[styles.ingredientText, !enough && styles.ingredientTextMissing]}>
                              {ingredientItem?.name ?? ingredient.itemId} {owned}/{ingredient.quantity}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {activeJob ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isReady ? `Claim ${outputItem?.name ?? recipe.outputItemId}` : 'Crafting in progress'}
                      disabled={!isReady}
                      style={[styles.craftButton, !isReady && styles.craftButtonDisabled]}
                      onPress={() => claimCraftingJob(activeJob.id, recipe.recipeId)}
                    >
                      <Feather name={isReady ? 'check' : 'clock'} size={14} color="#fff" />
                      <Text style={styles.craftButtonText}>{isReady ? 'Claim' : 'In progress'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Start crafting ${outputItem?.name ?? recipe.outputItemId}`}
                      disabled={!canCraft || !hasStation}
                      style={[styles.craftButton, (!canCraft || !hasStation) && styles.craftButtonDisabled]}
                      onPress={() => startCraftingJob(recipe.recipeId)}
                    >
                      <Feather name="tool" size={14} color="#fff" />
                      <Text style={styles.craftButtonText}>
                        {!hasStation ? `Need ${recipe.requiredBuilding}` : canCraft ? 'Start' : 'Need mats'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                </View>
              </>
            );
          })()}
        </View>
      )}

      {isExploreOpen && !buildItem && (
        <View style={[styles.craftingPanel, { top: 128 + safeAreaInsets.top, right: 20 + safeAreaInsets.right }]}>
          <View style={styles.craftingHeader}>
            <View>
              <Text style={styles.craftingTitle}>Explore</Text>
              <Text style={styles.craftingSubtitle}>Travel costs energy. No shop/crafting out there — just chop trees.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close explore"
              style={styles.characterCloseButton}
              onPress={() => setIsExploreOpen(false)}
            >
              <Feather name="x" size={15} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.recipeList}>
            {(['forest', 'beach', 'mountain', 'desert'] as const).map(biomeId => {
              const zoneDef = getZoneDef('sanctuary');
              const cost = zoneDef?.connections[biomeId] ?? 0;
              const tree = getBiomeTree(biomeId);
              return (
                <View key={biomeId} style={styles.recipeCard}>
                  <View style={styles.recipeTitleStack}>
                    <Text numberOfLines={1} style={styles.recipeName}>{getZoneDef(biomeId)?.name ?? biomeId}</Text>
                    <Text numberOfLines={1} style={styles.recipeOutputText}>{tree ? `${tree.name} grows here` : ''} · {cost} energy</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Travel to ${biomeId}`}
                    style={styles.craftButton}
                    onPress={() => {
                      const result = travelToZone(biomeId);
                      if (result !== 'ok') {
                        showWorldToast({
                          text: result === 'no_energy' ? 'Not enough energy' : 'Could not travel there',
                          tone: 'warn',
                        });
                        return;
                      }
                      refreshPlayerHp();
                      setIsExploreOpen(false);
                      router.push(`/biome?type=${biomeId}`);
                    }}
                  >
                    <Feather name="map-pin" size={14} color="#fff" />
                    <Text style={styles.craftButtonText}>Go</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {isCharacterOpen && !buildItem && (
        <View style={[styles.characterPanel, { top: 128 + safeAreaInsets.top, right: 20 + safeAreaInsets.right }]}>
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
                <View style={[styles.characterEnergyFill, { width: `${Math.max(0, Math.min(100, (playerHp.energy / Math.max(1, playerHp.energy_max)) * 100))}%` }]} />
              </View>
              <Text style={styles.characterBarValue}>{playerHp.energy}/{playerHp.energy_max}</Text>
            </View>
          </View>
          <View style={styles.characterCalendarRow}>
            <Feather name={seasonInfo.icon} size={14} color={seasonInfo.color} />
            <Text style={styles.characterCalendarText}>
              {seasonInfo.label} · Day {calendar.current_day} · Year {calendar.current_year}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sleep until the next day"
              style={styles.characterSleepButton}
              onPress={handleSleep}
            >
              <Feather name="moon" size={13} color="#fff" />
              <Text style={styles.characterSleepButtonText}>Sleep</Text>
            </Pressable>
          </View>
          <View style={styles.characterSlots}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unequip current tool"
              style={[styles.characterToolSlot, !equippedToolItemId && styles.characterToolSlotActive]}
              onPress={() => handleEquipTool(null)}
            >
              <Feather name="mouse-pointer" size={17} color="#fff" />
              <Text numberOfLines={1} style={styles.characterToolLabel}>Hands</Text>
            </Pressable>
            {EQUIPPABLE_TOOL_ITEM_IDS.map(itemId => {
              const item = getRpgItem(itemId);
              const isEquipped = equippedToolItemId === itemId;
              const energyCost = getToolDef(itemId)?.energyCost ?? 0;
              return (
                <Pressable
                  key={itemId}
                  accessibilityRole="button"
                  accessibilityLabel={isEquipped ? `Unequip ${item?.name ?? itemId}` : `Equip ${item?.name ?? itemId}`}
                  style={[styles.characterToolSlot, isEquipped && styles.characterToolSlotActive]}
                  onPress={() => handleEquipTool(isEquipped ? null : itemId)}
                >
                  <Feather name={(item?.featherIcon as keyof typeof Feather.glyphMap) ?? 'circle'} size={17} color="#fff" />
                  <Text numberOfLines={1} style={styles.characterToolLabel}>{item?.name ?? itemId}</Text>
                  <Text numberOfLines={1} style={styles.characterToolCost}>{energyCost} EN</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.characterSectionLabel}>Masteries</Text>
          <View style={styles.masteryGrid}>
            {(() => {
              const skillState = getSkillState();
              return ALL_SKILLS.map(skill => {
                const level = (skillState as any)[`${skill}_mastery`] as number;
                const points = (skillState as any)[`${skill}_points`] as number;
                const tier = getMasteryTier(level);
                const progressInLevel = points % POINTS_PER_MASTERY;
                return (
                  <View key={skill} style={styles.masteryChip}>
                    <Feather name={MASTERY_ICONS[skill]} size={14} color="#fff2bb" />
                    <View style={styles.masteryTextStack}>
                      <Text numberOfLines={1} style={styles.masteryLabel}>{MASTERY_LABELS[skill]}</Text>
                      <Text numberOfLines={1} style={styles.masteryTier}>Lv {level} · {tier}</Text>
                    </View>
                    <View style={styles.masteryBarTrack}>
                      <View style={[styles.masteryBarFill, { width: `${(progressInLevel / POINTS_PER_MASTERY) * 100}%` }]} />
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        </View>
      )}

      <View style={[styles.actionBtns, { bottom: 40 + safeAreaInsets.bottom, right: 20 + safeAreaInsets.right }]}>
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
            const buildingDef = getBuildingDef(itemId);
            const woodCost = buildingDef?.priceWood ?? 0;
            const stoneCost = buildingDef?.priceStone ?? 0;

            if (!state || state.coins < price) {
              const shortfall = Math.max(0, price - (state?.coins ?? 0));
              showWorldToast({ text: `Need ${shortfall} more coins`, item, tone: 'warn' });
              return { ok: false, message: `Need ${shortfall} more coins` };
            }
            if (woodCost > 0 && getInventoryQuantity(RPG_WOOD_ITEM_ID) < woodCost) {
              showWorldToast({ text: `Need ${woodCost} wood`, item, tone: 'warn' });
              return { ok: false, message: `Need ${woodCost} wood` };
            }
            if (stoneCost > 0 && getInventoryQuantity(RPG_STONE_ITEM_ID) < stoneCost) {
              showWorldToast({ text: `Need ${stoneCost} stone`, item, tone: 'warn' });
              return { ok: false, message: `Need ${stoneCost} stone` };
            }

            db.execSync('BEGIN TRANSACTION');
            db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', price);
            if (woodCost > 0) addSandboxInventoryItem(RPG_WOOD_ITEM_ID, -woodCost, 'inventory');
            if (stoneCost > 0) addSandboxInventoryItem(RPG_STONE_ITEM_ID, -stoneCost, 'inventory');
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
        onUseOnNearestPlot={handleUseOnNearestPlot}
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
    width: DEFAULT_TILE_SIZE,
    height: DEFAULT_TILE_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(9,20,12,0.18)',
  },
  zoneOverlay: {
    position: 'absolute',
  },
  zoneDebugLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneDebugLabelText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    textShadowColor: '#000',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },
  placementCell: {
    position: 'absolute',
    width: DEFAULT_TILE_SIZE,
    height: DEFAULT_TILE_SIZE,
    borderWidth: 3,
    zIndex: 2000,
  },
  interactionTargetCell: {
    position: 'absolute',
    width: DEFAULT_TILE_SIZE,
    height: DEFAULT_TILE_SIZE,
    borderWidth: 2,
    borderColor: '#fff2bb',
    backgroundColor: 'rgba(255,242,187,0.14)',
    zIndex: 1990,
  },
  gardenPlot: {
    position: 'absolute',
    width: DEFAULT_TILE_SIZE,
    height: DEFAULT_TILE_SIZE,
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    rowGap: 8,
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
    marginLeft: 'auto',
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
  weatherPill: {
    minWidth: 132,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.54)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherTextStack: {
    marginLeft: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  weatherText: {
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  weatherHint: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  hudActions: {
    position: 'absolute',
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  constructionBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 55,
  },
  constructionBadgeText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  hotbar: {
    position: 'absolute',
    bottom: 170,
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
  worldCellReaction: {
    position: 'absolute',
    zIndex: 108,
    width: 72,
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(22,18,14,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldCellReactionSuccess: {
    borderColor: 'rgba(53,255,112,0.58)',
    backgroundColor: 'rgba(15,42,24,0.78)',
  },
  worldCellReactionWarn: {
    borderColor: 'rgba(255,114,114,0.58)',
    backgroundColor: 'rgba(58,25,24,0.78)',
  },
  worldCellReactionText: {
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 4,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
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
  characterCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  characterCalendarText: {
    flex: 1,
    color: '#cbd5e1',
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  characterSleepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#4b3a8f',
  },
  characterSleepButtonText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  characterSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  characterSectionLabel: {
    marginTop: 10,
    marginBottom: 4,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  masteryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  masteryChip: {
    width: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  masteryTextStack: {
    flex: 1,
    minWidth: 0,
  },
  masteryLabel: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  masteryTier: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.ui.regular,
    fontSize: 9,
  },
  masteryBarTrack: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: 5,
    backgroundColor: '#9ee6a8',
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
  craftingPanel: {
    position: 'absolute',
    top: 128,
    right: 20,
    width: 292,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(20,18,16,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,242,187,0.32)',
    zIndex: 115,
  },
  craftingHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  craftingTitle: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  craftingSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.66)',
    fontFamily: fonts.ui.regular,
    fontSize: 10,
  },
  recipeList: {
    gap: 8,
  },
  craftingPageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  craftingPageText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  pageButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pageDisabled: {
    opacity: 0.35,
  },
  recipeCard: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  recipeOutput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipeTitleStack: {
    flex: 1,
    minWidth: 0,
  },
  recipeName: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  recipeOutputText: {
    marginTop: 1,
    color: 'rgba(255,242,187,0.66)',
    fontFamily: fonts.ui.regular,
    fontSize: 10,
  },
  recipeIngredients: {
    marginTop: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientPill: {
    minWidth: 54,
    height: 24,
    borderRadius: 7,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(53,255,112,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(126,217,87,0.38)',
  },
  ingredientPillMissing: {
    backgroundColor: 'rgba(255,59,48,0.13)',
    borderColor: 'rgba(255,96,86,0.34)',
  },
  ingredientText: {
    color: '#d9ffd2',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  ingredientTextMissing: {
    color: '#ffb8b0',
  },
  craftButton: {
    marginTop: 8,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#2d6a4f',
    borderWidth: 1,
    borderColor: 'rgba(183,255,176,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  craftButtonDisabled: {
    opacity: 0.42,
  },
  craftButtonText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
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
