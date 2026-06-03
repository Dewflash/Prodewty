import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { handleDeath, acknowledgeDeathIgnore, getRevivalQuests, completeRevivalQuest, type DeathCause, type RevivalQuest } from '../db/game';

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

export function DeathScreen({ cause, onResolve }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<'main' | 'revival'>('main');
  const [quests, setQuests] = useState<RevivalQuest[]>([]);

  useEffect(() => {
    if (cause) {
      handleDeath(cause);
      setPhase('main');
      setQuests(getRevivalQuests());
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  }, [cause]);

  if (!cause) return null;

  function handleIgnore() {
    acknowledgeDeathIgnore();
    onResolve();
  }

  function handleRevivalQuest(quest: RevivalQuest) {
    completeRevivalQuest(quest);
    onResolve();
  }

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[s.overlay, { opacity }]}>
        {phase === 'main' ? (
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

            <Pressable style={s.revivalBtn} onPress={() => setPhase('revival')}>
              <Text style={s.revivalTxt}>PERFORM REVIVAL QUEST</Text>
            </Pressable>

            <Pressable style={s.ignoreBtn} onPress={handleIgnore}>
              <Text style={s.ignoreTxt}>Ignore — continue without XP</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.content}>
            <Text style={s.revivalHeader}>REVIVAL QUESTS</Text>
            <Text style={s.revivalSub}>Complete one to restore HP and resume progress.</Text>
            <View style={s.divider} />

            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              {quests.map(q => (
                <Pressable key={q.id} style={s.questCard} onPress={() => handleRevivalQuest(q)}>
                  <View style={s.questTop}>
                    <Text style={s.questTitle}>{q.title}</Text>
                    <Text style={s.questHp}>+{q.hp_restore} HP</Text>
                  </View>
                  {q.description ? <Text style={s.questDesc}>{q.description}</Text> : null}
                  <Text style={s.questCat}>{q.category}</Text>
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

  youHave: { fontFamily: fonts.mono.regular, fontSize: fontSize.md, color: '#EF4444', letterSpacing: 6 },
  died: {
    fontFamily: fonts.mono.bold, fontSize: 72, color: '#EF4444', letterSpacing: 8,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20,
  },
  divider: { width: 120, height: 1, backgroundColor: '#EF4444', opacity: 0.4 },
  cause: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  penaltyBox: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: radius.md, padding: spacing.md, gap: 4,
  },
  penaltyTitle: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: '#EF4444', letterSpacing: 2, marginBottom: 2 },
  penaltyLine: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  revivalBtn: {
    width: '100%', borderWidth: 1, borderColor: '#EF4444', borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  revivalTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: '#EF4444', letterSpacing: 2 },

  ignoreBtn: { paddingVertical: spacing.sm },
  ignoreTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  // Revival quest list
  revivalHeader: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: '#EF4444', letterSpacing: 3 },
  revivalSub: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  questCard: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm,
  },
  questTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  questHp: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },
  questDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  questCat: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },

  noQuests: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  backBtn: { paddingVertical: spacing.sm },
  backTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
