import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { Feather } from '@expo/vector-icons';
import {
  handleDeath, acknowledgeDeathIgnore, getRevivalQuests, completeRevivalQuest,
  type DeathCause, type RevivalQuest,
} from '../db/game';
import { getRPGState } from '../db/rpg';
import { getHealthState } from '../db/health';

type Phase = 'main' | 'list' | 'entry' | 'active' | 'done';

type StatBar = 'emotional' | 'physical' | 'mental';
const STAT_ICON: Record<StatBar, React.ComponentProps<typeof Feather>['name']> = {
  emotional: 'activity', physical: 'zap', mental: 'cpu',
};
const STAT_COLOR: Record<StatBar, string> = {
  emotional: '#F87171', physical: '#2563EB', mental: '#D97706',
};

type Props = {
  cause: DeathCause;
  onResolve: () => void;
};

const CAUSE_TEXT: Record<NonNullable<DeathCause>, string> = {
  hp:        'Your HP reached zero.',
  emotional: 'Emotional exhaustion consumed you.',
  physical:  'Physical depletion brought you down.',
  mental:    'Mental fatigue shattered your will.',
};

function fmtTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DeathScreen({ cause, onResolve }: Props) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const [phase,  setPhase]  = useState<Phase>('main');
  const [quests, setQuests] = useState<RevivalQuest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<RevivalQuest | null>(null);
  const [timerSecs, setTimerSecs] = useState(0);
  const [restoredBars, setRestoredBars] = useState<StatBar[]>([]);
  const [wasHPDeath,   setWasHPDeath]   = useState(false);

  useEffect(() => {
    if (cause) {
      handleDeath(cause);
      setPhase('main');
      setSelectedQuest(null);
      setTimerSecs(0);
      setQuests(getRevivalQuests());
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  }, [cause]);

  // Countdown
  useEffect(() => {
    if (phase !== 'active' || timerSecs <= 0) return;
    const t = setTimeout(() => setTimerSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timerSecs]);

  if (!cause) return null;

  function handleIgnore() {
    acknowledgeDeathIgnore();
    onResolve();
  }

  function handleSelectQuest(quest: RevivalQuest) {
    setSelectedQuest(quest);
    setPhase('entry');
  }

  function handleStartTimer() {
    if (!selectedQuest) return;
    setTimerSecs((selectedQuest.duration_mins ?? 10) * 60);
    setPhase('active');
  }

  function handleSubmitRevival() {
    if (!selectedQuest) return;
    try {
      const rpg    = getRPGState();
      const health = getHealthState();
      const hpDeath = (rpg.hp ?? 100) <= 0;
      setWasHPDeath(hpDeath);
      if (!hpDeath) {
        const bars: StatBar[] = [];
        if (health.emotional <= 0) bars.push('emotional');
        if (health.physical  <= 0) bars.push('physical');
        if (health.mental    <= 0) bars.push('mental');
        setRestoredBars(bars);
      }
    } catch {}
    completeRevivalQuest(selectedQuest);
    setPhase('done');
  }

  function handleAbandon() {
    setPhase('list');
    setSelectedQuest(null);
    setTimerSecs(0);
  }

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[s.overlay, { opacity }]}>

        {/* ── MAIN death screen ── */}
        {phase === 'main' && (
          <View style={s.content}>
            <Text style={s.youHave}>YOU HAVE</Text>
            <Text style={s.died}>DIED</Text>
            <View style={s.divider} />
            <Text style={s.cause}>{CAUSE_TEXT[cause]}</Text>

            <View style={s.penaltyBox}>
              <Text style={s.penaltyTitle}>DEATH PENALTY</Text>
              <Text style={s.penaltyLine}>HP set to 0. XP gains suspended.</Text>
              <Text style={s.penaltyLine}>All spending limits are now cut.</Text>
              <Text style={s.penaltyLine}>Consequences to be determined.</Text>
            </View>

            <Pressable style={s.revivalBtn} onPress={() => setPhase('list')}>
              <Text style={s.revivalTxt}>PERFORM REVIVAL QUEST</Text>
            </Pressable>

            <Pressable style={s.ignoreBtn} onPress={handleIgnore}>
              <Text style={s.ignoreTxt}>Ignore — continue without XP</Text>
            </Pressable>
          </View>
        )}

        {/* ── QUEST LIST ── */}
        {phase === 'list' && (
          <View style={s.content}>
            <Text style={s.revivalHeader}>REVIVAL QUESTS</Text>
            <Text style={s.revivalSub}>Select a quest to begin the timer.</Text>
            <View style={s.divider} />

            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              {quests.map(q => (
                <Pressable key={q.id} style={s.questCard} onPress={() => handleSelectQuest(q)}>
                  <View style={s.questTop}>
                    <Text style={s.questTitle}>{q.title}</Text>
                    <Text style={s.questHp}>+{q.hp_restore} HP</Text>
                  </View>
                  {q.description ? <Text style={s.questDesc}>{q.description}</Text> : null}
                  <View style={s.questMeta}>
                    <Text style={s.questCat}>{q.category}</Text>
                    <Text style={s.questDur}>{q.duration_mins ?? 10} min</Text>
                  </View>
                </Pressable>
              ))}
              {quests.length === 0 && (
                <Text style={s.noQuests}>No revival quests available.</Text>
              )}
            </ScrollView>

            <Pressable style={s.backBtn} onPress={() => setPhase('main')}>
              <Text style={s.backTxt}>Back</Text>
            </Pressable>
          </View>
        )}

        {/* ── ENTRY overlay (same layout as dungeon entry, red accent) ── */}
        {phase === 'entry' && selectedQuest && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Text style={s.panelRank}>REVIVAL QUEST</Text>
              <Pressable onPress={() => { setPhase('list'); setSelectedQuest(null); }}>
                <Text style={s.closeTxt}>✕</Text>
              </Pressable>
            </View>

            <Text style={s.panelName}>{selectedQuest.title}</Text>
            <Text style={s.panelStat}>{selectedQuest.category} · {selectedQuest.duration_mins ?? 10} min</Text>

            <View style={s.panelDiv} />
            <Text style={s.panelFieldLabel}>OBJECTIVE</Text>
            <Text style={s.panelFieldVal}>{selectedQuest.description}</Text>

            <Text style={s.panelFieldLabel}>CLEAR CONDITION</Text>
            <Text style={s.panelFieldVal}>Submit clear before the timer runs out.</Text>

            <Text style={s.panelFieldLabel}>REWARD</Text>
            <Text style={[s.panelFieldVal, { color: colors.success }]}>
              {(() => {
                try {
                  const rpg = getRPGState();
                  return (rpg.hp ?? 100) <= 0
                    ? `+${selectedQuest.hp_restore} HP restored`
                    : `+${selectedQuest.hp_restore}% to depleted health stat(s)`;
                } catch { return `Revival: +${selectedQuest.hp_restore}`; }
              })()}
            </Text>

            <View style={s.panelDiv} />
            <Text style={s.timerStatic}>{fmtTimer((selectedQuest.duration_mins ?? 10) * 60)}</Text>
            <Text style={s.timerHint}>Time limit</Text>

            <Pressable onPress={handleStartTimer} style={[s.primaryBtn, { borderColor: colors.danger }]}>
              <Text style={[s.primaryBtnTxt, { color: colors.danger }]}>START TIMER</Text>
            </Pressable>
          </View>
        )}

        {/* ── ACTIVE TIMER ── */}
        {phase === 'active' && selectedQuest && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Text style={s.panelRank}>REVIVAL QUEST</Text>
            </View>
            <Text style={s.panelName}>{selectedQuest.title}</Text>

            <View style={s.panelDiv} />
            <Text style={s.timerLabel}>TIME REMAINING</Text>
            <Text style={[s.timerBig, timerSecs <= 60 && { color: colors.danger }]}>
              {fmtTimer(timerSecs)}
            </Text>

            <Text style={s.panelFieldLabel}>OBJECTIVE</Text>
            <Text style={s.panelFieldVal}>{selectedQuest.description}</Text>

            <View style={s.panelDiv} />

            <Pressable onPress={handleSubmitRevival} style={[s.primaryBtn, { borderColor: colors.success }]}>
              <Text style={[s.primaryBtnTxt, { color: colors.success }]}>SUBMIT CLEAR</Text>
            </Pressable>

            <Pressable onPress={handleAbandon} style={[s.primaryBtn, { borderColor: colors.border, marginTop: -spacing.sm }]}>
              <Text style={[s.primaryBtnTxt, { color: colors.textMuted }]}>ABANDON</Text>
            </Pressable>
          </View>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && selectedQuest && (
          <View style={s.panel}>
            <Text style={[s.panelRank, { color: colors.success, letterSpacing: 3 }]}>REVIVAL COMPLETE</Text>
            <Text style={s.panelName}>{selectedQuest.title}</Text>
            <View style={s.panelDiv} />

            {wasHPDeath ? (
              <Text style={[s.panelFieldVal, { color: colors.success, textAlign: 'center' }]}>
                +{selectedQuest.hp_restore} HP restored
              </Text>
            ) : (
              restoredBars.length === 0 ? (
                <Text style={[s.panelFieldVal, { color: colors.textMuted, textAlign: 'center' }]}>
                  No stats were at 0 — no restoration applied.
                </Text>
              ) : (
                restoredBars.map(bar => (
                  <View key={bar} style={s.restoredRow}>
                    <Feather name={STAT_ICON[bar]} size={14} color={STAT_COLOR[bar]} />
                    <Text style={[s.panelFieldVal, { color: STAT_COLOR[bar] }]}>
                      {bar.charAt(0).toUpperCase() + bar.slice(1)} restored to {selectedQuest.hp_restore}%
                    </Text>
                  </View>
                ))
              )
            )}

            <Text style={[s.panelFieldVal, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
              XP earnings and spending are restored.
            </Text>

            <Pressable onPress={onResolve} style={[s.primaryBtn, { borderColor: colors.success, marginTop: spacing.md }]}>
              <Text style={[s.primaryBtnTxt, { color: colors.success }]}>CONTINUE</Text>
            </Pressable>
          </View>
        )}

      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.97)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  content: { alignItems: 'center', gap: spacing.lg, width: '100%', maxWidth: 360 },

  youHave: { fontFamily: fonts.mono.regular, fontSize: fontSize.md, color: colors.danger, letterSpacing: 6 },
  died: {
    fontFamily: fonts.mono.bold, fontSize: 72, color: colors.danger, letterSpacing: 8,
    shadowColor: colors.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20,
  },
  divider: { width: 120, height: 1, backgroundColor: colors.danger, opacity: 0.4 },
  cause: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  penaltyBox: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: radius.md, padding: spacing.md, gap: 4,
  },
  penaltyTitle: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger, letterSpacing: 2, marginBottom: 2 },
  penaltyLine:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  revivalBtn: {
    width: '100%', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  revivalTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.danger, letterSpacing: 2 },

  ignoreBtn: { paddingVertical: spacing.sm },
  ignoreTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  revivalHeader: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.danger, letterSpacing: 3 },
  revivalSub:    { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  questCard: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm,
  },
  questTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle:{ fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  questHp:   { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },
  questDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  questMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  questCat:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  questDur:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  noQuests:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  backBtn: { paddingVertical: spacing.sm },
  backTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  // Overlay panel (entry/active/done) — mirrors dungeon overlay
  panel: {
    width: '100%', maxWidth: 360,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    padding: spacing.lg, gap: spacing.md,
  },
  panelHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(239,68,68,0.25)', paddingBottom: spacing.sm },
  panelRank:       { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger, letterSpacing: 2 },
  closeTxt:        { fontFamily: fonts.mono.regular, fontSize: fontSize.base, color: colors.textMuted, paddingHorizontal: 4 },
  panelName:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  panelStat:       { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted },
  panelDiv:        { height: 1, backgroundColor: colors.border },
  panelFieldLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  panelFieldVal:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },

  timerStatic: { fontFamily: fonts.mono.bold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 4 },
  timerHint:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', letterSpacing: 1 },
  timerLabel:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, textAlign: 'center' },
  timerBig:    { fontFamily: fonts.mono.bold, fontSize: 64, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },

  primaryBtn:    { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  primaryBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },
  restoredRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'center' },
});
