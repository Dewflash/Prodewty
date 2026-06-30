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

const AVATAR_SIZE = 28;
const TREE_SIZE = 48;
const SPEED = 140;
const CHOP_RANGE = 44;
const CHOP_COOLDOWN_MS = 900;
const TREE_COUNT = 6;
const CATCH_RANGE = 50;
const CATCH_COOLDOWN_MS = 1000;
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

  useEffect(() => {
    const interval = setInterval(() => {
      const { dx, dy } = direction.current;
      if (dx === 0 && dy === 0) return;
      setAvatarPos(prev => {
        const nextX = Math.max(0, Math.min(fieldWidth - AVATAR_SIZE, prev.x + dx * SPEED * 0.016));
        const nextY = Math.max(0, Math.min(fieldHeight - AVATAR_SIZE, prev.y + dy * SPEED * 0.016));
        const centerX = nextX + AVATAR_SIZE / 2;
        const centerY = nextY + AVATAR_SIZE / 2;

        let closestIndex: number | null = null;
        let closestDist = Infinity;
        treePositions.forEach((pos, index) => {
          const dist = Math.hypot(centerX - (pos.x + TREE_SIZE / 2), centerY - (pos.y + TREE_SIZE / 2));
          if (dist < closestDist) { closestDist = dist; closestIndex = index; }
        });
        setNearestTreeIndex(closestDist <= CHOP_RANGE ? closestIndex : null);

        // Nearest un-caught critter in range.
        let critterIndex: number | null = null;
        let critterDist = Infinity;
        critterSpawns.forEach((c, index) => {
          if (caughtCrittersRef.current[index]) return;
          const dist = Math.hypot(centerX - (c.x + AVATAR_SIZE / 2), centerY - (c.y + AVATAR_SIZE / 2));
          if (dist < critterDist) { critterDist = dist; critterIndex = index; }
        });
        setNearestCritterIndex(critterDist <= CATCH_RANGE ? critterIndex : null);
        return { x: nextX, y: nextY };
      });
    }, 16);
    return () => clearInterval(interval);
  }, [fieldWidth, fieldHeight]);

  const handleChop = () => {
    if (nearestTreeIndex === null) return;
    const now = Date.now();
    if (now - (lastChopByTree.current[nearestTreeIndex] ?? 0) < CHOP_COOLDOWN_MS) return;
    lastChopByTree.current[nearestTreeIndex] = now;

    const result = chopBiomeTree(zoneId);
    if (!result) return;
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
        <View pointerEvents="none" style={[styles.avatar, { left: avatarPos.x, top: avatarPos.y }]} />
      </View>

      {nearestTreeIndex !== null && tree && nearestCritterIndex === null && (
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

      {nearestCritterIndex !== null && (
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
