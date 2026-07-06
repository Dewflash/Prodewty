import { db } from './schema';
import { sqlNow } from '../utils/date';
import { grantSkillPoints } from './skills';
import { getComputedStats } from './game';
import { getRpgItem, type RpgItemRarity } from '../engine/RpgObjectCatalog';
import { BLUEPRINT_CATALOG } from './blueprints';
import {
  applyResearchTimerReduction,
  researchBaseMinutes,
} from '../engine/StatEffects';

// ─── Library research (Inspect) + blueprint decode (RPG_PROGRESSION_LATTICE D7) ─
// Research jobs mirror crafting_queue: start a timed job, claim when done. On
// claim the item is marked Understood (rpg_understanding) and grants Research
// mastery — the item is NOT consumed. Blueprint decode reuses the same timed
// queue shape but, on claim, consumes the blueprint and unlocks its station.

// One research job at a time at Library lvl 1; two parallel at lvl 2+.
export const RESEARCH_SLOTS_BASE = 1;
export const RESEARCH_SLOTS_PER_LEVEL2 = 2;

// Research mastery granted when an Inspect job is claimed (lattice D7).
export const RESEARCH_POINTS_PER_INSPECT = 10;

// Blueprint decode base time (a fixed job — blueprints have no rarity tier).
export const DECODE_BASE_MINUTES = 45;

export type ResearchJob = {
  id: number;
  item_id: string;
  started_at: string;
  completes_at: string;
  is_claimed: boolean;
};

// Item rarity → research tier (1-based). common → 1, uncommon → 2, rare/epic → 3
// (tier caps at 3, matching the 30/60/120-minute base ladder in StatEffects).
const RARITY_RESEARCH_TIER: Record<RpgItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 3,
};

export function researchTierForItem(itemId: string): number {
  const rarity = getRpgItem(itemId)?.rarity;
  return rarity ? RARITY_RESEARCH_TIER[rarity] : 1;
}

// How many research slots the player has, given their Library's level.
export function researchSlotsForLibraryLevel(libraryLevel: number): number {
  return libraryLevel >= 2 ? RESEARCH_SLOTS_PER_LEVEL2 : RESEARCH_SLOTS_BASE;
}

export function getActiveResearchJobs(): ResearchJob[] {
  try {
    const rows = db.getAllSync<{
      id: number;
      item_id: string;
      started_at: string;
      completes_at: string;
      is_claimed: number;
    }>('SELECT * FROM rpg_research_queue WHERE is_claimed = 0');
    return rows.map(r => ({ ...r, is_claimed: r.is_claimed === 1 }));
  } catch (e) {
    console.warn('Failed to fetch research jobs', e);
    return [];
  }
}

export function getResearchJobForItem(itemId: string): ResearchJob | null {
  const job = db.getFirstSync<{
    id: number;
    item_id: string;
    started_at: string;
    completes_at: string;
    is_claimed: number;
  }>('SELECT * FROM rpg_research_queue WHERE item_id = ? AND is_claimed = 0 LIMIT 1', itemId);
  if (!job) return null;
  return { ...job, is_claimed: job.is_claimed === 1 };
}

export function isUnderstood(itemId: string): boolean {
  try {
    return !!db.getFirstSync<{ item_id: string }>(
      'SELECT item_id FROM rpg_understanding WHERE item_id = ? LIMIT 1', itemId,
    );
  } catch {
    return false;
  }
}

export function getUnderstoodItemIds(): Set<string> {
  try {
    return new Set(
      db.getAllSync<{ item_id: string }>('SELECT item_id FROM rpg_understanding').map(r => r.item_id),
    );
  } catch {
    return new Set();
  }
}

export type StartResearchResult =
  | 'ok'
  | 'already_understood'
  | 'already_researching'
  | 'no_slots'
  | 'db_error';

// Starts a timed Inspect job for a Discovered item. `librarySlots` is the
// player's current research capacity (researchSlotsForLibraryLevel). Duration
// = tier base minutes, reduced by FOC (craft/research) and WIS (research).
export function startResearch(itemId: string, librarySlots: number): StartResearchResult {
  if (isUnderstood(itemId)) return 'already_understood';
  if (getResearchJobForItem(itemId)) return 'already_researching';

  const active = getActiveResearchJobs();
  if (active.length >= librarySlots) return 'no_slots';

  try {
    const now = new Date();
    const stats = getComputedStats();
    const baseMinutes = researchBaseMinutes(researchTierForItem(itemId));
    const minutes = applyResearchTimerReduction(baseMinutes, stats.foc, stats.wis);
    const completesAt = new Date(now.getTime() + minutes * 60 * 1000);
    db.runSync(
      `INSERT INTO rpg_research_queue (item_id, started_at, completes_at, is_claimed)
       VALUES (?, ?, ?, 0)`,
      itemId, sqlNow(now), sqlNow(completesAt),
    );
    return 'ok';
  } catch (e) {
    console.warn('Failed to start research', e);
    return 'db_error';
  }
}

export type ClaimResearchResult = 'ok' | 'not_ready' | 'no_job' | 'db_error';

// Claims a finished Inspect job: marks the item Understood, grants Research
// mastery. The item is never consumed.
export function claimResearch(jobId: number): ClaimResearchResult {
  try {
    db.execSync('BEGIN TRANSACTION');
    const job = db.getFirstSync<{ id: number; item_id: string; completes_at: string }>(
      'SELECT id, item_id, completes_at FROM rpg_research_queue WHERE id = ? AND is_claimed = 0',
      jobId,
    );
    if (!job) {
      db.execSync('ROLLBACK');
      return 'no_job';
    }
    if (job.completes_at > sqlNow()) {
      db.execSync('ROLLBACK');
      return 'not_ready';
    }
    db.runSync(
      `INSERT INTO rpg_understanding (item_id, understood_at) VALUES (?, ?)
       ON CONFLICT(item_id) DO NOTHING`,
      job.item_id, sqlNow(),
    );
    db.runSync('UPDATE rpg_research_queue SET is_claimed = 1 WHERE id = ?', jobId);
    db.execSync('COMMIT');
    // Mastery accrual (lattice D3/D7): claiming an Inspect feeds Research.
    grantSkillPoints('research', RESEARCH_POINTS_PER_INSPECT);
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim research', e);
    return 'db_error';
  }
}

// ─── Blueprint decode ───────────────────────────────────────────────────────

export function isBlueprintDecoded(blueprintId: string): boolean {
  try {
    return !!db.getFirstSync<{ blueprint_id: string }>(
      'SELECT blueprint_id FROM rpg_blueprint_drops WHERE blueprint_id = ? AND unlocked = 1 LIMIT 1',
      blueprintId,
    );
  } catch {
    return false;
  }
}

export function getDecodedBlueprintIds(): Set<string> {
  try {
    return new Set(
      db.getAllSync<{ blueprint_id: string }>(
        'SELECT blueprint_id FROM rpg_blueprint_drops WHERE unlocked = 1',
      ).map(r => r.blueprint_id),
    );
  } catch {
    return new Set();
  }
}

// Station type → the blueprint that gates it (mirror of the migration table).
export const STATION_BLUEPRINT: Record<string, string> = {
  rpg_fertiliser_mixer: 'blueprint_fertiliser_mixer',
  rpg_irrigation_bench: 'blueprint_irrigation_bench',
  rpg_vendor_stall: 'blueprint_vendor_stall',
};

// A blueprint-gated station is buildable only once its blueprint is decoded.
// Non-gated shop items (everything not in STATION_BLUEPRINT) are always allowed.
export function isStationBuildable(stationType: string): boolean {
  const blueprintId = STATION_BLUEPRINT[stationType];
  if (!blueprintId) return true;
  return isBlueprintDecoded(blueprintId);
}

export type DecodeBlueprintResult =
  | 'ok'
  | 'not_a_blueprint'
  | 'not_owned'
  | 'already_decoded'
  | 'db_error';

// Decodes a blueprint the player holds in the Backpack: consumes one copy and
// marks it unlocked so its station appears in the Shop. Instant on purpose —
// the "timed job" surface for decode is the Inspect flow above; decode itself
// is a direct Backpack action near the Library (lattice D7 offers either; the
// Backpack action is the cleaner existing surface).
export function decodeBlueprint(blueprintId: string): DecodeBlueprintResult {
  if (!BLUEPRINT_CATALOG[blueprintId]) return 'not_a_blueprint';
  try {
    db.execSync('BEGIN TRANSACTION');
    if (isBlueprintDecoded(blueprintId)) {
      db.execSync('ROLLBACK');
      return 'already_decoded';
    }
    const owned = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity > 0 LIMIT 1',
      blueprintId,
    );
    if (!owned) {
      db.execSync('ROLLBACK');
      return 'not_owned';
    }
    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?', blueprintId);
    // The drop row already exists (blueprints upsert on drop), but decode may
    // also run on a pre-seeded/edge row — upsert to be safe.
    db.runSync(
      `INSERT INTO rpg_blueprint_drops (blueprint_id, dropped_at, unlocked)
       VALUES (?, datetime('now','localtime'), 1)
       ON CONFLICT(blueprint_id) DO UPDATE SET unlocked = 1`,
      blueprintId,
    );
    db.execSync('COMMIT');
    // Research mastery for a successful decode (lattice: decode is Research work).
    grantSkillPoints('research', RESEARCH_POINTS_PER_INSPECT);
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to decode blueprint', e);
    return 'db_error';
  }
}
