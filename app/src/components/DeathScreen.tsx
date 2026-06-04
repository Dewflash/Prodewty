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
import { STAT_ICON, STAT_COLOR, STAT_LABEL, type StatKey } from '../constants/stats';
import { fmtTimer } from '../utils/format';

type Phase = 'main' | 'list' | 'entry' | 'active' | 'done';
type StatBar = StatKey;

type Props = { cause: DeathCause; onResolve: () => void };

const CAUSE_TEXT: Record<NonNullable<DeathCause>, string> = {
  hp:        'Your HP reached zero.',
  emotional: 'Emotional exhaustion consumed you.',
  physical:  'Physical depletion brought you down.',
  mental:    'Mental fatigue shattered your will.',
};

export function DeathScreen({ cause, onResolve }: Props) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [phase,         setPhase]         = useState<Phase>('main');
  const [quests,        setQuests]        = useState<RevivalQuest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<RevivalQuest | null>(null);
  const [timerSecs,     setTimerSecs]     = useState(0);

  // Death state — read once when quests load, used across all phases
  const [isHPDead,       setIsHPDead]       = useState(false);
  const [zeroHealthBars, setZeroHealthBars] = useState<StatBar[]>([]);

  // What was actually restored (read before completeRevivalQuest runs)
  const [didRestoreHP,   setDidRestoreHP]   = useState(false);
  const [restoredBars,   setRestoredBars]   = useState<StatBar[]>([]);

  useEffect(() => {
    if (!cause) return;
    handleDeath(cause);
    setPhase('main');
    setSelectedQuest(null);
    setTimerSecs(0);
    setQuests(getRevivalQuests());
    // Snapshot current death state for reward previews
    try {
      const rpg    = getRPGState();
      const health = getHealthState();
      const hpDead = (rpg.hp ?? 100) <= 0;
      setIsHPDead(hpDead);
      const bars: StatBar[] = [];
      if (health.emotional <= 0) bars.push('emotional');
      if (health.physical  <= 0) bars.push('physical');
      if (health.mental    <= 0) bars.push('mental');
      setZeroHealthBars(bars);
    } catch {}
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start(() =>
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start(),
    );
  }, [cause]);

  // Countdown
  useEffect(() => {
    if (phase !== 'active' || timerSecs <= 0) return;
    const t = setTimeout(() => setTimerSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timerSecs]);

  if (!cause) return null;

  // Inline reward chips for quest list cards — icon + value per restorable stat
  function RewardChips({ q }: { q: RevivalQuest }) {
    return (
      <View style={s.rewardChips}>
        {isHPDead && (
          <View style={s.rewardChip}>
            <Feather name="heart" size={11} color={colors.success} />
            <Text style={[s.rewardChipTxt, { color: colors.success }]}>+{q.hp_restore}</Text>
          </View>
        )}
        {zeroHealthBars.map(bar => (
          <View key={bar} style={s.rewardChip}>
            <Feather name={STAT_ICON[bar]} size={11} color={STAT_COLOR[bar]} />
            <Text style={[s.rewardChipTxt, { color: STAT_COLOR[bar] }]}>+{q.hp_restore}%</Text>
          </View>
        ))}
      </View>
    );
  }

  function handleIgnore() { acknowledgeDeathIgnore(); onResolve(); }

  function handleSelectQuest(quest: RevivalQuest) { setSelectedQuest(quest); setPhase('entry'); }

  function handleStartTimer() {
    if (!selectedQuest) return;
    setTimerSecs((selectedQuest.duration_mins ?? 10) * 60);
    setPhase('active');
  }

  function handleSubmitRevival() {
    if (!selectedQuest) return;
    // Capture state BEFORE restoration (completeRevivalQuest modifies DB)
    try {
      const rpg    = getRPGState();
      const health = getHealthState();
      setDidRestoreHP((rpg.hp ?? 100) <= 0);
      const bars: StatBar[] = [];
      if (health.emotional <= 0) bars.push('emotional');
      if (health.physical  <= 0) bars.push('physical');
      if (health.mental    <= 0) bars.push('mental');
      setRestoredBars(bars);
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
      <Animated.View style={[s.overlay, { opacity, transform: [{ translateX: shakeAnim }] }]}>

        {/* ── MAIN ── */}
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
            {/* Show what this revival will restore */}
            <View style={s.rewardBanner}>
              <Text style={s.rewardBannerLabel}>WILL RESTORE</Text>
              <Text style={s.rewardBannerVal}>
                {isHPDead && zeroHealthBars.length > 0
                  ? `HP + ${zeroHealthBars.map(b => STAT_LABEL[b]).join(', ')}`
                  : isHPDead
                  ? 'HP only'
                  : zeroHealthBars.length > 0
                  ? zeroHealthBars.map(b => STAT_LABEL[b]).join(' + ')
                  : 'Nothing (no stats at 0)'}
              </Text>
            </View>
            <View style={s.divider} />
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              {quests.map(q => (
                <Pressable key={q.id} style={s.questCard} onPress={() => handleSelectQuest(q)}>
                  <View style={s.questTop}>
                    <Text style={s.questTitle}>{q.title}</Text>
                    <RewardChips q={q} />
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

        {/* ── ENTRY ── */}
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
            <Text style={s.panelFieldLabel}>REWARD ON CLEAR</Text>
            {/* Show each restoration item separately with colour */}
            {isHPDead && (
              <Text style={[s.panelFieldVal, { color: colors.success }]}>
                +{selectedQuest.hp_restore} HP restored
              </Text>
            )}
            {zeroHealthBars.map(bar => (
              <View key={bar} style={s.rewardRow}>
                <Feather name={STAT_ICON[bar]} size={13} color={STAT_COLOR[bar]} />
                <Text style={[s.panelFieldVal, { color: STAT_COLOR[bar] }]}>
                  {STAT_LABEL[bar]} restored to {selectedQuest.hp_restore}%
                </Text>
              </View>
            ))}
            {!isHPDead && zeroHealthBars.length === 0 && (
              <Text style={[s.panelFieldVal, { color: colors.textMuted }]}>Nothing (no stats at 0)</Text>
            )}
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
            {/* HP restored */}
            {didRestoreHP && (
              <View style={s.restoredRow}>
                <Feather name="heart" size={14} color={colors.success} />
                <Text style={[s.panelFieldVal, { color: colors.success }]}>
                  +{selectedQuest.hp_restore} HP restored
                </Text>
              </View>
            )}
            {/* Health bars restored */}
            {restoredBars.map(bar => (
              <View key={bar} style={s.restoredRow}>
                <Feather name={STAT_ICON[bar]} size={14} color={STAT_COLOR[bar]} />
                <Text style={[s.panelFieldVal, { color: STAT_COLOR[bar] }]}>
                  {STAT_LABEL[bar]} restored to {selectedQuest.hp_restore}%
                </Text>
              </View>
            ))}
            {/* Nothing restored */}
            {!didRestoreHP && restoredBars.length === 0 && (
              <Text style={[s.panelFieldVal, { color: colors.textMuted, textAlign: 'center' }]}>
                No stats were at 0 — no restoration applied.
              </Text>
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
  divider:     { width: 120, height: 1, backgroundColor: colors.danger, opacity: 0.4 },
  cause:       { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  penaltyBox:   { width: '100%', backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: radius.md, padding: spacing.md, gap: 4 },
  penaltyTitle: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger, letterSpacing: 2, marginBottom: 2 },
  penaltyLine:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  revivalBtn: { width: '100%', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  revivalTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.danger, letterSpacing: 2 },
  ignoreBtn:  { paddingVertical: spacing.sm },
  ignoreTxt:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  revivalHeader: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.danger, letterSpacing: 3 },
  revivalSub:    { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  rewardBanner: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.sm, padding: spacing.sm, gap: 2, alignItems: 'center',
  },
  rewardBannerLabel: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 2 },
  rewardBannerVal:   { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },

  questCard:      { width: '100%', backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  questTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  questTitle:     { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  rewardChips:    { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 },
  rewardChip:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardChipTxt:  { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  questDesc:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  questMeta:   { flexDirection: 'row', justifyContent: 'space-between' },
  questCat:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  questDur:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  noQuests:    { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  backBtn: { paddingVertical: spacing.sm },
  backTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

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

  rewardRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  restoredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'center' },

  timerStatic: { fontFamily: fonts.mono.bold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 4 },
  timerHint:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', letterSpacing: 1 },
  timerLabel:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, textAlign: 'center' },
  timerBig:    { fontFamily: fonts.mono.bold, fontSize: 64, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },

  primaryBtn:    { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  primaryBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },
});
