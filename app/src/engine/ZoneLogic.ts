// Pure, dependency-free zoning logic for the Sanctuary (Phase 1/2).
//
// Extracted out of rpg.tsx so the enclosure-detection and zone-gate
// decisions can be unit-tested in isolation (see ZoneLogic.test.ts) —
// rpg.tsx and farming.ts call THESE functions, so the tested code is the
// shipped code, not a copy. Nothing here imports React, SQLite, or any
// map/asset module; it operates only on plain cell-key strings ("row:col")
// and caller-supplied predicates.

export type CellKey = string; // "row:col"

export type ZoneType = 'pond' | 'garden' | 'building_plot';
export type ZoneState = 'active' | 'breached';

export type ZoneRecordLike = {
  id: number;
  type: ZoneType;
  state: ZoneState;
  interiorCells: CellKey[];
  perimeterCells: CellKey[];
};

export type EnclosureCandidate = {
  interiorCells: CellKey[];
  perimeterCells: CellKey[];
};

const DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export const cellKey = (row: number, col: number): CellKey => `${row}:${col}`;
export const parseCell = (key: CellKey): [number, number] => {
  const [r, c] = key.split(':').map(Number);
  return [r, c];
};

/**
 * Flood-FROM-THE-OUTSIDE enclosure detection.
 *
 * Correct by construction: flood the exterior (open play area, seeded from
 * the ring just inside the map's outer wall) first; any open cell the
 * exterior cannot reach is enclosed. This is what makes "the whole map
 * becomes a zone" and the phantom-sliver bug structurally impossible — see
 * the two failed approaches documented in project_rpg_phase1_zoning.md.
 *
 * @param perimeterCoords  cells occupied by the player's perimeter pieces
 * @param isOpen           true if a cell is walkable AND not a perimeter
 *                         piece AND not already owned by a zone (the caller
 *                         bakes all of that in)
 * @param rows, cols       grid dimensions
 */
export function findEnclosedRegions(
  perimeterCoords: Set<CellKey>,
  isOpen: (row: number, col: number) => boolean,
  rows: number,
  cols: number,
): EnclosureCandidate[] {
  if (perimeterCoords.size === 0) return [];

  // Step 1 — flood the exterior from the open inner ring.
  const exterior = new Set<CellKey>();
  const stack: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const onInnerRing = r === 1 || c === 1 || r === rows - 2 || c === cols - 2;
      if (onInnerRing && isOpen(r, c)) stack.push([r, c]);
    }
  }
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = cellKey(r, c);
    if (exterior.has(key)) continue;
    exterior.add(key);
    for (const [dr, dc] of DELTAS) {
      if (isOpen(r + dr, c + dc) && !exterior.has(cellKey(r + dr, c + dc))) {
        stack.push([r + dr, c + dc]);
      }
    }
  }

  // Step 2 — every open cell not in the exterior is enclosed; group into
  // connected components, recording the perimeter pieces that border each.
  const visited = new Set<CellKey>();
  const results: EnclosureCandidate[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = cellKey(r, c);
      if (!isOpen(r, c) || exterior.has(key) || visited.has(key)) continue;

      const component: CellKey[] = [];
      const perimeterTouched = new Set<CellKey>();
      const compStack: [number, number][] = [[r, c]];
      while (compStack.length > 0) {
        const [cr, cc] = compStack.pop()!;
        const ck = cellKey(cr, cc);
        if (visited.has(ck)) continue;
        visited.add(ck);
        component.push(ck);
        for (const [dr, dc] of DELTAS) {
          const nKey = cellKey(cr + dr, cc + dc);
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
}

/**
 * The flat cell -> zoneId map used for O(1) tile lookups. ONLY active zones
 * are mapped, so a breached zone reads as "not in a zone" automatically.
 */
export function buildZoneCellMap(zones: ZoneRecordLike[]): Map<CellKey, number> {
  const map = new Map<CellKey, number>();
  for (const zone of zones) {
    if (zone.state !== 'active') continue;
    for (const key of zone.interiorCells) map.set(key, zone.id);
    for (const key of zone.perimeterCells) map.set(key, zone.id);
  }
  return map;
}

/** Expected zoneCellMap size — a mismatch means two active zones overlap. */
export function expectedZoneCellMapSize(zones: ZoneRecordLike[]): number {
  return zones
    .filter(z => z.state === 'active')
    .reduce((sum, z) => sum + z.interiorCells.length + z.perimeterCells.length, 0);
}

/** Phase 2 gate: can a Hoe till at this cell? Only inside an ACTIVE Garden. */
export function isTillableGardenCell(zones: ZoneRecordLike[], row: number, col: number): boolean {
  const key = cellKey(row, col);
  return zones.some(z => z.type === 'garden' && z.state === 'active' && z.interiorCells.includes(key));
}

/**
 * Cells belonging to an ACTIVE Garden — crops grow only inside these. A
 * breached Garden's cells are absent, so crops inside it freeze (used by
 * processOvernightFarming).
 */
export function activeGardenCellSet(zones: ZoneRecordLike[]): Set<CellKey> {
  const cells = new Set<CellKey>();
  for (const zone of zones) {
    if (zone.type !== 'garden' || zone.state !== 'active') continue;
    for (const key of zone.interiorCells) cells.add(key);
  }
  return cells;
}
