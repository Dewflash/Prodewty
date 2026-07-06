// Pure, dependency-free stat→gameplay effect math (RPG_PROGRESSION_LATTICE.md
// D8 "Fix the stat pipeline"). Every continuous multiplier the 7 stats drive —
// combat damage, energy_max, craft/fishing timers, sell prices — is computed
// here from a plain stats object so it can be unit-tested in isolation (no
// React / SQLite / asset imports). rpg.tsx / biome.tsx / db modules pass in the
// stat totals from getComputedStats(); the tested code is the shipped code.
//
// Stat keys match GameStats (db/game.ts getComputedStats): str, agi, foc, wis,
// spr, per, sta. NOTE the legacy UI naming inversion (StatsSection.tsx): the
// stat the player sees as "Resilience" (RES) is GameStats key `sta`, and
// "Spirituality" (SPR) is GameStats key `spr`. The architecture mapping table
// speaks in display names, so RES→energy_max uses `sta` here.

// ─── Tunable constants (single source of truth) ────────────────────────────

// Combat damage: average of the player's combat-relevant stat totals (mirrors
// the pre-Wave-1 dungeon formula's spirit — an average, not a sum — so numbers
// stay in the same range, but now over all 7 totals incl. activity-earned _auto
// gains rather than 5 AP-only columns).
export const COMBAT_STAT_KEYS = ['str', 'agi', 'foc', 'wis', 'spr', 'sta'] as const;

// Resilience (RES = GameStats `sta`) → +1 effective energy_max per point.
export const ENERGY_MAX_PER_RES = 1;

// Focus → craft/research timer reduction: 1% per FOC point, capped at 30%.
export const FOC_TIMER_REDUCTION_PER_POINT = 0.01;
export const FOC_TIMER_REDUCTION_CAP = 0.30;

// Agility → fishing: widen the catch window / slow the fish by up to +25%.
// Modifier is a multiplier applied to the bite/reel window duration.
export const AGI_FISHING_WINDOW_PER_POINT = 0.01;
export const AGI_FISHING_WINDOW_CAP = 0.25;

// Perception → sell price bonus: +0.5% per PER point, capped at 15% (stacks
// additively with the flat VendorStall +20%).
export const PER_SELL_BONUS_PER_POINT = 0.005;
export const PER_SELL_BONUS_CAP = 0.15;

// Wisdom → research (Library Inspect) speed: 1% per WIS point, capped at 40%
// (RPG_ARCHITECTURE.md maps WIS to "reduces time/resources to turn a Discovered
// item into an Understood item"; lattice D7 "Wisdom reduces research time").
// Composes MULTIPLICATIVELY with the FOC craft-timer reduction so each cap is
// respected independently — see applyResearchTimerReduction below.
export const WIS_RESEARCH_REDUCTION_PER_POINT = 0.01;
export const WIS_RESEARCH_REDUCTION_CAP = 0.40;

export type StatTotals = {
  str: number; agi: number; foc: number; wis: number;
  spr: number; per: number; sta: number;
};

// ─── Pure effect functions ─────────────────────────────────────────────────

// Combat swing damage from the full stat totals. Averaged over the 6 combat
// stat keys, floored, min 1. Used by both the Dungeon (rpg.tsx handleAttack)
// and Biome guardian combat (biome.tsx) so the two loops feel consistent.
export function combatDamage(stats: Partial<StatTotals>): number {
  const sum = COMBAT_STAT_KEYS.reduce((acc, k) => acc + (stats[k] ?? 0), 0);
  return Math.max(1, Math.floor(sum / COMBAT_STAT_KEYS.length));
}

// Effective energy_max = stored energy_max + RES total. RES is GameStats `sta`.
export function effectiveEnergyMaxFromStats(storedEnergyMax: number, resTotal: number): number {
  return storedEnergyMax + Math.max(0, resTotal) * ENERGY_MAX_PER_RES;
}

// Fraction (0..CAP) by which a timed job's duration is reduced, driven by FOC.
export function focusTimerReduction(focTotal: number): number {
  return Math.min(FOC_TIMER_REDUCTION_CAP, Math.max(0, focTotal) * FOC_TIMER_REDUCTION_PER_POINT);
}

// Apply the FOC reduction to a duration (minutes or ms — unit-agnostic). Never
// drops below 1 unit so a job always takes some time.
export function applyFocusTimerReduction(baseDuration: number, focTotal: number): number {
  const reduced = baseDuration * (1 - focusTimerReduction(focTotal));
  return Math.max(1, Math.round(reduced));
}

// Fishing catch-window multiplier from AGI (1.0 .. 1.25). Callers multiply the
// bite/reel window duration by this to give a wider window at higher AGI.
export function fishingWindowMultiplier(agiTotal: number): number {
  return 1 + Math.min(AGI_FISHING_WINDOW_CAP, Math.max(0, agiTotal) * AGI_FISHING_WINDOW_PER_POINT);
}

// Sell-price multiplier from PER (1.0 .. 1.15), additive with any stall bonus.
export function perceptionSellMultiplier(perTotal: number): number {
  return 1 + Math.min(PER_SELL_BONUS_CAP, Math.max(0, perTotal) * PER_SELL_BONUS_PER_POINT);
}

// ─── Research (Library Inspect) timers (RPG_PROGRESSION_LATTICE.md D7) ───────
// Base research minutes for an item scale with its rarity TIER: tier 1 = 30m,
// tier 2 = 60m, tier 3 = 120m (30m × 2^(tier-1)). Kept pure so the tier→minutes
// mapping is unit-tested; callers pass the tier from the item's rarity.
export const RESEARCH_BASE_MINUTES_TIER1 = 30;

export function researchBaseMinutes(rarityTier: number): number {
  const tier = Math.max(1, Math.floor(rarityTier));
  return RESEARCH_BASE_MINUTES_TIER1 * Math.pow(2, tier - 1);
}

// Fraction (0..CAP) by which a research job's duration is reduced, driven by WIS.
export function wisdomResearchReduction(wisTotal: number): number {
  return Math.min(
    WIS_RESEARCH_REDUCTION_CAP,
    Math.max(0, wisTotal) * WIS_RESEARCH_REDUCTION_PER_POINT,
  );
}

// Effective research duration: apply the FOC craft/research reduction AND the
// WIS research reduction, composed multiplicatively (each keeps its own cap, so
// the combined reduction can exceed either cap but neither is individually
// breached). Unit-agnostic (minutes or ms); never drops below 1 unit.
export function applyResearchTimerReduction(
  baseDuration: number,
  focTotal: number,
  wisTotal: number,
): number {
  const reduced = baseDuration
    * (1 - focusTimerReduction(focTotal))
    * (1 - wisdomResearchReduction(wisTotal));
  return Math.max(1, Math.round(reduced));
}

// ─── Trading mastery accrual (RPG_PROGRESSION_LATTICE.md D3) ────────────────
// Selling grants Trading points ∝ log10 of the sale value, with a per-day cap.
// Kept pure (day-bucket + running total passed in) so the cap logic is unit-
// testable; rpg.tsx persists the two rpg_state columns.
export const TRADING_POINTS_PER_SALE_BASE = 1;
export const TRADING_DAILY_POINT_CAP = 20;

// Raw points a single sale is worth before the daily cap: 1 + ceil(log10(value+1)).
export function tradingPointsForSale(saleValue: number): number {
  const v = Math.max(0, saleValue);
  return TRADING_POINTS_PER_SALE_BASE + Math.ceil(Math.log10(v + 1));
}

// Given the points already earned today and a fresh sale's raw points, returns
// how many points may actually be granted (respecting the 20/day cap). Never
// negative. Pure: caller supplies the day bucket + running total from the DB.
export function grantableTradingPoints(pointsToday: number, rawSalePoints: number): number {
  const remaining = TRADING_DAILY_POINT_CAP - Math.max(0, pointsToday);
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(rawSalePoints, remaining));
}
