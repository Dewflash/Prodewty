import { db } from './schema';
import { getPlaceableItem } from '../engine/RpgObjectCatalog';

export type GridPosition = {
  row: number;
  col: number;
};

export type BoundingBox = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

// Check if two bounding boxes intersect
export function boxesIntersect(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(b2.startCol > b1.endCol || 
           b2.endCol < b1.startCol || 
           b2.startRow > b1.endRow ||
           b2.endRow < b1.startRow);
}

// Get the bounding box of an object given its top-left coordinate and footprint
export function getBoundingBox(row: number, col: number, width: number, height: number): BoundingBox {
  return {
    startRow: row,
    startCol: col,
    endRow: row + height - 1,
    endCol: col + width - 1
  };
}

// Check if a new object can be placed at the given coordinates
export function canPlaceObject(type: string, targetRow: number, targetCol: number, ignoreObjectId?: number): boolean {
  const def = getPlaceableItem(type);
  if (!def) return false;

  const width = def.colWidth || 1;
  const height = def.colHeight || 1;

  const targetBox = getBoundingBox(targetRow, targetCol, width, height);

  // Get all existing objects to check for collision
  const existingObjects = db.getAllSync<{ id: number; type: string; row: number; col: number }>(
    'SELECT id, type, row, col FROM sanctuary_objects'
  );

  for (const obj of existingObjects) {
    if (obj.id === ignoreObjectId) continue;

    const objDef = getPlaceableItem(obj.type);
    if (!objDef) continue; // Should not happen, but fail safe
    
    // Ignore objects that don't have a collision footprint
    if ((objDef.colWidth || 0) === 0 || (objDef.colHeight || 0) === 0) continue;

    const objBox = getBoundingBox(obj.row, obj.col, objDef.colWidth || 1, objDef.colHeight || 1);

    if (boxesIntersect(targetBox, objBox)) {
      return false; // Collision detected
    }
  }

  // Also check water tiles or boundary conditions here in the future
  return true;
}

// Move an existing object to a new location if space is available
export function moveObject(objectId: number, newRow: number, newCol: number): boolean {
  const obj = db.getFirstSync<{ type: string }>('SELECT type FROM sanctuary_objects WHERE id = ?', objectId);
  if (!obj) return false;

  if (!canPlaceObject(obj.type, newRow, newCol, objectId)) {
    return false;
  }

  try {
    const result = db.runSync('UPDATE sanctuary_objects SET row = ?, col = ? WHERE id = ?', newRow, newCol, objectId);
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to move object', e);
    return false;
  }
}
