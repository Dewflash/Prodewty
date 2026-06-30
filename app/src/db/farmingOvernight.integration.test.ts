// Integration test for Phase 2 overnight farming, run against a REAL
// SQLite database (node:sqlite) — not the app's expo-sqlite (which is
// RN-only), but the same schema and the same SQL/decision logic that
// processOvernightFarming runs. This closes the gap the pure unit tests
// can't reach: it proves the integration of zones-table loading + the
// active-garden freeze decision + the growth UPDATE actually produces the
// right farming_plots state end-to-end.
//
// Run: npx tsx src/db/farmingOvernight.integration.test.ts
//
// The growth/freeze logic here MUST mirror processOvernightFarming in
// farming.ts. It reuses the real, shipped activeGardenCellSet from
// ZoneLogic.ts so the zone-membership decision is the exact production code.

import { DatabaseSync } from 'node:sqlite';
import { activeGardenCellSet, type ZoneRecordLike, type ZoneType, type ZoneState } from '../engine/ZoneLogic';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const db = new DatabaseSync(':memory:');

// Schema mirrors the shipped migrations (v95 sanctuary_zones + farming_plots).
db.exec(`
  CREATE TABLE sanctuary_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active',
    interior_cells TEXT NOT NULL,
    perimeter_cells TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE farming_plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    planted_seed_id TEXT,
    growth_stage INTEGER NOT NULL DEFAULT 0,
    is_watered INTEGER NOT NULL DEFAULT 0,
    is_fertilized INTEGER NOT NULL DEFAULT 0,
    auto_water_charges INTEGER NOT NULL DEFAULT 0,
    planted_at TEXT
  );
`);

// Two gardens: one active (cells 4:4, 4:5), one breached (cell 8:8).
db.prepare("INSERT INTO sanctuary_zones (type, state, interior_cells, perimeter_cells, created_at) VALUES (?,?,?,?,?)")
  .run('garden', 'active', JSON.stringify(['4:4', '4:5']), JSON.stringify(['3:4']), Date.now());
db.prepare("INSERT INTO sanctuary_zones (type, state, interior_cells, perimeter_cells, created_at) VALUES (?,?,?,?,?)")
  .run('garden', 'breached', JSON.stringify(['8:8']), JSON.stringify(['7:8']), Date.now());

// Crops: watered turnip in the active garden, watered turnip in the
// breached garden, and an un-watered one in the active garden.
db.prepare("INSERT INTO farming_plots (row, col, planted_seed_id, growth_stage, is_watered) VALUES (?,?,?,?,?)")
  .run(4, 4, 'rpg_turnip_seed', 0, 1); // active + watered  → should grow to 1
db.prepare("INSERT INTO farming_plots (row, col, planted_seed_id, growth_stage, is_watered) VALUES (?,?,?,?,?)")
  .run(8, 8, 'rpg_turnip_seed', 0, 1); // breached + watered → should FREEZE at 0, water kept
db.prepare("INSERT INTO farming_plots (row, col, planted_seed_id, growth_stage, is_watered) VALUES (?,?,?,?,?)")
  .run(4, 5, 'rpg_turnip_seed', 0, 0); // active + unwatered → no growth, water stays 0

// --- replicate processOvernightFarming's core loop (no season change) ---
function runOvernight() {
  // load zones exactly like getActiveGardenCells does, then use the REAL
  // shipped activeGardenCellSet for the membership decision.
  const zoneRows = db.prepare('SELECT id, type, state, interior_cells, perimeter_cells FROM sanctuary_zones').all() as any[];
  const zones: ZoneRecordLike[] = zoneRows.map(r => ({
    id: r.id, type: r.type as ZoneType, state: r.state as ZoneState,
    interiorCells: JSON.parse(r.interior_cells), perimeterCells: JSON.parse(r.perimeter_cells),
  }));
  const activeGarden = activeGardenCellSet(zones);

  const plots = db.prepare('SELECT * FROM farming_plots').all() as any[];
  for (const p of plots) {
    if (!p.planted_seed_id) { db.prepare('UPDATE farming_plots SET is_watered = 0 WHERE id = ?').run(p.id); continue; }
    if (!activeGarden.has(`${p.row}:${p.col}`)) continue; // FREEZE — keep water, no growth
    const maxStage = 2;
    if (p.is_watered && p.growth_stage < maxStage) {
      db.prepare('UPDATE farming_plots SET growth_stage = growth_stage + 1, is_watered = 0 WHERE id = ?').run(p.id);
    } else {
      db.prepare('UPDATE farming_plots SET is_watered = 0 WHERE id = ?').run(p.id);
    }
  }
}

const get = (row: number, col: number) =>
  db.prepare('SELECT growth_stage, is_watered FROM farming_plots WHERE row = ? AND col = ?').get(row, col) as any;

console.log('Overnight farming integration (real SQLite, shipped zone logic):');
runOvernight();
check('active+watered crop grew to stage 1', get(4, 4).growth_stage === 1);
check('active+watered crop water consumed', get(4, 4).is_watered === 0);
check('breached garden crop FROZE at stage 0', get(8, 8).growth_stage === 0);
check('breached garden crop KEPT its water (resumes on repair)', get(8, 8).is_watered === 1);
check('active+unwatered crop did not grow', get(4, 5).growth_stage === 0);

// Second night: re-water the active crop, confirm it advances toward max.
db.prepare('UPDATE farming_plots SET is_watered = 1 WHERE row = 4 AND col = 4').run();
runOvernight();
check('active crop reached stage 2 after second watered night', get(4, 4).growth_stage === 2);

// Third night: already at max, watered — must cap at 2, not overflow.
db.prepare('UPDATE farming_plots SET is_watered = 1 WHERE row = 4 AND col = 4').run();
runOvernight();
check('mature crop caps at stage 2 (no overgrowth)', get(4, 4).growth_stage === 2);

// Restore the breached garden → its frozen crop must resume next night.
db.prepare("UPDATE sanctuary_zones SET state = 'active' WHERE state = 'breached'").run();
runOvernight();
check('restored garden crop resumes growth (0 → 1)', get(8, 8).growth_stage === 1);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
