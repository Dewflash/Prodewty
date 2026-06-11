import { db } from './schema';
import { getRPGState, applyXP, DUNGEON_NATURAL_UNLOCK_LEVEL, materializeDungeonRight, getCoinMultiplier } from './rpg';
import { getHealthState } from './health';
import { sessionXP } from '../services/xpEngine';
import { sqlNow, pad, localDateStr } from '../utils/date';
import { triggerCurrencyRefresh } from './currencySignal';
import { triggerDeathCheck } from './deathCheckSignal';
import { getOrRefreshSnapshot, buildCandidates, drawDailyPool, fillTemplate, fillDungeonTemplate, recommendedDurationMinutes, weightedSample } from './questEngine';
import type { Rarity } from '../constants/rarity';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Dungeon = {
  id: number;
  name: string;
  rank: string;
  flavor_text: string | null;
  primary_stat: string;
  secondary_stat: string | null;
  difficulty: number;
  coin_reward: number;
  item_drop_chance: number;
  item_name: string | null;
  item_description: string | null;
  cooldown_hours: number;
  objective_text: string | null;
  duration_mins: number;
  category: string;
  time_mode: string;
  is_generated: number;
  is_daily: number;
  expires_at: string | null;
};

export type DungeonRun = {
  id: number;
  dungeon_id: number;
  completed_at: string;
  result: string;
  coins_earned: number;
  hp_change: number;
  item_dropped: string | null;
  started_at: string | null;
  status: string;
};

export type ActiveDungeonRun = {
  run_id: number;
  dungeon_id: number;
  started_at: string;
  dungeon_name: string;
  duration_mins: number;
  objective_text: string | null;
  category: string;
  rank: string;
  time_mode: string;
  is_generated: number;
  expires_at: string | null;
};

export type Quest = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  quest_type: string;
  status: string;
  generated_at: string;
  coin_reward: number;
  stat_hint: string | null;
  accepted_at: string | null;
};

export type GameLog = {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
};

export type GameStats = {
  str: number; str_ap: number; str_auto: number;
  agi: number; agi_ap: number; agi_auto: number;
  foc: number; foc_ap: number; foc_auto: number;
  wis: number; wis_ap: number; wis_auto: number;
  spr: number; spr_ap: number; spr_auto: number;
  per: number; per_ap: number; per_auto: number;
  sta: number; sta_ap: number; sta_auto: number;
};

export type DungeonClearResult = {
  xpEarned: number;
  coinsEarned: number;
  itemDropped: string | null;
  itemRarity: Rarity | null;
  itemSlotType: string | null;
  keyDropped: string | null;
};

// ─── Rarity drop system ───────────────────────────────────────────────────────

type RarityTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Legendary';

// Fixed cascade: ceiling 30%, next 15%, next 7.5%, next 0.5%, no-drop 47%
// S–Legend dungeons use custom tables. 'Legendary' = item rarity (distinct from dungeon rank 'Legend').
const DROP_TABLE: Record<string, { rarity: RarityTier; chance: number }[]> = {
  E:      [{ rarity: 'E',        chance: 0.300 }, { rarity: 'D',        chance: 0.150 }, { rarity: 'C',        chance: 0.075 }, { rarity: 'B',        chance: 0.005 }],
  D:      [{ rarity: 'D',        chance: 0.300 }, { rarity: 'C',        chance: 0.150 }, { rarity: 'B',        chance: 0.075 }, { rarity: 'A',        chance: 0.005 }],
  C:      [{ rarity: 'C',        chance: 0.300 }, { rarity: 'B',        chance: 0.150 }, { rarity: 'A',        chance: 0.075 }, { rarity: 'S',        chance: 0.005 }],
  B:      [{ rarity: 'B',        chance: 0.300 }, { rarity: 'A',        chance: 0.150 }, { rarity: 'S',        chance: 0.075 }, { rarity: 'SS',       chance: 0.005 }],
  A:      [{ rarity: 'A',        chance: 0.300 }, { rarity: 'S',        chance: 0.150 }, { rarity: 'SS',       chance: 0.075 }, { rarity: 'SSS',      chance: 0.005 }],
  S:      [{ rarity: 'A',        chance: 0.200 }, { rarity: 'S',        chance: 0.225 }, { rarity: 'SS',       chance: 0.100 }, { rarity: 'SSS',      chance: 0.005 }],
  SS:     [{ rarity: 'S',        chance: 0.225 }, { rarity: 'SS',       chance: 0.225 }, { rarity: 'SSS',      chance: 0.049 }, { rarity: 'Legendary', chance: 0.001 }],
  SSS:    [{ rarity: 'S',        chance: 0.150 }, { rarity: 'SS',       chance: 0.200 }, { rarity: 'SSS',      chance: 0.1035}, { rarity: 'Legendary', chance: 0.0025}],
  Legend: [{ rarity: 'S',        chance: 0.100 }, { rarity: 'SS',       chance: 0.300 }, { rarity: 'SSS',      chance: 0.125 }, { rarity: 'Legendary', chance: 0.005 }],
};

// Equipment slot pool per dungeon category
const CATEGORY_SLOTS: Record<string, string[]> = {
  Workout:  ['top', 'pants', 'coat', 'gloves', 'shoes', 'sword'],
  Study:    ['ring', 'necklace', 'grimoire', 'scepter'],
  Devotion: ['goblet', 'bracelet', 'necklace', 'scepter'],
  Journal:  ['ring', 'necklace', 'dagger', 'bracelet'],
  default:  ['top', 'ring', 'necklace', 'dagger', 'sword', 'shield'],
};

// ─── Coin helpers ─────────────────────────────────────────────────────────────

const DUNGEON_RANK_COIN_MULT: Record<string, number> = {
  E: 1.0, D: 1.1, C: 1.2, B: 1.3, A: 1.4, S: 1.5, SS: 1.6, SSS: 1.7, Legend: 1.8,
};

// Small extra scaling on top of the personal recommended duration (avg ×
// stretch) — higher-rank gates ask for slightly more than your own stretch
// goal. Only applied to 'duration'-mode dungeons (see schema.ts v43).
const DUNGEON_RANK_DURATION_MULT: Record<string, number> = {
  E: 0.9, D: 0.95, C: 1.0, B: 1.05, A: 1.1, S: 1.2, SS: 1.3, SSS: 1.4, Legend: 1.5,
};

// Live time-limit derivation for 'duration'-mode dungeons: recommended
// duration for the dungeon's category (avg_duration × stretch, same formula
// as stretch-tier quests) × the rank multiplier above. 'time_trial' dungeons
// (fixed task + deadline, e.g. Hunter's Run — more time would make it
// *easier*) pass through with their static seeded duration_mins untouched.
// Generated gates (is_generated=1 — Daily Gates and Key-generated Extra Gates)
// had their duration frozen at creation time and never recompute — "this data
// no longer adapts to player behaviour once the gate is generated."
function withLiveDuration<T extends { duration_mins: number; category: string; rank: string; time_mode: string; is_generated: number }>(row: T): T {
  if (row.is_generated || row.time_mode !== 'duration') return row;
  const snapshot = getOrRefreshSnapshot();
  const recommended = recommendedDurationMinutes(snapshot, row.category, row.duration_mins);
  const rankMult = DUNGEON_RANK_DURATION_MULT[row.rank] ?? 1.0;
  return { ...row, duration_mins: Math.round(recommended * rankMult) };
}

// Generated gates (is_generated=1 — Daily Gates and Extra Gates) expire
// (expires_at). Drops any that have lapsed and aren't mid-attempt — keeps the
// table from accumulating stale rows, and is how stale Daily Gates get
// removed when the next day's batch generates (generateDailyContent).
function cleanupExpiredDungeons(): void {
  db.runSync(
    `DELETE FROM dungeons WHERE is_generated = 1 AND expires_at <= datetime('now', 'localtime')
     AND id NOT IN (SELECT dungeon_id FROM dungeon_runs WHERE status = 'active')`,
  );
}

/** "6h" / "2d" countdown for a generated gate's expires_at, or null if permanent/expired. */
export function getDungeonExpiryRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const remaining = (new Date(expiresAt).getTime() - Date.now()) / 3600000;
  if (remaining <= 0) return null;
  if (remaining >= 24) return `${Math.ceil(remaining / 24)}d`;
  if (remaining < 1)   return `${Math.ceil(remaining * 60)}m`;
  return `${Math.ceil(remaining)}h`;
}

// Tier scale shared by player tiers and dungeon ranks (MECHANICS.md §4).
// Player adds an "F" tier below E so 100 levels split into 10 clean brackets;
// dungeon ranks (no "F") occupy indices 2–10 on the same scale.
const DUNGEON_TIER_INDEX: Record<string, number> = {
  E: 2, D: 3, C: 4, B: 5, A: 6, S: 7, SS: 8, SSS: 9, Legend: 10,
};

function getPlayerTierIndex(level: number): number {
  return Math.min(10, Math.floor((level - 1) / 10) + 1);
}

// Reverse of DUNGEON_TIER_INDEX, plus "F" for tier 1 (levels 1-10, below the
// Game tab unlock — MIN_GAME_LEVEL) — shown on the home XP bar's rank badge.
const PLAYER_RANK_BY_TIER: Record<number, string> = { 1: 'F' };
for (const [rank, idx] of Object.entries(DUNGEON_TIER_INDEX)) PLAYER_RANK_BY_TIER[idx] = rank;

export function getPlayerRankLabel(level: number): string {
  return PLAYER_RANK_BY_TIER[getPlayerTierIndex(level)] ?? 'F';
}

// Dungeon fail damage: 33 × max(1, tier_diff). At/below player tier → flat 33.
function getDungeonFailDamage(dungeonRank: string, playerLevel: number): number {
  const dungeonTierIndex = DUNGEON_TIER_INDEX[dungeonRank] ?? 2;
  const playerTierIndex  = getPlayerTierIndex(playerLevel);
  const tierDiff = dungeonTierIndex - playerTierIndex;
  return tierDiff <= 0 ? 33 : 33 * tierDiff;
}

// ─── Game Access Gate ────────────────────────────────────────────────────────
// The Game tab itself is locked until the player reaches level 11 — below that,
// tapping the tab shows a popup instead of navigating in.

export const MIN_GAME_LEVEL = 11;

export function isGameUnlocked(): boolean {
  return getRPGState().current_level >= MIN_GAME_LEVEL;
}

// ─── Dungeon Unlock System (MECHANICS.md §11.6) ──────────────────────────────
// Clean every-10-levels progression starting at the Lv.11 Game-access gate
// (see isGameUnlocked/MIN_GAME_LEVEL) — so E unlocks the instant the Game does,
// and no player ever sees an empty dungeon list. D–Legend unlock naturally at
// the listed level, or early by purchasing the rank's "Right" (see Rights & Keys
// below) — both paths are persisted in dungeon_unlocks, permanent.

function isRankEarlyUnlocked(rank: string): boolean {
  return !!db.getFirstSync<{ rank: string }>('SELECT rank FROM dungeon_unlocks WHERE rank = ?', rank);
}

export function isDungeonRankUnlocked(rank: string, playerLevel: number): boolean {
  if ((DUNGEON_NATURAL_UNLOCK_LEVEL[rank] ?? 1) <= playerLevel) return true;
  return isRankEarlyUnlocked(rank);
}

// Highest dungeon rank currently unlocked — used as the rank for newly
// generated Daily Gates (DUNGEON_RANK_COIN_MULT/DUNGEON_RANK_DURATION_MULT).
function getCurrentDungeonRank(playerLevel: number): string {
  const ranksByTier = Object.entries(DUNGEON_TIER_INDEX).sort((a, b) => b[1] - a[1]);
  for (const [rank] of ranksByTier) {
    if (isDungeonRankUnlocked(rank, playerLevel)) return rank;
  }
  return 'E';
}

export function getDungeonUnlockInfo(rank: string): {
  unlocked: boolean; naturalLevel: number; rightCost: number | null;
} {
  const { current_level } = getRPGState();
  return {
    unlocked: isDungeonRankUnlocked(rank, current_level),
    naturalLevel: DUNGEON_NATURAL_UNLOCK_LEVEL[rank] ?? 1,
    rightCost: getDungeonRightPrice(rank),
  };
}

// ─── Dungeon Rights & Keys (MECHANICS.md §11.6 — replaces simple early-unlock) ──
// "Right" = a permanent, non-usable writ of passage that grants lasting access to
// a dungeon rank — bought early from the Shop (5× a Key's price, in Spendable XP)
// OR auto-granted the instant a player naturally levels into that rank (see
// applyXP in rpg.ts). Owning one removes it from the Shop and materializes it as
// a flavor inventory item (category='game', item_type='dungeon_right').
//
// "Key" = a consumable that — once the daily dungeon-rotation engine exists (see
// memory log: deferred alongside quest-generation) — generates an extra gate of
// its tier with a random expiry (1–10 days standard, 1–3 days for S-rank+). For
// now it's purchasable and drops from dungeon clears; its "use" effect is stubbed.

const DUNGEON_KEY_PRICE: Record<string, number> = {
  D: 50, C: 100, B: 175, A: 250, S: 375, SS: 625, SSS: 1000, Legend: 1500,
};

const HIGH_TIER_RANKS = ['S', 'SS', 'SSS', 'Legend'];

export function getDungeonKeyPrice(rank: string): number | null {
  return DUNGEON_KEY_PRICE[rank] ?? null;
}

export function getDungeonRightPrice(rank: string): number | null {
  const keyPrice = DUNGEON_KEY_PRICE[rank];
  return keyPrice != null ? keyPrice * 5 : null;
}

export function dungeonKeyItemName(rank: string): string {
  return `${rank}-Tier Dungeon Key`;
}

function dungeonKeyExpiryRangeText(rank: string): string {
  return HIGH_TIER_RANKS.includes(rank) ? '1–3 days' : '1–10 days';
}

export function dungeonKeyDescription(rank: string): string {
  return `Consume to generate an extra ${rank}-rank dungeon gate. The generated gate expires after a random ${dungeonKeyExpiryRangeText(rank)}.`;
}

export function purchaseDungeonRight(rank: string): 'ok' | 'already_owned' | 'insufficient_xp' | 'no_cost_defined' {
  const { current_level, spendable_xp } = getRPGState();
  if (isDungeonRankUnlocked(rank, current_level)) return 'already_owned';
  const cost = getDungeonRightPrice(rank);
  if (cost === null) return 'no_cost_defined';
  if ((spendable_xp ?? 0) < cost) return 'insufficient_xp';
  db.runSync('UPDATE rpg_state SET spendable_xp = spendable_xp - ? WHERE id = 1', cost);
  db.runSync('INSERT OR IGNORE INTO dungeon_unlocks (rank) VALUES (?)', rank);
  materializeDungeonRight(rank);
  triggerCurrencyRefresh();
  return 'ok';
}

// Drops/grants a Key into inventory, stacking onto an existing one if present.
export function grantDungeonKey(rank: string, qty: number = 1): void {
  try {
    const name = dungeonKeyItemName(rank);
    const existing = db.getFirstSync<{ id: number }>(
      `SELECT id FROM inventory WHERE category = 'game' AND item_type = 'dungeon_key' AND item_name = ?`, name,
    );
    if (existing) {
      db.runSync(`UPDATE inventory SET quantity = quantity + ? WHERE id = ?`, qty, existing.id);
    } else {
      db.runSync(
        `INSERT INTO inventory (item_name, category, item_type, description, quantity) VALUES (?, 'game', 'dungeon_key', ?, ?)`,
        name, dungeonKeyDescription(rank), qty,
      );
    }
  } catch {}
}

export function purchaseDungeonKey(rank: string): 'ok' | 'insufficient_xp' | 'no_cost_defined' {
  const { spendable_xp } = getRPGState();
  const cost = getDungeonKeyPrice(rank);
  if (cost === null) return 'no_cost_defined';
  if ((spendable_xp ?? 0) < cost) return 'insufficient_xp';
  db.runSync('UPDATE rpg_state SET spendable_xp = spendable_xp - ? WHERE id = 1', cost);
  grantDungeonKey(rank);
  triggerCurrencyRefresh();
  return 'ok';
}

// Consumes a Key, generating an extra gate of its rank — drawn from the same
// category-candidate pool as Daily Quests/Gates (questEngine.buildCandidates +
// fillDungeonTemplate), stamped with this rank's duration/coin/drop
// multipliers. The gate's duration_mins is computed once, here, then frozen
// (withLiveDuration skips is_generated rows) — "this data no longer adapts to
// player behaviour once the gate is created." Expires in 1–10 days (1–3 for
// S+ ranks, dungeonKeyExpiryRangeText). Requires the rank's Right already be
// owned (a Key alone doesn't grant early access — see isDungeonRankUnlocked).
// Global cooldown between Key uses (any rank) — separate from the generated
// gate's own expires_at. rpg_state.last_key_used_at (schema v47).
const KEY_USAGE_COOLDOWN_HOURS = 12;

/** Hours remaining before another Dungeon Key can be used, or 0 if off cooldown. */
export function getKeyUsageCooldownRemaining(): number {
  const { last_key_used_at } = getRPGState();
  if (!last_key_used_at) return 0;
  const elapsedHours = (Date.now() - new Date(last_key_used_at).getTime()) / 3600000;
  return Math.max(0, KEY_USAGE_COOLDOWN_HOURS - elapsedHours);
}

export function useDungeonKey(rank: string): 'ok' | 'no_key' | 'right_required' | 'on_cooldown' {
  const { current_level } = getRPGState();
  if (!isDungeonRankUnlocked(rank, current_level)) return 'right_required';
  if (getKeyUsageCooldownRemaining() > 0) return 'on_cooldown';

  const keyName = dungeonKeyItemName(rank);
  const keyRow = db.getFirstSync<{ id: number; quantity: number }>(
    `SELECT id, quantity FROM inventory WHERE category = 'game' AND item_type = 'dungeon_key' AND item_name = ?`, keyName,
  );
  if (!keyRow || keyRow.quantity < 1) return 'no_key';

  const snapshot = getOrRefreshSnapshot();
  const candidate = weightedSample(buildCandidates(snapshot), 1)[0];
  const { name, flavor_text, objective_text, primary_stat, secondary_stat } = fillDungeonTemplate(candidate);
  const recommended = recommendedDurationMinutes(snapshot, candidate.category, candidate.minutes ?? 30);
  const durationMins = Math.round(recommended * (DUNGEON_RANK_DURATION_MULT[rank] ?? 1.0));

  const expirySeconds = Math.round((HIGH_TIER_RANKS.includes(rank) ? 1 + Math.random() * 2 : 1 + Math.random() * 9) * 86400);
  const expiresAt = db.getFirstSync<{ d: string }>(
    `SELECT datetime('now', 'localtime', '+' || ? || ' seconds') as d`, expirySeconds,
  )!.d;

  db.runSync(
    `INSERT INTO dungeons (name, rank, flavor_text, primary_stat, secondary_stat, objective_text, duration_mins, category, time_mode, is_generated, is_daily, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'duration', 1, 0, ?)`,
    name, rank, flavor_text, primary_stat, secondary_stat, objective_text, durationMins, candidate.category, expiresAt,
  );

  if (keyRow.quantity <= 1) db.runSync(`DELETE FROM inventory WHERE id = ?`, keyRow.id);
  else db.runSync(`UPDATE inventory SET quantity = quantity - 1 WHERE id = ?`, keyRow.id);

  db.runSync(`UPDATE rpg_state SET last_key_used_at = ? WHERE id = 1`, sqlNow());

  return 'ok';
}

function getMoodCoinMult(): number {
  try {
    const row = db.getFirstSync<{ mood_rating: number }>(
      `SELECT mood_rating FROM activity_logs WHERE entry_type = 'mood' AND mood_rating > 0
       ORDER BY log_date DESC, created_at DESC LIMIT 1`,
    );
    if (!row) return 1.0;
    return 0.95 + ((row.mood_rating - 1) / 9) * 0.10;
  } catch { return 1.0; }
}

function getCategoryWeight(categoryName: string): number {
  try {
    const row = db.getFirstSync<{ weight: number }>(
      'SELECT weight FROM categories WHERE lower(name) = lower(?) LIMIT 1',
      categoryName,
    );
    return row?.weight ?? 5;
  } catch { return 5; }
}

// Spending MP before a dungeon improves drop luck: each point of MP spent adds
// 0.1 percentage points to the lowest (most common) drop tier — which simultaneously
// reduces the implicit no-drop chance by the same amount (no_drop = 1 − Σ table chances).
// e.g. 100 MP spent → +10 percentage points to the lowest tier, −10 to no-drop.
function rollDrop(rank: string, mpUsed: number = 0): RarityTier | null {
  const table = DROP_TABLE[rank] ?? DROP_TABLE['E'];
  const bonus = Math.max(0, mpUsed) * 0.001;
  const roll = Math.random();
  let cum = 0;
  for (let i = 0; i < table.length; i++) {
    cum += table[i].chance + (i === 0 ? bonus : 0);
    if (roll < cum) return table[i].rarity;
  }
  return null;
}

function pickSlot(category: string): string {
  const pool = CATEGORY_SLOTS[category] ?? CATEGORY_SLOTS['default'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDropRates(rank: string): { rarity: string; chance: number }[] {
  return DROP_TABLE[rank] ?? DROP_TABLE['E'];
}

const RARITY_ORDER: Record<string, number> = {
  Legendary: 0, SSS: 1, SS: 2, S: 3, A: 4, B: 5, C: 6, D: 7, E: 8,
};

export type InventoryItem = {
  id: number; item_name: string; rarity: string;
  slot_type: string | null; description: string | null; quantity: number;
  stat_buff?: string | null; is_equipped?: number;
};

export type ActiveBuff = {
  id: number; stat_key: string; stat_value: number; item_name: string; expires_at: string;
};

export function getInventoryBySlot(slotType: string): InventoryItem[] {
  try {
    const rows = db.getAllSync<InventoryItem>(
      `SELECT id, item_name, COALESCE(rarity,'E') as rarity, slot_type, description, quantity,
              stat_buff, is_equipped
       FROM inventory WHERE slot_type = ? AND category = 'game' ORDER BY id DESC`,
      slotType,
    );
    return rows.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9));
  } catch { return []; }
}

export function getEquippedItem(slotType: string): InventoryItem | null {
  try {
    return db.getFirstSync<InventoryItem>(
      `SELECT id, item_name, COALESCE(rarity,'E') as rarity, slot_type, description, quantity, stat_buff, is_equipped
       FROM inventory WHERE slot_type = ? AND category = 'game' AND is_equipped = 1 LIMIT 1`,
      slotType,
    ) ?? null;
  } catch { return null; }
}

export function equipItem(itemId: number, slotType: string): void {
  try {
    db.runSync(`UPDATE inventory SET is_equipped = 0 WHERE slot_type = ? AND category = 'game'`, slotType);
    db.runSync(`UPDATE inventory SET is_equipped = 1 WHERE id = ?`, itemId);
  } catch {}
}

export function unequipItem(itemId: number): void {
  try {
    db.runSync(`UPDATE inventory SET is_equipped = 0 WHERE id = ?`, itemId);
  } catch {}
}

export function getActiveBuffs(): ActiveBuff[] {
  try {
    // Remove expired rows on each read to prevent indefinite accumulation
    try { db.runSync(`DELETE FROM active_buffs WHERE expires_at <= datetime('now','localtime')`); } catch {}
    return db.getAllSync<ActiveBuff>(
      // LEFT JOIN: item may have been deleted after use; fall back to cached item_name
      `SELECT ab.id, ab.stat_key, ab.stat_value,
              COALESCE(i.item_name, ab.item_name, 'Consumable') as item_name,
              ab.expires_at
       FROM active_buffs ab
       LEFT JOIN inventory i ON i.id = ab.item_id
       ORDER BY ab.applied_at DESC`,
    );
  } catch { return []; }
}

export function useConsumable(itemId: number): 'ok' | 'no_inventory' {
  try {
    const item = db.getFirstSync<{ quantity: number; stat_buff: string | null; item_name: string }>(
      `SELECT quantity, stat_buff, item_name FROM inventory WHERE id = ?`, itemId,
    );
    if (!item || item.quantity <= 0) return 'no_inventory';
    if (item.stat_buff) {
      const [statKey, valueStr] = item.stat_buff.split(':');
      const statValue = parseInt(valueStr, 10);
      if (statKey && !isNaN(statValue)) {
        const exp = new Date(Date.now() + 3600000);
        const expiresAt = `${exp.getFullYear()}-${pad(exp.getMonth()+1)}-${pad(exp.getDate())} ${pad(exp.getHours())}:${pad(exp.getMinutes())}:00`;
        db.runSync(
          `INSERT INTO active_buffs (item_id, stat_key, stat_value, expires_at, item_name) VALUES (?,?,?,?,?)`,
          itemId, statKey, statValue, expiresAt, item.item_name,
        );
      }
    }
    if (item.quantity <= 1) {
      db.runSync(`DELETE FROM inventory WHERE id = ?`, itemId);
    } else {
      db.runSync(`UPDATE inventory SET quantity = quantity - 1 WHERE id = ?`, itemId);
    }
    return 'ok';
  } catch { return 'no_inventory'; }
}

export function getInventoryByStat(statKey: string, itemCategory: 'consumable' | 'catalyst'): InventoryItem[] {
  const slotType = `${itemCategory}_${statKey}`;
  return getInventoryBySlot(slotType);
}

// All unequipped 'game' items whose slot_type falls within the given set —
// powers the "unequipped item list" shown below the equipment/weapon grids
// and the aggregate catalyst tile in Supplies.
export function getUnequippedBySlots(slotTypes: string[]): InventoryItem[] {
  if (slotTypes.length === 0) return [];
  try {
    const placeholders = slotTypes.map(() => '?').join(',');
    const rows = db.getAllSync<InventoryItem>(
      `SELECT id, item_name, COALESCE(rarity,'E') as rarity, slot_type, description, quantity, stat_buff, is_equipped
       FROM inventory
       WHERE category = 'game' AND COALESCE(is_equipped, 0) = 0 AND slot_type IN (${placeholders})
       ORDER BY id DESC`,
      ...slotTypes,
    );
    return rows.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9));
  } catch { return []; }
}

// ─── Computed stats ───────────────────────────────────────────────────────────

export function getComputedStats(): GameStats {
  const rpg = getRPGState();

  const str_ap = rpg.strength    ?? 0; const str_auto = rpg.strength_auto    ?? 0;
  const agi_ap = rpg.agility     ?? 0; const agi_auto = rpg.agility_auto     ?? 0;
  const foc_ap = rpg.focus       ?? 0; const foc_auto = rpg.focus_auto       ?? 0;
  const wis_ap = rpg.wisdom      ?? 0; const wis_auto = rpg.wisdom_auto      ?? 0;
  const spr_ap = rpg.resilience  ?? 0; const spr_auto = rpg.resilience_auto  ?? 0;
  const per_ap = rpg.per_stat    ?? 0; const per_auto = rpg.per_stat_auto    ?? 0;
  const sta_ap = rpg.sta_stat    ?? 0; const sta_auto = rpg.sta_stat_auto    ?? 0;

  return {
    str: str_ap + str_auto, str_ap, str_auto,
    agi: agi_ap + agi_auto, agi_ap, agi_auto,
    foc: foc_ap + foc_auto, foc_ap, foc_auto,
    wis: wis_ap + wis_auto, wis_ap, wis_auto,
    spr: spr_ap + spr_auto, spr_ap, spr_auto,
    per: per_ap + per_auto, per_ap, per_auto,
    sta: sta_ap + sta_auto, sta_ap, sta_auto,
  };
}

export function getFatigue(): boolean {
  try {
    const rows = db.getAllSync<{ energy_rating: number }>(
      "SELECT energy_rating FROM activity_logs WHERE entry_type = 'mood' AND energy_rating > 0 ORDER BY log_date DESC LIMIT 7",
    );
    if (rows.length < 3) return false;
    return rows.reduce((s, r) => s + r.energy_rating, 0) / rows.length <= 4;
  } catch { return false; }
}

// ─── Stat allocation ──────────────────────────────────────────────────────────

const STAT_COLUMN: Record<string, string> = {
  str: 'strength', agi: 'agility', foc: 'focus',
  wis: 'wisdom',   spr: 'resilience', per: 'per_stat', sta: 'sta_stat',
};

const VALID_ATTRIBUTES = new Set(['strength', 'wisdom', 'focus', 'agility', 'resilience', 'per_stat', 'sta_stat']);

// Attribute-driven stat gain (replaces hardcoded category-name auto-gain, MECHANICS.md §9.3):
// each activity log directly adds +1 to the stat matching its category's chosen attribute.
export function grantAttributeStatGain(categoryName: string): void {
  try {
    const cat = db.getFirstSync<{ attribute: string }>('SELECT attribute FROM categories WHERE name = ?', categoryName);
    if (!cat || !VALID_ATTRIBUTES.has(cat.attribute)) return;
    db.runSync(`UPDATE rpg_state SET ${cat.attribute}_auto = ${cat.attribute}_auto + 1 WHERE id = 1`);
  } catch {}
}

export function allocateStat(statKey: string): 'ok' | 'no_ap' | 'invalid_stat' {
  const col = STAT_COLUMN[statKey];
  if (!col) return 'invalid_stat';
  const rpg = getRPGState();
  if ((rpg.ap ?? 0) < 1) return 'no_ap';
  db.runSync(`UPDATE rpg_state SET ${col} = ${col} + 1, ap = ap - 1 WHERE id = 1`);
  return 'ok';
}

// ─── Death ────────────────────────────────────────────────────────────────────

export type DeathCause = 'hp' | 'emotional' | 'physical' | 'mental' | null;

export function getDeathCause(): DeathCause {
  try {
    const rpg    = getRPGState();
    const health = getHealthState();
    if ((rpg.hp ?? 100) <= 0)    return 'hp';
    if (health.emotional <= 0)   return 'emotional';
    if (health.physical  <= 0)   return 'physical';
    if (health.mental    <= 0)   return 'mental';
    return null;
  } catch { return null; }
}

export function handleDeath(cause: DeathCause): void {
  const msg = cause === 'hp'
    ? 'HP reached zero.'
    : `${cause?.charAt(0).toUpperCase()}${cause?.slice(1)} health reached zero.`;
  addGameLog('death', msg);
  // Only reset HP to 0 when the cause is HP depletion.
  // For health stat deaths, HP stays intact — revival restores the stat instead.
  if (cause === 'hp') {
    db.runSync('UPDATE rpg_state SET hp = 0, death_acknowledged = 0 WHERE id = 1');
  } else {
    db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1');
  }
  try { db.runSync('UPDATE health_state SET health_critical = 0 WHERE id = 1'); } catch {}
}

export function acknowledgeDeathIgnore(): void {
  db.runSync('UPDATE rpg_state SET death_acknowledged = 1 WHERE id = 1');
}
export function resetDeathIgnore(): void {
  db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1');
}

// ─── Revival quests ───────────────────────────────────────────────────────────

export type RevivalQuest = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  hp_restore: number;
  duration_mins: number;
};

// Revival quests are generated on demand (only when the player dies and the
// revival screen opens) from the same category-candidate pool as Daily Quests
// (§11.8/§12.1) — but skip the snapshot's stretch/difficulty bump entirely and
// take a flat 80% of the category's base avg_duration_mins, making them easier
// than the player's normal pace. Reward formation (hp_restore + completion XP,
// see completeRevivalQuest below) is unchanged.
const REVIVAL_QUEST_COUNT = 3;
const REVIVAL_DURATION_FACTOR = 0.8;
const REVIVAL_DURATION_FALLBACK = 15;
const REVIVAL_HP_RESTORE = 20;

export function getRevivalQuests(): RevivalQuest[] {
  const snapshot = getOrRefreshSnapshot();
  const candidates = buildCandidates(snapshot);
  const picked = weightedSample(candidates, REVIVAL_QUEST_COUNT);

  return picked.map((c, i) => {
    const { title, description } = fillTemplate(c);
    const baseMinutes = snapshot.categories.find(cat => cat.category === c.category)?.avg_duration_mins ?? 0;
    const duration_mins = Math.round((baseMinutes > 0 ? baseMinutes : REVIVAL_DURATION_FALLBACK) * REVIVAL_DURATION_FACTOR);
    return {
      id: i + 1,
      title,
      description,
      category: c.category,
      hp_restore: REVIVAL_HP_RESTORE,
      duration_mins,
    };
  });
}

export function completeRevivalQuest(quest: RevivalQuest): void {
  const rpg    = getRPGState();
  const health = getHealthState();
  const restore = quest.hp_restore;

  db.runSync(`UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1`);

  // Restore HP if at 0 (covers: HP death ignored then health bar death triggers)
  if ((rpg.hp ?? 100) <= 0) {
    db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + ?) WHERE id = 1`, restore);
  }

  // Restore any zero health bars — independent of whether HP was also at 0
  const barParts: string[] = [];
  if (health.emotional <= 0) barParts.push(`emotional = ${restore}`);
  if (health.physical  <= 0) barParts.push(`physical  = ${restore}`);
  if (health.mental    <= 0) barParts.push(`mental    = ${restore}`);
  if (barParts.length > 0) {
    try { db.runSync(`UPDATE health_state SET ${barParts.join(', ')} WHERE id = 1`); } catch {}
  }

  // Log the revival activity
  const today = localDateStr();
  try {
    db.runSync(
      `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at, categories, xp_awarded, mood_rating)
       VALUES (?, ?, 'daily', 'quest', ?, ?, ?, 15, 0)`,
      quest.category, `Revival: ${quest.title}`, today, sqlNow(),
      JSON.stringify([quest.category]),
    );
  } catch {}
  addGameLog('quest_complete', `Revival quest completed: ${quest.title}. HP restored.`);
  // XP is awarded after restoration so isInDeathState() returns false
  try { applyXP(15); } catch {}
}

// ─── Revival Potion ───────────────────────────────────────────────────────────
// A real consumable: instantly restores +15 to whichever HP/health bars are at 0,
// the same dynamic as a revival quest, but skips the timed objective, the
// activity_logs entry, and the XP award — it's the no-quest shortcut.

const REVIVAL_POTION_NAME    = 'Revival Potion';
const REVIVAL_POTION_RESTORE = 15;

export function getRevivalPotionCount(): number {
  try {
    const row = db.getFirstSync<{ quantity: number }>(
      `SELECT quantity FROM inventory WHERE category = 'global' AND item_type = 'consumable' AND item_name = ?`,
      REVIVAL_POTION_NAME,
    );
    return row?.quantity ?? 0;
  } catch { return 0; }
}

export function useRevivalPotion(): 'ok' | 'none' {
  const item = db.getFirstSync<{ id: number; quantity: number }>(
    `SELECT id, quantity FROM inventory WHERE category = 'global' AND item_type = 'consumable' AND item_name = ?`,
    REVIVAL_POTION_NAME,
  );
  if (!item || item.quantity <= 0) return 'none';

  const rpg     = getRPGState();
  const health  = getHealthState();
  const restore = REVIVAL_POTION_RESTORE;

  db.runSync(`UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1`);

  if ((rpg.hp ?? 100) <= 0) {
    db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + ?) WHERE id = 1`, restore);
  }

  const barParts: string[] = [];
  if (health.emotional <= 0) barParts.push(`emotional = ${restore}`);
  if (health.physical  <= 0) barParts.push(`physical  = ${restore}`);
  if (health.mental    <= 0) barParts.push(`mental    = ${restore}`);
  if (barParts.length > 0) {
    try { db.runSync(`UPDATE health_state SET ${barParts.join(', ')} WHERE id = 1`); } catch {}
  }

  if (item.quantity <= 1) {
    db.runSync(`DELETE FROM inventory WHERE id = ?`, item.id);
  } else {
    db.runSync(`UPDATE inventory SET quantity = quantity - 1 WHERE id = ?`, item.id);
  }

  addGameLog('quest_complete', 'Revival Potion used. HP restored.');
  return 'ok';
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export function getDungeons(): Dungeon[] {
  cleanupExpiredDungeons();
  return db.getAllSync<Dungeon>(
    `SELECT * FROM dungeons WHERE is_generated = 0 OR expires_at > datetime('now', 'localtime') ORDER BY id ASC`,
  ).map(withLiveDuration);
}

function getLastCompletedRun(dungeonId: number): DungeonRun | null {
  return db.getFirstSync<DungeonRun>(
    "SELECT * FROM dungeon_runs WHERE dungeon_id = ? AND status IN ('completed','failed') ORDER BY completed_at DESC LIMIT 1",
    dungeonId,
  ) ?? null;
}

export function isDungeonOnCooldown(dungeonId: number, cooldownHours: number): boolean {
  const last = getLastCompletedRun(dungeonId);
  if (!last) return false;
  const hoursAgo = (Date.now() - new Date(last.completed_at).getTime()) / 3600000;
  return hoursAgo < cooldownHours;
}

export function getDungeonCooldownRemaining(dungeonId: number, cooldownHours: number): string | null {
  const last = getLastCompletedRun(dungeonId);
  if (!last) return null;
  const elapsed  = (Date.now() - new Date(last.completed_at).getTime()) / 3600000;
  const remaining = cooldownHours - elapsed;
  if (remaining <= 0) return null;
  if (remaining >= 24) return `${Math.ceil(remaining / 24)}d`;
  if (remaining < 1)   return `${Math.ceil(remaining * 60)}m`;
  return `${Math.ceil(remaining)}h`;
}

export function startDungeon(dungeonId: number, durationMins: number, mpUsed: number = 0): number {
  const now = sqlNow();
  const spend = Math.max(0, mpUsed);
  db.runSync(
    `INSERT INTO dungeon_runs (dungeon_id, started_at, status, result, coins_earned, hp_change, completed_at, mp_used, duration_mins)
     VALUES (?, ?, 'active', 'active', 0, 0, ?, ?, ?)`,
    dungeonId, now, now, spend, durationMins,
  );
  if (spend > 0) {
    db.runSync('UPDATE rpg_state SET mp = MAX(0, mp - ?) WHERE id = 1', spend);
    triggerCurrencyRefresh();
  }
  return db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
}

// Active runs return the duration_mins frozen at startDungeon() time, NOT a
// fresh withLiveDuration() recompute — otherwise the countdown timer (and the
// XP/log entry written on clear) could shift mid-run if the live formula's
// inputs change while the run is in progress. Falls back to a live recompute
// only for runs started before this column existed (duration_mins NULL).
export function getActiveDungeonRun(): ActiveDungeonRun | null {
  const row = db.getFirstSync<ActiveDungeonRun & { run_duration_mins: number | null }>(
    `SELECT dr.id as run_id, dr.dungeon_id, dr.started_at, dr.duration_mins as run_duration_mins,
            d.name as dungeon_name, d.duration_mins, d.objective_text,
            d.category, d.rank, d.time_mode, d.is_generated, d.expires_at
     FROM dungeon_runs dr
     JOIN dungeons d ON d.id = dr.dungeon_id
     WHERE dr.status = 'active'
     ORDER BY dr.id DESC LIMIT 1`,
  );
  if (!row) return null;
  const { run_duration_mins, ...rest } = row;
  return run_duration_mins != null ? { ...rest, duration_mins: run_duration_mins } : withLiveDuration(rest);
}

// Generated gates (is_generated=1 — Daily Gates and Extra Gates) are one-time
// quests — any finished attempt (clear, fail, or abandon) consumes the gate,
// win or lose, so it no longer appears in its section regardless of cooldown.
function consumeIfGenerated(dungeon: Dungeon): void {
  if (dungeon.is_generated) {
    db.runSync(`DELETE FROM dungeons WHERE id = ?`, dungeon.id);
  }
}

export function submitDungeonClear(runId: number, dungeon: Dungeon): DungeonClearResult {
  const weight      = getCategoryWeight(dungeon.category);
  const xpEarned    = Math.max(1, Math.floor(sessionXP(dungeon.duration_mins, weight) * 1.20));
  const rankMult    = DUNGEON_RANK_COIN_MULT[dungeon.rank] ?? 1.0;
  const baseCoins   = 50 + Math.floor(Math.random() * 51); // rand(50–100)
  const coinsEarned = Math.floor(baseCoins * rankMult * getMoodCoinMult() * getCoinMultiplier());
  let itemDropped: string | null = null;
  let itemRarity: Rarity | null = null;
  let itemSlotType: string | null = null;
  let keyDropped: string | null = null;

  const mpUsed = db.getFirstSync<{ mp_used: number }>(
    'SELECT mp_used FROM dungeon_runs WHERE id = ?', runId,
  )?.mp_used ?? 0;
  const droppedRarity = rollDrop(dungeon.rank, mpUsed);
  if (droppedRarity) {
    const slot = pickSlot(dungeon.category ?? 'default');
    itemRarity   = droppedRarity;
    itemSlotType = slot;
    itemDropped  = `${droppedRarity}-rank ${slot.replace('_', ' ')}`;
    try {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description)
         VALUES (?, 'equipment', 'game', ?, ?, ?)`,
        itemDropped, slot, droppedRarity,
        `Dropped from ${dungeon.name} (${dungeon.rank}-rank gate).`,
      );
    } catch {}
  }

  // Keys drop ~15% of the time on a clear, of the cleared gate's own rank.
  if (Math.random() < 0.15) {
    keyDropped = dungeonKeyItemName(dungeon.rank);
    grantDungeonKey(dungeon.rank);
  }

  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'completed', result = 'win', completed_at = ?, coins_earned = ?, item_dropped = ? WHERE id = ?`,
    now, coinsEarned, itemDropped, runId,
  );
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', coinsEarned);

  try {
    db.runSync(
      `INSERT INTO activity_logs (entry_type, categories, category, description, duration_mins, xp_awarded, mood_rating, log_date)
       VALUES ('dungeon', ?, ?, ?, ?, ?, 0, date('now','localtime'))`,
      JSON.stringify([dungeon.category]),
      dungeon.category,
      `${dungeon.rank}-Rank Gate: ${dungeon.name}`,
      dungeon.duration_mins,
      xpEarned,
    );
  } catch {}

  try { applyXP(xpEarned); } catch {}
  addGameLog(
    'dungeon_win',
    `Gate Cleared: ${dungeon.name}. +${xpEarned} XP · +${coinsEarned} coins.${itemDropped ? ` Obtained: ${itemDropped}.` : ''}${keyDropped ? ` Found: ${keyDropped}.` : ''}`,
  );
  consumeIfGenerated(dungeon);

  return { xpEarned, coinsEarned, itemDropped, itemRarity, itemSlotType, keyDropped };
}

export function failDungeon(runId: number, dungeon: Dungeon): void {
  const { current_level } = getRPGState();
  const damage = getDungeonFailDamage(dungeon.rank, current_level);
  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'failed', result = 'fail', completed_at = ?, hp_change = ? WHERE id = ?`,
    now, -damage, runId,
  );
  db.runSync('UPDATE rpg_state SET hp = MAX(0, hp - ?) WHERE id = 1', damage);
  addGameLog('dungeon_fail', `Gate Failed: ${dungeon.name}. HP -${damage}.`);
  consumeIfGenerated(dungeon);
  triggerDeathCheck();
}

export function abandonDungeon(runId: number, dungeon: Dungeon): void {
  const now = sqlNow();
  db.runSync(
    `UPDATE dungeon_runs SET status = 'abandoned', result = 'abandoned', completed_at = ? WHERE id = ?`,
    now, runId,
  );
  consumeIfGenerated(dungeon);
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export function getPendingQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'pending' ORDER BY generated_at DESC",
  );
}

export function getAcceptedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'accepted' ORDER BY accepted_at DESC",
  );
}

// Once per local day (rpg_state.last_daily_gen_date), draws a 6-candidate pool
// (questEngine.drawDailyPool — same pool useDungeonKey draws from) split 3
// quests / 3 dungeons. Each candidate is a distinct category, so the two
// groups never overlap. Replaces the retired weekly quest engine —
// quest_type='daily' is the only quest type now. Stale daily quests are wiped
// outright; stale Daily Gates expire via cleanupExpiredDungeons (expires_at =
// start of the new day, active runs excluded — same exception as Extra Gates).
export function generateDailyContent(): void {
  try {
    const today = localDateStr();
    if (getRPGState().last_daily_gen_date === today) return;

    db.runSync(`DELETE FROM quests WHERE quest_type = 'daily'`);
    cleanupExpiredDungeons();

    const snapshot = getOrRefreshSnapshot();
    const { questCandidates, dungeonCandidates } = drawDailyPool(snapshot);

    for (const candidate of questCandidates) {
      const { title, description, stat_hint } = fillTemplate(candidate);
      db.runSync(
        `INSERT INTO quests (title, description, category, quest_type, coin_reward, status, stat_hint, duration_mins)
         VALUES (?, ?, ?, 'daily', 30, 'pending', ?, ?)`,
        title, description, candidate.category, stat_hint, candidate.minutes ?? 30,
      );
    }

    const rank = getCurrentDungeonRank(getRPGState().current_level);
    const rankDurationMult = DUNGEON_RANK_DURATION_MULT[rank] ?? 1.0;
    const expiresAt = db.getFirstSync<{ d: string }>(
      `SELECT datetime('now', 'localtime', 'start of day', '+1 day') as d`,
    )!.d;

    for (const candidate of dungeonCandidates) {
      const { name, flavor_text, objective_text, primary_stat, secondary_stat } = fillDungeonTemplate(candidate);
      const recommended = recommendedDurationMinutes(snapshot, candidate.category, candidate.minutes ?? 30);
      const durationMins = Math.round(recommended * rankDurationMult);
      db.runSync(
        `INSERT INTO dungeons (name, rank, flavor_text, primary_stat, secondary_stat, objective_text, duration_mins, category, time_mode, is_generated, is_daily, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'duration', 1, 1, ?)`,
        name, rank, flavor_text, primary_stat, secondary_stat, objective_text, durationMins, candidate.category, expiresAt,
      );
    }

    db.runSync(`UPDATE rpg_state SET last_daily_gen_date = ? WHERE id = 1`, today);
  } catch {}
}

export function acceptQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'accepted', accepted_at = ? WHERE id = ?`, sqlNow(), questId);
}

export function completeQuest(questId: number, notes?: string): void {
  const quest = db.getFirstSync<Quest & { duration_mins?: number }>('SELECT * FROM quests WHERE id = ?', questId);
  if (!quest) return;

  const weight   = getCategoryWeight(quest.category);
  const duration = quest.duration_mins ?? 30;
  const xpEarned  = Math.max(1, Math.floor(sessionXP(duration, weight) * 1.10));
  const questCoins = Math.floor(50 * getMoodCoinMult() * getCoinMultiplier());
  db.runSync(`UPDATE quests SET status = 'completed' WHERE id = ?`, questId);
  db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?, ?)`, questId, questCoins);
  db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', questCoins);

  const desc = notes?.trim() ? `${quest.title} — ${notes.trim()}` : quest.title;
  try {
    db.runSync(
      `INSERT INTO activity_logs (entry_type, categories, category, description, xp_awarded, mood_rating, log_date)
       VALUES ('quest', ?, ?, ?, ?, 0, date('now','localtime'))`,
      JSON.stringify([quest.category]), quest.category, desc, xpEarned,
    );
  } catch {}

  try { applyXP(xpEarned); } catch {}

  addGameLog('quest_complete', `Quest completed: ${quest.title}. +${xpEarned} XP · +${quest.coin_reward} coins.`);
}

export function skipQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'skipped' WHERE id = ?`, questId);
}

export function deleteQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'deleted' WHERE id = ?`, questId);
}

// ─── Game log ─────────────────────────────────────────────────────────────────

export function getGameLogs(): GameLog[] {
  return db.getAllSync<GameLog>('SELECT * FROM game_logs ORDER BY created_at DESC LIMIT 100');
}

export function addGameLog(event_type: string, description: string): void {
  try { db.runSync(`INSERT INTO game_logs (event_type, description) VALUES (?, ?)`, event_type, description); } catch {}
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export function getQuestCompletedCount(): number {
  return db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM quest_completions')?.n ?? 0;
}

export function getDungeonClearedCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM dungeon_runs WHERE status = 'completed'",
  )?.n ?? 0;
}

export function getDeathCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM game_logs WHERE event_type = 'death'",
  )?.n ?? 0;
}
export function getAbandonedCount(): number {
  return db.getFirstSync<{ n: number }>(
    "SELECT count(*) as n FROM dungeon_runs WHERE status = 'abandoned'",
  )?.n ?? 0;
}
export function getSkippedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'skipped' ORDER BY generated_at DESC LIMIT 10",
  );
}

export function getCompletedQuests(): Quest[] {
  return db.getAllSync<Quest>(
    "SELECT * FROM quests WHERE status = 'completed' ORDER BY generated_at DESC LIMIT 20",
  );
}

export function reinstateQuest(questId: number): void {
  db.runSync(`UPDATE quests SET status = 'pending', accepted_at = NULL WHERE id = ?`, questId);
}

export function purchaseHPBoost(): 'ok' | 'insufficient_coins' | 'hp_not_critical' {
  const rpg = getRPGState();
  if ((rpg.hp ?? 100) > 30) return 'hp_not_critical';
  if ((rpg.coins ?? 0) < 100) return 'insufficient_coins';
  db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + 30), coins = coins - 100 WHERE id = 1`);
  triggerCurrencyRefresh();
  return 'ok';
}

// ─── Cosmetic purchases (MECHANICS.md §6 — pricing/content placeholders) ────
// Cosmetic content/visuals aren't designed yet; purchase is a real coin sink
// that records a cosmetic-tier inventory entry to redeem once content exists.
const COSMETIC_TIERS: Record<'standard' | 'premium', { cost: number; itemName: string }> = {
  standard: { cost: 5_000,  itemName: 'Standard Cosmetic Token' },
  premium:  { cost: 10_000, itemName: 'Premium Cosmetic Token' },
};

export function purchaseCosmetic(tier: 'standard' | 'premium'): 'ok' | 'insufficient_coins' {
  const { cost, itemName } = COSMETIC_TIERS[tier];
  const rpg = getRPGState();
  if ((rpg.coins ?? 0) < cost) return 'insufficient_coins';
  db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', cost);
  db.runSync(
    `INSERT INTO inventory (item_name, category, item_type, description) VALUES (?, 'cosmetic', 'cosmetic', 'Redeemable once cosmetic content is added — placeholder purchase.')`,
    itemName,
  );
  triggerCurrencyRefresh();
  return 'ok';
}
