import { db } from './schema';

// Blueprint catalog — each entry is a future unlock target (station/tool).
// Per the RPG resource dynamics spec (2026-06-30): blueprints are global
// one-time-ever drops, not gated/enforced anywhere yet. This pass only
// builds the drop + collection mechanic; wiring blueprints to actually
// gate building/crafting is later work once the full set is known.
export const BLUEPRINT_CATALOG: Record<string, { name: string; description: string }> = {
  blueprint_fertiliser_mixer: {
    name: 'Fertiliser Mixer Blueprint',
    description: 'Plans for a Fertiliser Mixer station.',
  },
  blueprint_irrigation_bench: {
    name: 'Irrigation Bench Blueprint',
    description: 'Plans for an Irrigation Bench station.',
  },
  blueprint_vendor_stall: {
    name: 'Vendor Stall Blueprint',
    description: 'Plans for a Vendor Stall station.',
  },
};

export function getUndroppedBlueprintIds(): string[] {
  const dropped = new Set(
    db.getAllSync<{ blueprint_id: string }>('SELECT blueprint_id FROM rpg_blueprint_drops').map(r => r.blueprint_id),
  );
  return Object.keys(BLUEPRINT_CATALOG).filter(id => !dropped.has(id));
}

// Picks a random not-yet-dropped blueprint, marks it dropped forever, and
// grants it to the player. Returns null if the pool is exhausted — callers
// must treat that as "nothing to give," not an error.
export function tryDropBlueprint(): string | null {
  const available = getUndroppedBlueprintIds();
  if (available.length === 0) return null;

  const blueprintId = available[Math.floor(Math.random() * available.length)];
  try {
    db.execSync('BEGIN TRANSACTION');
    const result = db.runSync(
      'INSERT OR IGNORE INTO rpg_blueprint_drops (blueprint_id, dropped_at) VALUES (?, datetime(\'now\', \'localtime\'))',
      blueprintId,
    );
    if (result.changes <= 0) {
      // Lost a race with another drop roll for the same id — treat as miss.
      db.execSync('ROLLBACK');
      return null;
    }
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      blueprintId,
    );
    db.execSync('COMMIT');
    return blueprintId;
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to drop blueprint', e);
    return null;
  }
}
