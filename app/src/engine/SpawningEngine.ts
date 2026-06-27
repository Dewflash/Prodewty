import { spawnResourceNode, RESOURCE_CATALOG } from '../db/resources';
import { db } from '../db/schema';

const GRID_ROWS = 20;
const GRID_COLS = 20;

export function spawnOvernightResources(): void {
  // Spawn 1-3 trees
  const numTrees = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < numTrees; i++) {
    const type = Math.random() > 0.5 ? 'Oak_Tree' : 'Pine_Tree';
    trySpawn(type);
  }

  // Spawn 2-5 rocks
  const numRocks = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < numRocks; i++) {
    trySpawn('Boulder');
  }
  
  // Spawn 3-8 weeds
  const numWeeds = Math.floor(Math.random() * 6) + 3;
  for (let i = 0; i < numWeeds; i++) {
    trySpawn('Weed');
  }
}

function trySpawn(type: string): void {
  // Try up to 10 times to find a valid spot
  for (let attempts = 0; attempts < 10; attempts++) {
    const r = Math.floor(Math.random() * GRID_ROWS);
    const c = Math.floor(Math.random() * GRID_COLS);
    
    if (spawnResourceNode(type, r, c)) {
      break; // Successfully spawned
    }
  }
}
