export const TILE_SIZE = 32;

export enum TileType {
  GRASS = 0,
  WALL = 1,
  WATER = 2,
  PORTAL_DUNGEON = 3,
  PORTAL_SANCTUARY = 4,
  BRIDGE = 5,
  PATH = 6,
  TILLED = 7,
}

// 0: Walkable, 1: Blocked
export const TILE_COLLISION: Record<TileType, boolean> = {
  [TileType.GRASS]: false,
  [TileType.WALL]: true,
  [TileType.WATER]: true,
  [TileType.PORTAL_DUNGEON]: false,
  [TileType.PORTAL_SANCTUARY]: false,
  [TileType.BRIDGE]: false,
  [TileType.PATH]: false,
  [TileType.TILLED]: false,
};

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

export function isBlocked(map: number[][], x: number, y: number): boolean {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) {
    return true; // Out of bounds is blocked
  }

  const tileType = map[row][col] as TileType;
  return TILE_COLLISION[tileType] || false;
}
