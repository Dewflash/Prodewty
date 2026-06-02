import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { getRPGState, type RPGState } from '../../src/db/rpg';
import {
  getComputedStats, getFatigue, getActiveQuests, generateQuests,
  getDungeons, isDungeonOnCooldown, runDungeon, completeQuest,
  deleteQuest, skipQuest, allocateStat, getQuestCompletedCount, getDeathCount,
  type GameStats, type Dungeon, type Quest, type DungeonResult,
} from '../../src/db/game';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAT_KEYS: { key: keyof GameStats; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',    abbr: 'STR' },
  { key: 'agi', label: 'Agility',     abbr: 'AGI' },
  { key: 'foc', label: 'Focus',       abbr: 'FOC' },
  { key: 'wis', label: 'Wisdom',      abbr: 'WIS' },
  { key: 'spr', label: 'Spirituality',abbr: 'SPR' },
  { key: 'per', label: 'Perception',  abbr: 'PER' },
  { key: 'sta', label: 'Stamina',     abbr: 'STA' },
];

const RANK_COLOR: Record<string, string> = {
  E: '#64748B', D: '#34D399', C: '#38BDF8',
  B: '#A855F7', A: '#F97316', S: '#FBBF24',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  return (
    <View style={sb.wrap}>
      <View style={sb.header}>
        <Text style={sb.label}>{label}</Text>
        <Text style={[sb.val, { color }]}>{value} / {max}</Text>
      </View>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  val: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  track: { height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});

function StatRow({ stat, value, apPart, autoPart, ap, onAllocate }: {
  stat: typeof STAT_KEYS[number]; value: number; apPart: number; autoPart: number;
  ap: number; onAllocate: (key: string) => void;
}) {
  return (
    <View style={st.row}>
      <Text style={st.abbr}>{stat.abbr}</Text>
      <Text style={st.val}>{value}</Text>
      <Text style={st.breakdown}>({apPart} AP + {autoPart} auto)</Text>
      {ap > 0 && (
        <Pressable onPress={() => onAllocate(stat.key as string)} style={st.plus}>
          <Text style={st.plusTxt}>+</Text>
        </Pressable>
      )}
    </View>
  );
}
const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  abbr: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.primary, width: 40 },
  val: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.textPrimary, width: 36 },
  breakdown: { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  plus: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  plusTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.primary },
});

function DungeonCard({ dungeon, onEnter }: { dungeon: Dungeon; onEnter: () => void }) {
  const onCooldown = isDungeonOnCooldown(dungeon.id, dungeon.cooldown_hours);
  const rankColor  = RANK_COLOR[dungeon.rank] ?? colors.textMuted;
  return (
    <View style={dc.card}>
      <View style={dc.top}>
        <View style={[dc.rankBadge, { borderColor: rankColor }]}>
          <Text style={[dc.rank, { color: rankColor }]}>{dungeon.rank}</Text>
        </View>
        <Text style={dc.name}>{dungeon.name}</Text>
      </View>
      <Text style={dc.stats}>
        {dungeon.primary_stat.toUpperCase()}{dungeon.secondary_stat ? ` / ${dungeon.secondary_stat.toUpperCase()}` : ''}
      </Text>
      <Text style={dc.reward}>+{dungeon.coin_reward} coins{dungeon.item_name ? ' · item drop' : ''}</Text>
      <Pressable
        onPress={onCooldown ? undefined : onEnter}
        style={[dc.enterBtn, onCooldown && dc.enterBtnCd]}
      >
        <Text style={[dc.enterTxt, onCooldown && dc.enterTxtCd]}>
          {onCooldown ? 'COOLDOWN' : 'ENTER GATE'}
        </Text>
      </Pressable>
    </View>
  );
}
const dc = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
    minWidth: 145,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rank: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  name: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  stats: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  reward: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.success },
  enterBtn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
    paddingVertical: 6, alignItems: 'center', marginTop: 4,
  },
  enterBtnCd: { borderColor: colors.border },
  enterTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1 },
  enterTxtCd: { color: colors.textMuted },
});

function QuestCard({ quest, onComplete, onSkip, onDelete }: {
  quest: Quest; onComplete: () => void; onSkip: () => void; onDelete: () => void;
}) {
  return (
    <View style={qc.card}>
      <View style={qc.header}>
        <View style={qc.systemTag}><Text style={qc.systemTxt}>SYSTEM QUEST</Text></View>
        <Pressable onPress={onDelete}><Feather name="x" size={14} color={colors.textMuted} /></Pressable>
      </View>
      <Text style={qc.title}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
      <View style={qc.footer}>
        <Text style={qc.reward}>+{quest.coin_reward} coins</Text>
        <View style={qc.actions}>
          <Pressable onPress={onSkip} style={qc.skipBtn}>
            <Text style={qc.skipTxt}>Skip</Text>
          </Pressable>
          <Pressable onPress={onComplete} style={qc.completeBtn}>
            <Text style={qc.completeTxt}>Complete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const qc = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(56,189,248,0.04)', borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  systemTag: { borderWidth: 1, borderColor: colors.primary, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  systemTxt: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.primary, letterSpacing: 1 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  desc: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reward: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.success },
  actions: { flexDirection: 'row', gap: spacing.sm },
  skipBtn: { paddingHorizontal: spacing.md, paddingVertical: 5 },
  skipTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  completeBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 5,
  },
  completeTxt: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, color: colors.bg },
});

// ─── Dungeon modals ───────────────────────────────────────────────────────────

function DungeonEntryModal({ dungeon, stats, onEnter, onClose }: {
  dungeon: Dungeon; stats: GameStats; onEnter: () => void; onClose: () => void;
}) {
  const primary = stats[dungeon.primary_stat as keyof GameStats] as number ?? 0;
  const secondary = dungeon.secondary_stat ? (stats[dungeon.secondary_stat as keyof GameStats] as number ?? 0) : null;
  const rankColor = RANK_COLOR[dungeon.rank] ?? colors.textMuted;
  return (
    <View style={dm.overlay}>
      <View style={dm.panel}>
        <View style={[dm.rankRow, { borderBottomColor: rankColor }]}>
          <Text style={[dm.rankLabel, { color: rankColor }]}>RANK {dungeon.rank} DUNGEON</Text>
        </View>
        <Text style={dm.dungeonName}>{dungeon.name}</Text>
        <Text style={dm.flavor}>{dungeon.flavor_text}</Text>
        <View style={dm.divider} />
        <Text style={dm.statLabel}>YOUR STATS</Text>
        <Text style={dm.statVal}>{dungeon.primary_stat.toUpperCase()}: {primary}{secondary !== null ? `  ·  ${dungeon.secondary_stat!.toUpperCase()}: ${secondary}` : ''}</Text>
        <Text style={dm.rewardLabel}>REWARD</Text>
        <Text style={dm.rewardVal}>{dungeon.coin_reward} coins{dungeon.item_name ? ` · ${dungeon.item_name}` : ''}</Text>
        <View style={dm.btnRow}>
          <Pressable onPress={onClose} style={dm.cancelBtn}><Text style={dm.cancelTxt}>RETREAT</Text></Pressable>
          <Pressable onPress={onEnter} style={[dm.enterBtn, { borderColor: rankColor }]}>
            <Text style={[dm.enterTxt, { color: rankColor }]}>ENTER</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DungeonResultModal({ result, dungeon, onClose }: {
  result: DungeonResult; dungeon: Dungeon; onClose: () => void;
}) {
  const winColor = result.win ? colors.success : '#EF4444';
  return (
    <View style={dm.overlay}>
      <View style={dm.panel}>
        <Text style={[dm.resultLabel, { color: winColor }]}>
          {result.win ? 'DUNGEON CLEARED' : 'DUNGEON FAILED'}
        </Text>
        <Text style={dm.dungeonName}>{dungeon.name}</Text>
        <View style={dm.divider} />
        <View style={dm.statRow}>
          <Text style={dm.statSide}>Your power</Text>
          <Text style={[dm.statSideVal, { color: result.win ? colors.success : '#EF4444' }]}>{result.playerPower}</Text>
        </View>
        <View style={dm.statRow}>
          <Text style={dm.statSide}>Dungeon power</Text>
          <Text style={dm.statSideVal}>{result.dungeonPower}</Text>
        </View>
        <View style={dm.divider} />
        <Text style={[dm.rewardVal, { color: colors.success }]}>+{result.coinsEarned} coins</Text>
        {result.hpChange < 0 && <Text style={{ fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: '#EF4444' }}>{result.hpChange} HP</Text>}
        {result.itemDropped && (
          <View style={dm.itemDrop}>
            <Text style={dm.itemDropLabel}>ITEM OBTAINED</Text>
            <Text style={dm.itemDropName}>{result.itemDropped}</Text>
            <Text style={dm.itemDropDesc}>{result.itemDescription}</Text>
          </View>
        )}
        <Pressable onPress={onClose} style={[dm.enterBtn, { borderColor: winColor, marginTop: spacing.lg }]}>
          <Text style={[dm.enterTxt, { color: winColor }]}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const dm = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: spacing.lg,
  },
  panel: {
    width: '100%', backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  rankRow: { borderBottomWidth: 1, paddingBottom: spacing.sm },
  rankLabel: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },
  dungeonName: { fontFamily: fonts.ui.bold ?? fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  flavor: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.border },
  statLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  statVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textPrimary },
  rewardLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  rewardVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.base },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  cancelTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  enterBtn: { flex: 1, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  enterTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 1 },
  resultLabel: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, letterSpacing: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statSide: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  statSideVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textPrimary },
  itemDrop: { backgroundColor: 'rgba(56,189,248,0.06)', borderRadius: radius.md, padding: spacing.md, gap: 3 },
  itemDropLabel: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.primary, letterSpacing: 1 },
  itemDropName: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  itemDropDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const [rpg,      setRpg]      = useState<RPGState | null>(null);
  const [stats,    setStats]    = useState<GameStats | null>(null);
  const [fatigue,  setFatigue]  = useState(false);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [quests,   setQuests]   = useState<Quest[]>([]);
  const [deaths,   setDeaths]   = useState(0);
  const [cleared,  setCleared]  = useState(0);

  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon | null>(null);
  const [dungeonPhase, setDungeonPhase] = useState<'entry' | 'result' | null>(null);
  const [dungeonResult, setDungeonResult] = useState<DungeonResult | null>(null);

  function reload() {
    setRpg(getRPGState());
    setStats(getComputedStats());
    setFatigue(getFatigue());
    setDungeons(getDungeons());
    generateQuests();
    setQuests(getActiveQuests());
    setDeaths(getDeathCount());
    setCleared(getQuestCompletedCount());
  }

  useFocusEffect(useCallback(() => { reload(); }, []));

  function handleAllocate(key: string) {
    const result = allocateStat(key);
    if (result === 'no_ap') { Alert.alert('No AP', 'Level up to earn more Ability Points.'); return; }
    reload();
  }

  function handleEnterDungeon() {
    if (!selectedDungeon || !stats) return;
    const result = runDungeon(selectedDungeon);
    setDungeonResult(result);
    setDungeonPhase('result');
    reload();
  }

  function closeDungeon() {
    setSelectedDungeon(null);
    setDungeonPhase(null);
    setDungeonResult(null);
    reload();
  }

  const hp    = rpg?.hp    ?? 100;
  const hpMax = rpg?.hp_max ?? 100;
  const ap    = rpg?.ap    ?? 0;
  const coins = rpg?.coins ?? 0;

  return (
    <SwipeNavWrapper currentIndex={4}>
    <SafeAreaView style={s.safe}>

      {/* Game-specific ribbon */}
      <View style={s.ribbon}>
        <Pressable style={s.ribbonIcon} onPress={() => Alert.alert('Quest Preview', 'Quest generation uses your activity history to surface missed habits as quests.')}>
          <Feather name="scroll" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={s.ribbonTitle}>SOLO LEVELING</Text>
        <Pressable style={s.ribbonIcon} onPress={() => router.push('/game-log')}>
          <Feather name="activity" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── CHARACTER PANEL ── */}
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <View style={s.levelBadge}>
              <Text style={s.levelTxt}>LVL {rpg?.current_level ?? 1}</Text>
            </View>
            <View style={s.titleCol}>
              <Text style={s.jobTxt}>JOB: {rpg?.job ?? '—'}</Text>
              <Text style={s.rankTitle}>{rpg?.title ?? 'Unranked'}</Text>
            </View>
            <View style={s.vitalsMini}>
              <Text style={s.vitalsRow}>AP: <Text style={s.vitalsVal}>{ap}</Text></Text>
              <Text style={s.vitalsRow}>Coins: <Text style={s.vitalsVal}>{coins}</Text></Text>
            </View>
          </View>

          <SystemBar label="HP" value={hp} max={hpMax} color="#EF4444" />
          <SystemBar label="MP" value={rpg?.mp ?? 0} max={100} color="#8B5CF6" />
          {fatigue && (
            <View style={s.fatigueBadge}>
              <Text style={s.fatigueTxt}>⚡ FATIGUE — Energy consistently low. STA and VIT penalised.</Text>
            </View>
          )}

          <View style={s.divider} />
          <Text style={s.sectionLabel}>STATUS WINDOW</Text>
          {stats && STAT_KEYS.map(stat => (
            <StatRow
              key={stat.key as string}
              stat={stat}
              value={stats[stat.key] as number}
              apPart={stats[`${stat.key}_ap` as keyof GameStats] as number}
              autoPart={stats[`${stat.key}_auto` as keyof GameStats] as number}
              ap={ap}
              onAllocate={handleAllocate}
            />
          ))}

          <View style={s.divider} />
          <View style={s.weaponRow}>
            <Text style={s.weaponLabel}>WEAPON</Text>
            <Text style={s.weaponVal}>— None equipped —</Text>
          </View>

          <View style={s.divider} />
          <View style={s.statsFooter}>
            <Text style={s.statsFooterItem}>Deaths: <Text style={s.statsFooterVal}>{deaths}</Text></Text>
            <Text style={s.statsFooterItem}>Quests cleared: <Text style={s.statsFooterVal}>{cleared}</Text></Text>
          </View>
        </View>

        {/* ── DUNGEON GATES ── */}
        <Text style={s.sectionHeading}>DUNGEON GATES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dungeonScroll}>
          <View style={s.dungeonRow}>
            {dungeons.map(d => (
              <DungeonCard
                key={d.id}
                dungeon={d}
                onEnter={() => { setSelectedDungeon(d); setDungeonPhase('entry'); }}
              />
            ))}
          </View>
        </ScrollView>

        {/* ── QUEST BOARD ── */}
        <Text style={s.sectionHeading}>QUEST BOARD</Text>
        {quests.length === 0 ? (
          <View style={s.emptyQuests}>
            <Text style={s.emptyQuestsTxt}>No active quests. Keep logging activities — the system is watching.</Text>
          </View>
        ) : (
          quests.map(q => (
            <QuestCard
              key={q.id}
              quest={q}
              onComplete={() => { completeQuest(q.id); reload(); }}
              onSkip={() => { skipQuest(q.id); reload(); }}
              onDelete={() => { deleteQuest(q.id); reload(); }}
            />
          ))
        )}

      </ScrollView>

      {/* ── DUNGEON MODALS ── */}
      {selectedDungeon && dungeonPhase === 'entry' && stats && (
        <DungeonEntryModal
          dungeon={selectedDungeon}
          stats={stats}
          onEnter={handleEnterDungeon}
          onClose={closeDungeon}
        />
      )}
      {selectedDungeon && dungeonPhase === 'result' && dungeonResult && (
        <DungeonResultModal
          dungeon={selectedDungeon}
          result={dungeonResult}
          onClose={closeDungeon}
        />
      )}

    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  ribbon: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ribbonIcon: { padding: 6 },
  ribbonTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: fonts.mono.bold, fontSize: fontSize.base,
    color: colors.primary, letterSpacing: 3,
  },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 },

  panel: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  levelBadge: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  levelTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1 },
  titleCol: { flex: 1, gap: 2 },
  jobTxt: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  rankTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  vitalsMini: { alignItems: 'flex-end', gap: 2 },
  vitalsRow: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  vitalsVal: { color: colors.textPrimary },

  fatigueBadge: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: spacing.sm,
  },
  fatigueTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: '#EF4444' },

  divider: { height: 1, backgroundColor: colors.border },
  sectionLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },

  weaponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weaponLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  weaponVal: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  statsFooter: { flexDirection: 'row', gap: spacing.lg },
  statsFooterItem: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  statsFooterVal: { color: colors.textPrimary },

  sectionHeading: {
    fontFamily: fonts.mono.bold, fontSize: fontSize.sm,
    color: colors.primary, letterSpacing: 2, marginTop: spacing.sm,
  },
  dungeonScroll: { marginHorizontal: -spacing.lg },
  dungeonRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },

  emptyQuests: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  emptyQuestsTxt: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.sm,
    color: colors.textMuted, textAlign: 'center', lineHeight: 20,
  },
});
