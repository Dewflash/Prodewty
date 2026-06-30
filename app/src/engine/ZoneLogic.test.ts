// Executable proof for the Phase 1/2 zoning logic. Run with:
//   npx tsx src/engine/ZoneLogic.test.ts
// Pure logic, no RN/SQLite — covers the exact bugs hit on-device
// (whole-map takeover, phantom slivers) plus the Phase 2 gate + freeze.

import {
  findEnclosedRegions,
  buildZoneCellMap,
  expectedZoneCellMapSize,
  isTillableGardenCell,
  isPerimeterFullyWalled,
  activeGardenCellSet,
  cellKey,
  type ZoneRecordLike,
} from './ZoneLogic';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

// A 12x12 grid whose border (row/col 0 and 11) is wall, interior is open
// grass — mirrors SanctuaryMap's structure. isOpen excludes the border
// wall, perimeter pieces, and already-zoned cells (as rpg.tsx does).
const ROWS = 12, COLS = 12;
function makeIsOpen(perimeter: Set<string>, alreadyZoned: Set<string> = new Set()) {
  return (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return false;
    if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) return false; // outer wall
    const key = cellKey(r, c);
    if (perimeter.has(key) || alreadyZoned.has(key)) return false;
    return true;
  };
}

// Build a hollow square ring of perimeter pieces from (top,left) to
// (bottom,right) inclusive; returns the perimeter set.
function ring(top: number, left: number, bottom: number, right: number, omit?: [number, number]): Set<string> {
  const s = new Set<string>();
  for (let c = left; c <= right; c++) { s.add(cellKey(top, c)); s.add(cellKey(bottom, c)); }
  for (let r = top; r <= bottom; r++) { s.add(cellKey(r, left)); s.add(cellKey(r, right)); }
  if (omit) s.delete(cellKey(omit[0], omit[1]));
  return s;
}

console.log('findEnclosedRegions — closed ring detected:');
{
  const perim = ring(3, 3, 7, 7); // interior is rows 4-6, cols 4-6 = 9 cells
  const regions = findEnclosedRegions(perim, makeIsOpen(perim), ROWS, COLS);
  check('exactly one enclosed region', regions.length === 1);
  check('interior is 9 cells (3x3)', regions[0]?.interiorCells.length === 9);
  check('interior does not leak outside the ring', regions[0].interiorCells.every(k => {
    const [r, c] = k.split(':').map(Number); return r >= 4 && r <= 6 && c >= 4 && c <= 6;
  }));
}

console.log('findEnclosedRegions — OPEN ring (breach gap) detects NOTHING:');
{
  // This is the exact on-device bug: a ring with a gap must NOT enclose,
  // and must NOT flag the whole map as one giant zone.
  const perim = ring(3, 3, 7, 7, [3, 5]); // gap in the top edge
  const regions = findEnclosedRegions(perim, makeIsOpen(perim), ROWS, COLS);
  check('no enclosed region when ring is open', regions.length === 0);
}

console.log('findEnclosedRegions — no phantom slivers next to a wall:');
{
  // A straight line of perimeter pieces (not a ring) must enclose nothing.
  const perim = new Set<string>();
  for (let c = 2; c <= 9; c++) perim.add(cellKey(5, c)); // a 1x8 wall
  const regions = findEnclosedRegions(perim, makeIsOpen(perim), ROWS, COLS);
  check('a lone wall line encloses nothing (no 1xN phantom)', regions.length === 0);
}

console.log('findEnclosedRegions — two separate rings = two regions:');
{
  const a = ring(2, 2, 4, 4);
  const b = ring(7, 7, 9, 9);
  const perim = new Set([...a, ...b]);
  const regions = findEnclosedRegions(perim, makeIsOpen(perim), ROWS, COLS);
  check('two independent enclosed regions', regions.length === 2);
  check('each region is 1 cell (3x3 ring → 1 interior)', regions.every(r => r.interiorCells.length === 1));
}

console.log('zoneCellMap — only active zones, overlap assertion:');
{
  const zones: ZoneRecordLike[] = [
    { id: 1, type: 'garden', state: 'active', interiorCells: ['4:4', '4:5'], perimeterCells: ['3:4'] },
    { id: 2, type: 'pond', state: 'breached', interiorCells: ['8:8'], perimeterCells: ['7:8'] },
  ];
  const map = buildZoneCellMap(zones);
  check('active garden cells mapped', map.get('4:4') === 1 && map.get('3:4') === 1);
  check('breached zone cells NOT mapped', !map.has('8:8') && !map.has('7:8'));
  check('map size matches expected (no overlap)', map.size === expectedZoneCellMapSize(zones));
}

console.log('Phase 2 gate — Hoe tillable only inside active Garden:');
{
  const zones: ZoneRecordLike[] = [
    { id: 1, type: 'garden', state: 'active', interiorCells: ['4:4'], perimeterCells: ['3:4'] },
    { id: 2, type: 'garden', state: 'breached', interiorCells: ['8:8'], perimeterCells: ['7:8'] },
    { id: 3, type: 'pond', state: 'active', interiorCells: ['6:6'], perimeterCells: ['5:6'] },
  ];
  check('tillable inside active garden', isTillableGardenCell(zones, 4, 4) === true);
  check('NOT tillable inside breached garden', isTillableGardenCell(zones, 8, 8) === false);
  check('NOT tillable inside a pond', isTillableGardenCell(zones, 6, 6) === false);
  check('NOT tillable outside any zone', isTillableGardenCell(zones, 1, 1) === false);
  check('NOT tillable on a garden perimeter (wall) cell', isTillableGardenCell(zones, 3, 4) === false);
}

console.log('Repair — breached zone re-seals only when every perimeter cell is filled:');
{
  const zone: ZoneRecordLike = {
    id: 1, type: 'garden', state: 'breached',
    interiorCells: ['4:4'], perimeterCells: ['3:3', '3:4', '3:5', '4:3', '4:5', '5:3', '5:4', '5:5'],
  };
  const missingOne = new Set(zone.perimeterCells.filter(c => c !== '3:4')); // gap still open
  check('still breached while a perimeter cell is missing', isPerimeterFullyWalled(zone, missingOne) === false);
  const allFilled = new Set(zone.perimeterCells); // wall replaced
  check('restorable once every perimeter cell is filled again', isPerimeterFullyWalled(zone, allFilled) === true);
  const extraElsewhere = new Set([...missingOne, '9:9']); // a piece placed somewhere irrelevant
  check('a piece placed on the WRONG cell does not restore it', isPerimeterFullyWalled(zone, extraElsewhere) === false);
}

console.log('Phase 2 freeze — active-garden cell set drives overnight growth:');
{
  const zones: ZoneRecordLike[] = [
    { id: 1, type: 'garden', state: 'active', interiorCells: ['4:4', '4:5'], perimeterCells: ['3:4'] },
    { id: 2, type: 'garden', state: 'breached', interiorCells: ['8:8'], perimeterCells: ['7:8'] },
  ];
  const set = activeGardenCellSet(zones);
  check('active garden crop grows (in set)', set.has('4:4'));
  check('breached garden crop freezes (not in set)', !set.has('8:8'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
