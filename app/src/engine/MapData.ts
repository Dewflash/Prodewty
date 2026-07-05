export const TILE_SIZE = 32;

// Tile art is 16px pixel-art cropped from sprite sheets. To keep crops on
// integer pixel boundaries (React Native bilinear-filters fractional scales,
// which blurs pixel art), the on-screen tile size must be an integer multiple
// of the 16px source cell. We snap to 32 / 48 / 64 (i.e. 2x / 3x / 4x) and pick
// the largest that still fits `floor(viewportWidth / 12)`.
export function getResponsiveTileSize(viewportWidth: number): number {
  const target = Math.floor(viewportWidth / 12);
  const steps = [64, 48, 32];
  for (const step of steps) {
    if (target >= step) return step;
  }
  return TILE_SIZE;
}

export enum TileType {
  GRASS = 0,
  WALL = 1,
  WATER = 2,
  PORTAL_DUNGEON = 3,
  PORTAL_SANCTUARY = 4,
  BRIDGE = 5,
  PATH = 6,
  TILLED = 7,
  SAND = 8,
  // Rain-gated terrain (Sanctuary spec 2026-06-30): a DITCH (dug by the
  // Shovel) fills to WATER after rain; TILLED soil becomes WET_SOIL after
  // rain (a growth bonus — crops on it count as watered). Both are dry,
  // walkable intermediate states until rain transitions them.
  DITCH = 9,
  WET_SOIL = 10,
  // Craftable building floors (stone slab / wood tile) — vs natural grass.
  STONE_SLAB = 11,
  WOOD_TILE = 12,
}

// 0: Walkable, 1: Blocked
// WATER is walkable, not blocked — stepping into it sends you back to
// spawn (see the frame-callback water check in rpg.tsx) rather than just
// stopping you. Bridge tiles are the actual safe way across.
export const TILE_COLLISION: Record<TileType, boolean> = {
  [TileType.GRASS]: false,
  [TileType.WALL]: true,
  [TileType.WATER]: false,
  [TileType.PORTAL_DUNGEON]: false,
  [TileType.PORTAL_SANCTUARY]: false,
  [TileType.BRIDGE]: false,
  [TileType.PATH]: false,
  [TileType.TILLED]: false,
  [TileType.SAND]: false,
  // DITCH is walkable while dry; once rain fills it to WATER, the WATER
  // rule (walk-in → respawn) takes over. WET_SOIL/floors are walkable.
  [TileType.DITCH]: false,
  [TileType.WET_SOIL]: false,
  [TileType.STONE_SLAB]: false,
  [TileType.WOOD_TILE]: false,
};

// Friendly tile names for the tile-inspector HUD (Sanctuary spec).
export const TILE_DISPLAY_NAME: Record<TileType, string> = {
  [TileType.GRASS]: 'Grass',
  [TileType.WALL]: 'Wall',
  [TileType.WATER]: 'Water',
  [TileType.PORTAL_DUNGEON]: 'Dungeon Portal',
  [TileType.PORTAL_SANCTUARY]: 'Sanctuary Portal',
  [TileType.BRIDGE]: 'Bridge',
  [TileType.PATH]: 'Path',
  [TileType.TILLED]: 'Tilled Soil',
  [TileType.SAND]: 'Sand',
  [TileType.DITCH]: 'Ditch',
  [TileType.WET_SOIL]: 'Wet Soil',
  [TileType.STONE_SLAB]: 'Stone Slab',
  [TileType.WOOD_TILE]: 'Wood Tile',
};

export function getTileDisplayName(type: TileType): string {
  return TILE_DISPLAY_NAME[type] ?? 'Ground';
}

function makeMap(
  rows: number,
  cols: number,
  portal: { row: number; col: number; type: TileType },
  walls: { row: number; col: number }[] = [],
): TileType[][] {
  const map: TileType[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => (
      row === 0 || col === 0 || row === rows - 1 || col === cols - 1
        ? TileType.WALL
        : TileType.GRASS
    )),
  );

  walls.forEach(({ row, col }) => {
    if (map[row]?.[col] !== undefined) map[row][col] = TileType.WALL;
  });
  map[portal.row][portal.col] = portal.type;
  return map;
}

export const SanctuaryMap = makeMap(20, 20, {
  row: 18,
  col: 10,
  type: TileType.PORTAL_DUNGEON,
});

export const DungeonMap = makeMap(20, 20, {
  row: 1,
  col: 1,
  type: TileType.PORTAL_SANCTUARY,
}, [
  { row: 5, col: 5 },
  { row: 5, col: 6 },
  { row: 5, col: 7 },
  { row: 6, col: 5 },
  { row: 7, col: 5 },
  { row: 10, col: 12 },
  { row: 10, col: 13 },
  { row: 11, col: 12 },
  { row: 11, col: 13 },
  { row: 14, col: 8 },
  { row: 15, col: 8 },
  { row: 16, col: 8 },
]);

export function isBlocked(map: number[][], x: number, y: number, tileSize: number = TILE_SIZE): boolean {
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);

  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) {
    return true; // Out of bounds is blocked
  }

  const tileType = map[row][col] as TileType;
  return TILE_COLLISION[tileType] || false;
}
