// Executable proof for the pure fishing logic. Run: npm run test:fishing
import {
  eligibleFish,
  rollFish,
  catchChance,
  resolveCatch,
} from './FishingLogic';
import { FISH_CATALOG } from './FishCatalog';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log('eligibleFish — zone/season/time gating:');
{
  // Carp: sanctuary+forest, spring/summer/autumn, all hours.
  const spring = eligibleFish('sanctuary', 'spring', 10);
  check('carp eligible in sanctuary spring daytime', spring.some(f => f.itemId === 'rpg_carp'));
  check('winter sanctuary has no carp (out of season)', !eligibleFish('sanctuary', 'winter', 10).some(f => f.itemId === 'rpg_carp'));
  // Pufferfish: beach, summer, 12-16 only.
  check('pufferfish eligible at beach summer noon', eligibleFish('beach', 'summer', 13).some(f => f.itemId === 'rpg_pufferfish'));
  check('pufferfish NOT eligible at beach summer evening (out of time window)', !eligibleFish('beach', 'summer', 20).some(f => f.itemId === 'rpg_pufferfish'));
  check('no fish in a zone none allow', eligibleFish('mountain', 'spring', 10).length === 0);
}

console.log('rollFish — returns an eligible fish, null when nothing bites:');
{
  const eligible = eligibleFish('sanctuary', 'spring', 10);
  const picked = rollFish(eligible, () => 0.5);
  check('rollFish returns one of the eligible fish', !!picked && eligible.some(f => f.itemId === picked.itemId));
  check('rollFish on empty list returns null', rollFish([], Math.random) === null);
  // Weighting: with many draws, the easier fish (carp, diff 15) should
  // be picked more than the hard one (catfish, diff 75).
  let carp = 0, catfish = 0;
  for (let i = 0; i < 2000; i++) {
    const f = rollFish(eligible, Math.random);
    if (f?.itemId === 'rpg_carp') carp++;
    else if (f?.itemId === 'rpg_catfish') catfish++;
  }
  check('easier fish picked more often than harder fish', carp > catfish);
}

console.log('catchChance — harder fish lower, better rods higher, clamped:');
{
  const carp = FISH_CATALOG['rpg_carp'];      // diff 15
  const catfish = FISH_CATALOG['rpg_catfish']; // diff 75
  check('easy fish has higher chance than hard fish (same rod)', catchChance('Basic', carp.difficulty) > catchChance('Basic', catfish.difficulty));
  check('better rod beats basic on the same fish', catchChance('Gold', catfish.difficulty) > catchChance('Basic', catfish.difficulty));
  check('chance never exceeds 0.95', catchChance('Gold', 1) <= 0.95);
  check('chance never below 0.15', catchChance('Basic', 100) >= 0.15);
}

console.log('resolveCatch — needs both the window AND the roll:');
{
  const catfish = FISH_CATALOG['rpg_catfish'];
  check('missing the reel window always fails', resolveCatch('Gold', catfish, false, () => 0) === false);
  check('in-window + good roll lands it', resolveCatch('Basic', catfish, true, () => 0) === true);
  check('in-window + bad roll (rng=0.99) fails', resolveCatch('Basic', catfish, true, () => 0.99) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
