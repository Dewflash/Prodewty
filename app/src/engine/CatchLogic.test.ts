// Executable proof for net catch logic + critter catalog. Run: npm run test:catch
import { netCatchChance, resolveNetCatch } from './CatchLogic';
import { crittersForBiome, getCritterDef, CRITTER_CATALOG } from './CritterCatalog';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log('netCatchChance — harder critters lower, net bonus higher, clamped:');
{
  check('easier critter beats harder one', netCatchChance(12) > netCatchChance(60));
  check('net bonus raises odds', netCatchChance(60, 0.2) > netCatchChance(60, 0));
  check('clamped at 0.9 max', netCatchChance(1, 0.5) <= 0.9);
  check('clamped at 0.2 min', netCatchChance(100) >= 0.2);
}

console.log('resolveNetCatch — roll gating:');
{
  check('good roll lands it', resolveNetCatch(50, () => 0) === true);
  check('bad roll (0.99) fails', resolveNetCatch(50, () => 0.99) === false);
}

console.log('CritterCatalog — biome filtering:');
{
  const forest = crittersForBiome('forest');
  check('forest has beetle + rabbit', forest.some(c => c.itemId === 'rpg_forest_beetle') && forest.some(c => c.itemId === 'rpg_wild_rabbit'));
  check('beach critters are not in forest', !forest.some(c => c.biome === 'beach'));
  check('getCritterDef resolves a known critter', getCritterDef('rpg_sand_crab')?.name === 'Sand Crab');
  check('every critter has a positive sell price (a real sink)', Object.values(CRITTER_CATALOG).every(c => c.sellPrice > 0));
  check('unknown critter returns null', getCritterDef('nope') === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
