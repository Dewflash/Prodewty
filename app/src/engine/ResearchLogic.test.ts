// Executable proof for Wave 3 (The Library lives) pure logic:
//   - WIS research-timer reduction + FOC∘WIS composition + rarity→minutes ladder
//     (StatEffects.ts, lattice D7)
//   - Building upgrade data + prerequisite predicates + level labels
//     (BuildingCatalog.ts, lattice D6)
// Run: npm run test:research  (both modules are dependency-free — no DB/React).
import {
  wisdomResearchReduction,
  researchBaseMinutes,
  applyResearchTimerReduction,
  focusTimerReduction,
  WIS_RESEARCH_REDUCTION_CAP,
  RESEARCH_BASE_MINUTES_TIER1,
} from './StatEffects';
import {
  getUpgradeDef,
  buildingLevelLabel,
  MAX_BUILDING_LEVEL,
  BUILDING_UPGRADES,
} from './BuildingCatalog';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log('Wisdom research reduction:');
{
  check('0 WIS → no reduction', wisdomResearchReduction(0) === 0);
  check('10 WIS → 10%', Math.abs(wisdomResearchReduction(10) - 0.10) < 1e-9);
  check('caps at 40%', wisdomResearchReduction(500) === WIS_RESEARCH_REDUCTION_CAP);
  check('negative WIS clamps to 0', wisdomResearchReduction(-5) === 0);
  check('monotone in WIS', wisdomResearchReduction(20) >= wisdomResearchReduction(10));
}

console.log('Research base minutes (rarity tier ladder):');
{
  check('tier 1 = 30m', researchBaseMinutes(1) === 30);
  check('tier 2 = 60m', researchBaseMinutes(2) === 60);
  check('tier 3 = 120m', researchBaseMinutes(3) === 120);
  check('tier floor: <1 treated as tier 1', researchBaseMinutes(0) === RESEARCH_BASE_MINUTES_TIER1);
  check('fractional tier floors down', researchBaseMinutes(2.9) === 60);
}

console.log('Composed FOC∘WIS research timer reduction:');
{
  check('no stats → unchanged (rounded)', applyResearchTimerReduction(60, 0, 0) === 60);
  // 60m with 40% WIS reduction and 0 FOC → 36m.
  check('WIS-only 40% → 36m of 60m', applyResearchTimerReduction(60, 0, 40) === 36);
  // Composed multiplicatively: 30% FOC × 40% WIS on 100 → 100*0.7*0.6 = 42.
  check('FOC 30% ∘ WIS 40% compose multiplicatively', applyResearchTimerReduction(100, 30, 40) === 42);
  check('each cap respected independently (combined < either raw sum)',
    applyResearchTimerReduction(100, 500, 500) === Math.round(100 * (1 - focusTimerReduction(500)) * (1 - WIS_RESEARCH_REDUCTION_CAP)));
  check('never drops below 1', applyResearchTimerReduction(1, 500, 500) >= 1);
  check('higher WIS never lengthens a job', applyResearchTimerReduction(120, 10, 30) <= applyResearchTimerReduction(120, 10, 5));
}

console.log('Building upgrade data (D6):');
{
  // Library: lvl1→2 needs Language Silver (level 4); lvl2→3 needs Research Gold (7).
  const lib2 = getUpgradeDef('Library', 1);
  check('Library lvl1→2 defined', !!lib2 && lib2.targetLevel === 2);
  check('Library lvl2 requires Language mastery', !!lib2?.requirementLabel?.includes('Language'));
  check('Library lvl2 blocked below Language Silver (lvl3)',
    !!lib2?.prerequisiteMet && lib2.prerequisiteMet({ masteryLevel: () => 3 }) === false);
  check('Library lvl2 allowed at Language Silver (lvl4)',
    !!lib2?.prerequisiteMet && lib2.prerequisiteMet({ masteryLevel: (s) => (s === 'language' ? 4 : 1) }) === true);

  const lib3 = getUpgradeDef('Library', 2);
  check('Library lvl2→3 needs Research Gold', !!lib3?.requirementLabel?.includes('Research'));
  check('Library lvl3 blocked below Research Gold (lvl6)',
    !!lib3?.prerequisiteMet && lib3.prerequisiteMet({ masteryLevel: () => 6 }) === false);
  check('Library lvl3 allowed at Research Gold (lvl7)',
    !!lib3?.prerequisiteMet && lib3.prerequisiteMet({ masteryLevel: (s) => (s === 'research' ? 7 : 1) }) === true);

  check('Library caps at level 3', getUpgradeDef('Library', 3) === null);
  check('Workshop lvl1→2 defined, no prerequisite',
    !!getUpgradeDef('Workshop', 1) && getUpgradeDef('Workshop', 1)!.prerequisiteMet === undefined);
  check('Workshop caps at level 2', getUpgradeDef('Workshop', 2) === null);
  check('TownHall lvl2 defined (unused this wave)', !!BUILDING_UPGRADES.TownHall[2]);
  check('MAX_BUILDING_LEVEL: Library 3, others 2',
    MAX_BUILDING_LEVEL.Library === 3 && MAX_BUILDING_LEVEL.Workshop === 2 && MAX_BUILDING_LEVEL.Factory === 2);
}

console.log('Building level labels:');
{
  check('level 1 → "Lv 1"', buildingLevelLabel('Library', 1) === 'Lv 1');
  check('Library lvl2 flavored Understanding', buildingLevelLabel('Library', 2).includes('Understanding'));
  check('Library lvl3 flavored Wisdom', buildingLevelLabel('Library', 3).includes('Wisdom'));
  check('non-Library lvl2 is plain "Lv 2"', buildingLevelLabel('Workshop', 2) === 'Lv 2');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
