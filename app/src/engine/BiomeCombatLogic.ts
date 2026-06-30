// Pure combat logic for Biome Guardians (Phase 5). State transitions,
// the danger-gradient spawn count, chaser steering, and damage math —
// all pure and unit-tested; biome.tsx drives them each frame. No React /
// SQLite / asset imports; rng is injectable for deterministic tests.

import { BIOME_GUARDIAN, getGuardianDef, type GuardianDefinition } from './BiomeGuardianCatalog';

export type Rng = () => number;

// --- Danger gradient ---------------------------------------------------
// More guardians in higher-tier biomes, scaled by how many high-value
// nodes there are to guard (spec: spawners cluster near nodes). Capped so
// a small screen never gets swamped.
export function guardianSpawnCount(biome: string, nodeCount: number): number {
  const g = BIOME_GUARDIAN[biome];
  if (!g) return 0;
  const perNode = g.tier; // tier 1 → ~1 per node, tier 2 → ~2
  return Math.min(6, Math.max(1, Math.round((nodeCount / 2) * perNode)));
}

export function guardianForBiome(biome: string): GuardianDefinition | null {
  const g = BIOME_GUARDIAN[biome];
  return g ? getGuardianDef(g.defId) : null;
}

// --- Chaser (Slime) state machine -------------------------------------
export type ChaserState = 'wander' | 'aggro' | 'attack';

export function nextChaserState(distToPlayer: number, def: GuardianDefinition): ChaserState {
  if (distToPlayer <= def.attackRange) return 'attack';
  if (distToPlayer <= def.aggroRange) return 'aggro';
  return 'wander';
}

// Desired velocity (unit-ish vector * speed scalar) for a chaser. In
// 'aggro'/'attack' it heads at the player; in 'wander' it drifts around
// its anchor. Returns {dx, dy} in pixels/sec-equivalent (caller multiplies
// by dt). Pure given an injected wander angle.
export function chaserVelocity(
  state: ChaserState,
  pos: { x: number; y: number },
  anchor: { x: number; y: number },
  player: { x: number; y: number },
  playerSpeed: number,
  def: GuardianDefinition,
  wanderAngle: number,
): { dx: number; dy: number } {
  const speed = playerSpeed * def.speedFactor;
  if (state === 'attack') return { dx: 0, dy: 0 }; // stop to strike
  if (state === 'aggro') {
    const vx = player.x - pos.x;
    const vy = player.y - pos.y;
    const len = Math.hypot(vx, vy) || 1;
    return { dx: (vx / len) * speed, dy: (vy / len) * speed };
  }
  // wander: drift toward a point on a circle around the anchor; if it has
  // strayed past the leash radius, steer back toward the anchor instead.
  const leash = 120;
  const fromAnchor = Math.hypot(pos.x - anchor.x, pos.y - anchor.y);
  if (fromAnchor > leash) {
    const vx = anchor.x - pos.x;
    const vy = anchor.y - pos.y;
    const len = Math.hypot(vx, vy) || 1;
    return { dx: (vx / len) * speed * 0.5, dy: (vy / len) * speed * 0.5 };
  }
  return { dx: Math.cos(wanderAngle) * speed * 0.5, dy: Math.sin(wanderAngle) * speed * 0.5 };
}

// --- Turret (Predator Plant) state machine ----------------------------
export type TurretState = 'camouflage' | 'aggro';

export function nextTurretState(distToPlayer: number, def: GuardianDefinition): TurretState {
  return distToPlayer <= def.aggroRange ? 'aggro' : 'camouflage';
}

// A turret fires on a cooldown while the player is in range.
export function turretShouldFire(state: TurretState, msSinceLastShot: number, cooldownMs: number): boolean {
  return state === 'aggro' && msSinceLastShot >= cooldownMs;
}

// --- Shared combat math ------------------------------------------------
// Player's swing damage from their five stats (mirrors the dungeon's
// avg-of-stats so biome and dungeon combat feel consistent).
export function playerAttackDamage(stats: { strength: number; focus: number; agility: number; wisdom: number; resilience: number }): number {
  return Math.max(1, Math.floor((stats.strength + stats.focus + stats.agility + stats.wisdom + stats.resilience) / 5));
}

export function applyDamage(hp: number, dmg: number): number {
  return Math.max(0, hp - dmg);
}

export function isDead(hp: number): boolean {
  return hp <= 0;
}
