export const TILE_SIZE = 64;

export enum TileType {
  GRASS = 0,
  WALL = 1,
  WATER = 2,
  PORTAL_DUNGEON = 3,
  PORTAL_SANCTUARY = 4,
}

// 0: Walkable, 1: Blocked
export const TILE_COLLISION: Record<TileType, boolean> = {
  [TileType.GRASS]: false,
  [TileType.WALL]: true,
  [TileType.WATER]: true,
  [TileType.PORTAL_DUNGEON]: false,
  [TileType.PORTAL_SANCTUARY]: false,
};

// 10x10 Sanctuary
export const SanctuaryMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 3, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 10x10 Dungeon
export const DungeonMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export function isBlocked(map: number[][], x: number, y: number): boolean {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) {
    return true; // Out of bounds is blocked
  }

  const tileType = map[row][col] as TileType;
  return TILE_COLLISION[tileType] || false;
}
