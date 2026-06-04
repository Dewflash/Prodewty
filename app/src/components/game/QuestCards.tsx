import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import type { Quest } from '../../db/game';

export function PendingQuestCard({ quest, onAccept, onHide }: {
  quest: Quest; onAccept: () => void; onHide: () => void;
}) {
  return (
    <View style={qc.card}>
      <View style={qc.header}>
        <View style={qc.tag}><Text style={qc.tagTxt}>DAILY QUEST</Text></View>
        <Pressable onPress={onHide}><Feather name="x" size={14} color={colors.textMuted} /></Pressable>
      </View>
      <Text style={qc.title}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
      <View style={qc.footer}>
        <Text style={qc.reward}>+{quest.coin_reward} coins · +30 XP</Text>
        <Pressable onPress={onAccept} style={qc.acceptBtn}>
          <Text style={qc.acceptTxt}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AcceptedQuestCard({ quest, onComplete, onHide }: {
  quest: Quest; onComplete: () => void; onHide: () => void;
}) {
  return (
    <View style={[qc.card, qc.cardActive]}>
      <View style={qc.header}>
        <View style={[qc.tag, { borderColor: colors.success }]}>
          <View style={qc.activeDot} />
          <Text style={[qc.tagTxt, { color: colors.success }]}>ACTIVE</Text>
        </View>
        <Pressable onPress={onHide}><Feather name="x" size={14} color={colors.textMuted} /></Pressable>
      </View>
      <Text style={qc.title}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
      <View style={qc.footer}>
        <Text style={qc.reward}>+{quest.coin_reward} coins · +30 XP</Text>
        <Pressable onPress={onComplete} style={qc.completeBtn}>
          <Text style={qc.completeTxt}>Complete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HiddenQuestCard({ quest, onReinstate }: { quest: Quest; onReinstate: () => void }) {
  return (
    <View style={qc.hiddenCard}>
      <View style={qc.hiddenRow}>
        <View style={{ flex: 1 }}>
          <Text style={qc.hiddenTitle}>{quest.title}</Text>
          <Text style={qc.hiddenHint}>Hidden today · reappears tomorrow</Text>
        </View>
        <Pressable onPress={onReinstate} style={qc.reinstateBtn}>
          <Text style={qc.reinstateTxt}>Reinstate</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CompletedQuestCard({ quest }: { quest: Quest }) {
  return (
    <View style={qc.completedCard}>
      <View style={qc.header}>
        <View style={[qc.tag, { borderColor: colors.textMuted }]}>
          <Text style={[qc.tagTxt, { color: colors.textMuted }]}>COMPLETED</Text>
        </View>
      </View>
      <Text style={qc.completedTitle}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
    </View>
  );
}

const qc = StyleSheet.create({
  card:         { backgroundColor: 'rgba(56,189,248,0.04)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', gap: spacing.sm },
  cardActive:   { borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.04)' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  tagTxt:       { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.primary, letterSpacing: 1 },
  activeDot:    { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  title:        { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  desc:         { fontFamily: fonts.ui.regular,  fontSize: fontSize.sm,   color: colors.textMuted },
  footer:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reward:       { fontFamily: fonts.mono.bold,   fontSize: fontSize.xs,   color: colors.success },
  acceptBtn:    { backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 5 },
  acceptTxt:    { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs,   color: colors.primary },
  completeBtn:  { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 5 },
  completeTxt:  { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs,   color: colors.bg },
  hiddenCard:   { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm + 4, borderWidth: 1, borderColor: colors.border },
  hiddenRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hiddenTitle:  { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm, color: colors.textMuted, opacity: 0.55 },
  hiddenHint:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.border,    opacity: 0.55 },
  reinstateBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  reinstateTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.primary },
  completedCard:  { backgroundColor: 'rgba(52,211,153,0.03)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(52,211,153,0.12)', gap: 4 },
  completedTitle: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
