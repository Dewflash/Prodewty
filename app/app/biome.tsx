import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { fonts, fontSize } from '../src/theme/typography';
import { Joystick } from '../src/engine/Joystick';
import { RpgSpriteFrameView } from '../src/engine/RpgItemIcon';
import { getZoneDef, type ZoneId } from '../src/engine/ZoneCatalog';
import { getBiomeTree } from '../src/engine/BiomeTreeCatalog';
import { chopBiomeTree } from '../src/db/biomeExplore';
import { getRpgItem } from '../src/engine/RpgObjectCatalog';
import { crittersForBiome } from '../src/engine/CritterCatalog';
import { resolveNetCatch } from '../src/engine/CatchLogic';
import { getInventoryQuantity, addInventoryItem } from '../src/db/garden';
import { recordRpgDiscovery } from '../src/db/rpgDiscovery';
import { grantSkillPoints } from '../src/db/skills';
import { getComputedStats } from '../src/db/game';
import { db } from '../src/db/schema';
import { type GuardianDefinition } from '../src/engine/BiomeGuardianCatalog';
import {
  guardianForBiome, guardianSpawnCount,
  nextChaserState, chaserVelocity, nextTurretState, turretShouldFire,
  playerAttackDamage, applyDamage, isDead,
} from '../src/engine/BiomeCombatLogic';

const AVATAR_SIZE = 28;
const TREE_SIZE = 48;
const SPEED = 140;
const CHOP_RANGE = 44;
const CHOP_COOLDOWN_MS = 900;
const TREE_COUNT = 6;
const CATCH_RANGE = 50;
const CATCH_COOLDOWN_MS = 1000;
const ATTACK_RANGE = 56;       // how close the player must be to swing
const ENEMY_HIT_COOLDOWN_MS = 1100; // min gap between an enemy's hits on the player
const TURRET_FIRE_COOLDOWN_MS = 1600;

type LiveGuardian = {
  id: number;
  hp: number;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  state: string;
  wanderAngle: number;
  lastHitAt: number;
};
// Where critters sit (ratios of field). Offset from trees so they don't
// overlap. A biome shows up to this many critter slots, filled from the
// biome's catalog (repeating if it has fewer species).
const CRITTER_SCATTER_RATIOS = [
  { x: 0.32, y: 0.4 },
  { x: 0.62, y: 0.32 },
  { x: 0.28, y: 0.62 },
  { x: 0.68, y: 0.78 },
];
// Fixed scatter pattern (ratios of field size) — same every visit for now,
// real randomization/regeneration can come later once this loop is proven.
const TREE_SCATTER_RATIOS = [
  { x: 0.18, y: 0.22 },
  { x: 0.75, y: 0.18 },
  { x: 0.5, y: 0.5 },
  { x: 0.15, y: 0.72 },
  { x: 0.82, y: 0.68 },
  { x: 0.45, y: 0.85 },
];

// Standalone, simplified biome explore screen (RPG resource dynamics spec,
// Phase 4a/4b, 2026-06-30) — deliberately not the full Sanctuary engine
// (no shop/crafting/building, no camera/collision system). Just walk
// around a small space and chop the biome's tree. Upgradeable to full
// free-roam later if needed.
export default function BiomeScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const zoneId = (type ?? 'forest') as ZoneId;
  const zoneDef = getZoneDef(zoneId);
  const tree = getBiomeTree(zoneId);

  const { width, height } = Dimensions.get('window');
  const fieldWidth = width;
  const fieldHeight = height - insets.top - insets.bottom - 80;
  const treePositions = TREE_SCATTER_RATIOS.slice(0, TREE_COUNT).map(ratio => ({
    x: ratio.x * fieldWidth - TREE_SIZE / 2,
    y: ratio.y * fieldHeight - TREE_SIZE / 2,
  }));

  // Critters spawn fresh each visit (biomes regenerate on travel). Fill the
  // scatter slots from this biome's catalog; null position = already caught.
  const biomeCritters = crittersForBiome(zoneId);
  const critterSpawns = biomeCritters.length === 0 ? [] : CRITTER_SCATTER_RATIOS.map((ratio, i) => ({
    def: biomeCritters[i % biomeCritters.length],
    x: ratio.x * fieldWidth - AVATAR_SIZE / 2,
    y: ratio.y * fieldHeight - AVATAR_SIZE / 2,
  }));

  const [avatarPos, setAvatarPos] = useState({ x: fieldWidth / 4, y: fieldHeight / 2 });
  const direction = useRef({ dx: 0, dy: 0 });
  const lastChopByTree = useRef<Record<number, number>>({});
  const lastCatchAt = useRef(0);
  const [toast, setToast] = useState<string | null>(null);
  const [nearestTreeIndex, setNearestTreeIndex] = useState<number | null>(null);
  const [nearestCritterIndex, setNearestCritterIndex] = useState<number | null>(null);
  const [caughtCritters, setCaughtCritters] = useState<Record<number, boolean>>({});
  // Ref mirror so the movement interval (which doesn't re-subscribe on
  // catch) sees live caught-state without a stale closure.
  const caughtCrittersRef = useRef<Record<number, boolean>>({});
  const hasNet = getInventoryQuantity('rpg_net') > 0;

  // --- Combat (Phase 5 Biome Guardians) -------------------------------
  const guardianDef = guardianForBiome(zoneId);
  // Player stats + HP loaded once from rpg_state; biomes are ephemeral so
  // there's no enemy persistence — they regenerate on each travel-in.
  // Damage now reads the FULL 7-stat totals via getComputedStats() (AP +
  // activity-earned _auto), so real-life gains reach guardian fights (D8),
  // instead of the old raw 5-column AP-only SELECT.
  const playerStats = useRef((() => {
    const s = getComputedStats();
    const hpRow = db.getFirstSync<{ hp: number; hp_max: number }>(
      'SELECT hp, hp_max FROM rpg_state WHERE id = 1',
    ) ?? { hp: 100, hp_max: 100 };
    return {
      str: s.str, agi: s.agi, foc: s.foc, wis: s.wis, spr: s.spr, per: s.per, sta: s.sta,
      hp: hpRow.hp, hp_max: hpRow.hp_max,
    };
  })());
  const [playerHp, setPlayerHp] = useState(playerStats.current.hp);
  const playerHpRef = useRef(playerStats.current.hp);
  const deadRef = useRef(false);

  const guardiansRef = useRef<LiveGuardian[]>([]);
  // Spawn guardians once near the trees (high-value nodes), per the danger
  // gradient. Built in a ref-initialiser so it's stable across renders.
  const [guardians, setGuardians] = useState<LiveGuardian[]>(() => {
    if (!guardianDef) return [];
    const count = guardianSpawnCount(zoneId, TREE_COUNT);
    const spawned: LiveGuardian[] = [];
    for (let i = 0; i < count; i++) {
      const node = treePositions[i % treePositions.length];
      // Offset within a small radius of the guarded node.
      const ax = node.x + TREE_SIZE / 2 + (Math.random() - 0.5) * 70;
      const ay = node.y + TREE_SIZE / 2 + (Math.random() - 0.5) * 70;
      spawned.push({
        id: i, hp: guardianDef.maxHp, x: ax, y: ay, anchorX: ax, anchorY: ay,
        state: guardianDef.behaviour === 'turret' ? 'camouflage' : 'wander',
        wanderAngle: Math.random() * Math.PI * 2, lastHitAt: 0,
      });
    }
    guardiansRef.current = spawned;
    return spawned;
  });
  const [nearestGuardianId, setNearestGuardianId] = useState<number | null>(null);

  const avatarCenterRef = useRef({ x: fieldWidth / 4 + AVATAR_SIZE / 2, y: fieldHeight / 2 + AVATAR_SIZE / 2 });

  useEffect(() => {
    const interval = setInterval(() => {
      const { dx, dy } = direction.current;
      // Avatar moves only when the joystick is engaged, but everything
      // below (proximity, guardian AI) must tick every frame regardless.
      if (dx !== 0 || dy !== 0) {
        setAvatarPos(prev => {
          const nextX = Math.max(0, Math.min(fieldWidth - AVATAR_SIZE, prev.x + dx * SPEED * 0.016));
          const nextY = Math.max(0, Math.min(fieldHeight - AVATAR_SIZE, prev.y + dy * SPEED * 0.016));
          avatarCenterRef.current = { x: nextX + AVATAR_SIZE / 2, y: nextY + AVATAR_SIZE / 2 };
          return { x: nextX, y: nextY };
        });
      }
      const centerX = avatarCenterRef.current.x;
      const centerY = avatarCenterRef.current.y;

      let closestIndex: number | null = null;
      let closestDist = Infinity;
      treePositions.forEach((pos, index) => {
        const dist = Math.hypot(centerX - (pos.x + TREE_SIZE / 2), centerY - (pos.y + TREE_SIZE / 2));
        if (dist < closestDist) { closestDist = dist; closestIndex = index; }
      });
      setNearestTreeIndex(closestDist <= CHOP_RANGE ? closestIndex : null);

      let critterIndex: number | null = null;
      let critterDist = Infinity;
      critterSpawns.forEach((c, index) => {
        if (caughtCrittersRef.current[index]) return;
        const dist = Math.hypot(centerX - (c.x + AVATAR_SIZE / 2), centerY - (c.y + AVATAR_SIZE / 2));
        if (dist < critterDist) { critterDist = dist; critterIndex = index; }
      });
      setNearestCritterIndex(critterDist <= CATCH_RANGE ? critterIndex : null);

      tickGuardians(centerX, centerY);
    }, 16);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldWidth, fieldHeight]);

  // One frame of guardian AI: move/attack each guardian against the player
  // and damage the player on contact/fire. Pure decisions come from
  // BiomeCombatLogic; this just applies them to the live entities.
  const tickGuardians = (px: number, py: number) => {
    if (!guardianDef || guardiansRef.current.length === 0 || deadRef.current) return;
    const now = Date.now();
    let nearest: number | null = null;
    let nearestDist = Infinity;
    let damageToPlayer = 0;

    guardiansRef.current.forEach(g => {
      const gcx = g.x + AVATAR_SIZE / 2;
      const gcy = g.y + AVATAR_SIZE / 2;
      const dist = Math.hypot(px - gcx, py - gcy);
      if (dist < nearestDist) { nearestDist = dist; nearest = g.id; }

      if (guardianDef.behaviour === 'chaser') {
        const state = nextChaserState(dist, guardianDef);
        g.state = state;
        const v = chaserVelocity(state, { x: g.x, y: g.y }, { x: g.anchorX, y: g.anchorY }, { x: px - AVATAR_SIZE / 2, y: py - AVATAR_SIZE / 2 }, SPEED, guardianDef, g.wanderAngle);
        g.x = Math.max(0, Math.min(fieldWidth - AVATAR_SIZE, g.x + v.dx * 0.016));
        g.y = Math.max(0, Math.min(fieldHeight - AVATAR_SIZE, g.y + v.dy * 0.016));
        if (Math.random() < 0.02) g.wanderAngle = Math.random() * Math.PI * 2; // occasional new drift
        if (state === 'attack' && now - g.lastHitAt > ENEMY_HIT_COOLDOWN_MS) {
          g.lastHitAt = now;
          damageToPlayer += guardianDef.atk;
        }
      } else {
        const state = nextTurretState(dist, guardianDef);
        g.state = state;
        if (turretShouldFire(state, now - g.lastHitAt, TURRET_FIRE_COOLDOWN_MS)) {
          g.lastHitAt = now;
          damageToPlayer += guardianDef.atk;
        }
      }
    });

    setNearestGuardianId(nearestDist <= ATTACK_RANGE ? nearest : null);
    setGuardians([...guardiansRef.current]);
    if (damageToPlayer > 0) hurtPlayer(damageToPlayer);
  };

  const hurtPlayer = (dmg: number) => {
    const next = applyDamage(playerHpRef.current, dmg);
    playerHpRef.current = next;
    setPlayerHp(next);
    db.runSync('UPDATE rpg_state SET hp = ? WHERE id = 1', next);
    if (isDead(next) && !deadRef.current) {
      deadRef.current = true;
      setToast('You were overwhelmed — retreating to the Sanctuary…');
      setTimeout(() => router.back(), 1300);
    }
  };

  const handleAttack = () => {
    if (nearestGuardianId === null || !guardianDef || deadRef.current) return;
    const g = guardiansRef.current.find(x => x.id === nearestGuardianId);
    if (!g) return;
    const dmg = playerAttackDamage(playerStats.current);
    g.hp = applyDamage(g.hp, dmg);
    if (isDead(g.hp)) {
      // Drop loot to inventory.
      guardianDef.drops.forEach((d: GuardianDefinition['drops'][number]) => {
        if (Math.random() <= d.chance) {
          const qty = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
          if (qty > 0) { addInventoryItem(d.itemId, qty); recordRpgDiscovery(d.itemId, 'forage'); }
        }
      });
      guardiansRef.current = guardiansRef.current.filter(x => x.id !== g.id);
      setNearestGuardianId(null);
      // Mastery accrual (D3): defeating a guardian is both a combat kill and a
      // survived encounter. Scaled a touch by the guardian's danger (atk).
      grantSkillPoints('combat', Math.max(5, Math.round(guardianDef.atk)));
      grantSkillPoints('surviving', 5);
      flashToast(`Defeated the ${guardianDef.name}!`);
    } else {
      flashToast(`Hit the ${guardianDef.name} (${g.hp}/${guardianDef.maxHp})`);
    }
    setGuardians([...guardiansRef.current]);
  };

  const handleChop = () => {
    if (nearestTreeIndex === null) return;
    const now = Date.now();
    if (now - (lastChopByTree.current[nearestTreeIndex] ?? 0) < CHOP_COOLDOWN_MS) return;
    lastChopByTree.current[nearestTreeIndex] = now;

    const result = chopBiomeTree(zoneId);
    if (!result) return;
    // Mastery accrual (D3): tree-chop collection feeds Foraging.
    grantSkillPoints('foraging', 2);
    if (result.seedItemId) {
      const seedItem = getRpgItem(result.seedItemId);
      setToast(`+${result.wood} Wood, found ${seedItem?.name ?? 'a seed'}!`);
    } else {
      setToast(`+${result.wood} Wood`);
    }
    setTimeout(() => setToast(null), 1500);
  };

  const flashToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1500);
  };

  const handleCatch = () => {
    if (nearestCritterIndex === null) return;
    const now = Date.now();
    if (now - lastCatchAt.current < CATCH_COOLDOWN_MS) return;
    lastCatchAt.current = now;

    const spawn = critterSpawns[nearestCritterIndex];
    if (!spawn) return;
    const landed = resolveNetCatch(spawn.def.catchDifficulty, Math.random);
    if (landed) {
      addInventoryItem(spawn.def.itemId, 1);
      recordRpgDiscovery(spawn.def.itemId, 'forage');
      // Mastery accrual (D3): net catch feeds Hunting, scaled 2-10 by the
      // critter's catch difficulty (its rarity proxy — no explicit rarity band).
      grantSkillPoints('hunting', 2 + Math.round((spawn.def.catchDifficulty / 100) * 8));
      caughtCrittersRef.current[nearestCritterIndex] = true;
      setCaughtCritters(prev => ({ ...prev, [nearestCritterIndex]: true }));
      setNearestCritterIndex(null);
      flashToast(`Caught a ${spawn.def.name}!`);
    } else {
      flashToast(`The ${spawn.def.name} wriggled free…`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave biome"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{zoneDef?.name ?? 'Biome'}</Text>
        {guardianDef && (
          <View style={styles.hpBar}>
            <Feather name="heart" size={12} color="#e8607a" />
            <View style={styles.hpTrack}>
              <View style={[styles.hpFill, { width: `${Math.max(0, (playerHp / playerStats.current.hp_max) * 100)}%` }]} />
            </View>
          </View>
        )}
      </View>

      <View style={[styles.field, { height: fieldHeight, top: insets.top + 70 }]}>
        {tree && treePositions.map((pos, index) => (
          <View key={index} pointerEvents="none" style={[styles.treeWrap, { left: pos.x, top: pos.y }]}>
            <RpgSpriteFrameView frame={tree.frame} size={TREE_SIZE} />
            {nearestTreeIndex === index && <Text style={styles.treeLabel}>{tree.name}</Text>}
          </View>
        ))}
        {critterSpawns.map((c, index) => (
          caughtCritters[index] ? null : (
            <View key={`critter-${index}`} pointerEvents="none" style={[styles.critterWrap, { left: c.x, top: c.y }]}>
              <View style={styles.critter}>
                <Feather name={c.def.featherIcon as any} size={16} color="#3a2a1a" />
              </View>
              {nearestCritterIndex === index && <Text style={styles.treeLabel}>{c.def.name}</Text>}
            </View>
          )
        ))}

        {guardianDef && guardians.map(g => {
          const camouflaged = g.state === 'camouflage';
          return (
            <View key={`guardian-${g.id}`} pointerEvents="none" style={[styles.guardianWrap, { left: g.x, top: g.y, opacity: camouflaged ? 0.4 : 1 }]}>
              <View style={[styles.guardian, { backgroundColor: guardianDef.color, borderColor: g.state === 'aggro' || g.state === 'attack' ? '#fff2bb' : '#1a1a1a' }]}>
                <Feather name={guardianDef.featherIcon as any} size={16} color="#0b140c" />
              </View>
              {!camouflaged && (
                <View style={styles.guardianHpTrack}>
                  <View style={[styles.guardianHpFill, { width: `${Math.max(0, (g.hp / guardianDef.maxHp) * 100)}%` }]} />
                </View>
              )}
            </View>
          );
        })}

        <View pointerEvents="none" style={[styles.avatar, { left: avatarPos.x, top: avatarPos.y }]} />
      </View>

      {nearestGuardianId !== null && guardianDef && !deadRef.current && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Attack ${guardianDef.name}`}
          style={[styles.attackBtn, { bottom: 140 + insets.bottom }]}
          onPress={handleAttack}
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.chopText}>Attack {guardianDef.name}</Text>
        </Pressable>
      )}

      {nearestGuardianId === null && nearestTreeIndex !== null && tree && nearestCritterIndex === null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chop ${tree.name}`}
          style={[styles.chopBtn, { bottom: 140 + insets.bottom }]}
          onPress={handleChop}
        >
          <Feather name="crosshair" size={18} color="#fff" />
          <Text style={styles.chopText}>Chop {tree.name}</Text>
        </Pressable>
      )}

      {nearestGuardianId === null && nearestCritterIndex !== null && (
        hasNet ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Catch critter with net"
            style={[styles.catchBtn, { bottom: 140 + insets.bottom }]}
            onPress={handleCatch}
          >
            <Feather name="wind" size={18} color="#0b140c" />
            <Text style={styles.catchText}>Catch {critterSpawns[nearestCritterIndex]?.def.name}</Text>
          </Pressable>
        ) : (
          <View style={[styles.chopBtn, { bottom: 140 + insets.bottom }]} pointerEvents="none">
            <Feather name="wind" size={16} color="#fff" />
            <Text style={styles.chopText}>Need a Net to catch</Text>
          </View>
        )
      )}

      {toast && (
        <View style={[styles.toast, { bottom: 200 + insets.bottom }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Joystick
        onMove={(dx, dy) => { direction.current = { dx, dy }; }}
        onRelease={() => { direction.current = { dx: 0, dy: 0 }; }}
        bottomInset={insets.bottom}
        leftInset={insets.left}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2f6b3a' },
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: fontSize.lg,
  },
  field: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  treeWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  treeLabel: {
    color: '#fff',
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.xs,
    marginTop: 2,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  avatar: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#fff2bb',
    borderWidth: 2,
    borderColor: '#3a2a1a',
  },
  chopBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  chopText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: fontSize.sm,
  },
  critterWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  critter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 7,
    backgroundColor: '#e8d9a8',
    borderWidth: 2,
    borderColor: '#3a2a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1c40f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  catchText: {
    color: '#0b140c',
    fontFamily: fonts.ui.bold,
    fontSize: fontSize.sm,
  },
  guardianWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  guardian: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianHpTrack: {
    width: AVATAR_SIZE,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  guardianHpFill: {
    height: 4,
    backgroundColor: '#e8607a',
  },
  attackBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#c0392b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  hpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  hpTrack: {
    width: 90,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  hpFill: {
    height: 8,
    backgroundColor: '#e8607a',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  toastText: {
    color: '#fff',
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
  },
});
