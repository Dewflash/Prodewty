// Executable proof for the Wave 1 stat→gameplay effect math. Run: npm run test:stats
import {
  combatDamage,
  effectiveEnergyMaxFromStats,
  focusTimerReduction,
  applyFocusTimerReduction,
  fishingWindowMultiplier,
  perceptionSellMultiplier,
  tradingPointsForSale,
  grantableTradingPoints,
  COMBAT_STAT_KEYS,
  FOC_TIMER_REDUCTION_CAP,
  AGI_FISHING_WINDOW_CAP,
  PER_SELL_BONUS_CAP,
  TRADING_DAILY_POINT_CAP,
} from './StatEffects';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log('Combat damage:');
{
  check('zero stats still deal at least 1', combatDamage({}) === 1);
  const even = Object.fromEntries(COMBAT_STAT_KEYS.map(k => [k, 12]));
  check('uniform stats average to themselves', combatDamage(even) === 12);
  check('per (non-combat stat) is ignored', combatDamage({ ...even, per: 999 }) === 12);
  check('damage floors, never rounds up', combatDamage({ str: 5 }) === Math.floor(5 / COMBAT_STAT_KEYS.length) || combatDamage({ str: 5 }) === 1);
  check('monotone in str', combatDamage({ str: 60 }) <= combatDamage({ str: 120 }));
}

console.log('Energy max (RES):');
{
  check('0 RES leaves stored max unchanged', effectiveEnergyMaxFromStats(100, 0) === 100);
  check('+1 per RES point', effectiveEnergyMaxFromStats(100, 25) === 125);
  check('negative RES clamps to no penalty', effectiveEnergyMaxFromStats(100, -5) === 100);
}

console.log('Focus timer reduction:');
{
  check('0 FOC → no reduction', focusTimerReduction(0) === 0);
  check('10 FOC → 10%', Math.abs(focusTimerReduction(10) - 0.10) < 1e-9);
  check('caps at 30%', focusTimerReduction(500) === FOC_TIMER_REDUCTION_CAP);
  check('60min job at cap → 42min', applyFocusTimerReduction(60, 500) === 42);
  check('duration never drops below 1', applyFocusTimerReduction(1, 500) === 1);
}

console.log('Fishing window (AGI):');
{
  check('0 AGI → 1.0x', fishingWindowMultiplier(0) === 1);
  check('10 AGI → 1.10x', Math.abs(fishingWindowMultiplier(10) - 1.10) < 1e-9);
  check('caps at +25%', fishingWindowMultiplier(999) === 1 + AGI_FISHING_WINDOW_CAP);
  check('negative AGI clamps to 1.0x', fishingWindowMultiplier(-10) === 1);
}

console.log('Sell price (PER):');
{
  check('0 PER → 1.0x', perceptionSellMultiplier(0) === 1);
  check('10 PER → 1.05x', Math.abs(perceptionSellMultiplier(10) - 1.05) < 1e-9);
  check('caps at +15%', perceptionSellMultiplier(999) === 1 + PER_SELL_BONUS_CAP);
}

console.log('Trading accrual:');
{
  check('1-coin sale worth 2 points (1 + ceil(log10(2)))', tradingPointsForSale(1) === 2);
  check('100-coin sale worth 4 points', tradingPointsForSale(100) === 4);
  check('value 0 still worth base point(s)', tradingPointsForSale(0) >= 1);
  check('fresh day grants full raw points', grantableTradingPoints(0, 5) === 5);
  check('grant truncated at daily cap', grantableTradingPoints(TRADING_DAILY_POINT_CAP - 2, 5) === 2);
  check('at cap grants nothing', grantableTradingPoints(TRADING_DAILY_POINT_CAP, 5) === 0);
  check('over cap grants nothing (no negatives)', grantableTradingPoints(TRADING_DAILY_POINT_CAP + 10, 5) === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
