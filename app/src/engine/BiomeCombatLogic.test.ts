// Executable proof for Biome Guardian combat logic. Run: npm run test:combat
import {
  guardianSpawnCount,
  guardianForBiome,
  nextChaserState,
  chaserVelocity,
  nextTurretState,
  turretShouldFire,
  playerAttackDamage,
  applyDamage,
  isDead,
} from './BiomeCombatLogic';
import { getGuardianDef } from './BiomeGuardianCatalog';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const slime = getGuardianDef('forest_slime')!;
const plant = getGuardianDef('predator_plant')!;

console.log('Danger gradient — count scales with tier and node count:');
{
  check('forest (tier 1) spawns at least 1', guardianSpawnCount('forest', 6) >= 1);
  check('mountain (tier 2) spawns more than forest for same nodes', guardianSpawnCount('mountain', 6) > guardianSpawnCount('forest', 6));
  check('count is capped at 6', guardianSpawnCount('mountain', 100) <= 6);
  check('a biome with no guardian spawns 0', guardianSpawnCount('nowhere', 6) === 0);
  check('forest guardian is the slime', guardianForBiome('forest')?.defId === 'forest_slime');
  check('mountain guardian is the predator plant', guardianForBiome('mountain')?.defId === 'predator_plant');
}

console.log('Chaser (slime) state machine:');
{
  check('far away → wander', nextChaserState(500, slime) === 'wander');
  check('within aggro range → aggro', nextChaserState(slime.aggroRange - 1, slime) === 'aggro');
  check('within attack range → attack', nextChaserState(slime.attackRange - 1, slime) === 'attack');
}

console.log('Chaser steering:');
{
  const pos = { x: 100, y: 100 };
  const anchor = { x: 100, y: 100 };
  const player = { x: 300, y: 100 }; // due east
  const v = chaserVelocity('aggro', pos, anchor, player, 140, slime, 0);
  check('aggro moves toward the player (+x)', v.dx > 0 && Math.abs(v.dy) < 0.001);
  check('attack state stops moving', chaserVelocity('attack', pos, anchor, player, 140, slime, 0).dx === 0);
  // Strayed past leash → steers back toward anchor.
  const strayed = chaserVelocity('wander', { x: 400, y: 100 }, anchor, player, 140, slime, 0);
  check('wandering past leash steers back toward anchor (-x)', strayed.dx < 0);
}

console.log('Turret (predator plant) state machine + firing:');
{
  check('out of range → camouflage', nextTurretState(plant.aggroRange + 10, plant) === 'camouflage');
  check('in range → aggro', nextTurretState(plant.aggroRange - 10, plant) === 'aggro');
  check('fires when aggro and cooldown elapsed', turretShouldFire('aggro', 2000, 1500) === true);
  check('does not fire on cooldown', turretShouldFire('aggro', 500, 1500) === false);
  check('does not fire while camouflaged', turretShouldFire('camouflage', 9999, 1500) === false);
}

console.log('Combat math:');
{
  check('attack damage is avg of stats (floored, min 1)', playerAttackDamage({ strength: 10, focus: 10, agility: 10, wisdom: 10, resilience: 10 }) === 10);
  check('attack damage never below 1', playerAttackDamage({ strength: 0, focus: 0, agility: 0, wisdom: 0, resilience: 0 }) === 1);
  check('applyDamage floors at 0', applyDamage(5, 20) === 0);
  check('applyDamage subtracts', applyDamage(20, 7) === 13);
  check('isDead at 0', isDead(0) === true && isDead(1) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
