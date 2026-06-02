import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { TopRibbon } from '../../src/components/TopRibbon';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import {
  getHealthState, getRestorativeActivities, addRestorativeActivity,
  applyHealthDecay, purchaseRestoration,
  type HealthState, type RestorativeActivity,
} from '../../src/db/health';
import { getRPGState, type RPGState } from '../../src/db/rpg';

// ─── Health bar ───────────────────────────────────────────────────────────────

function barColor(v: number) {
  if (v >= 70) return colors.success;
  if (v >= 40) return '#FBBF24';
  return colors.danger;
}

function barStatus(v: number) {
  if (v >= 70) return 'Good';
  if (v >= 40) return 'Low';
  if (v > 0)   return 'Critical';
  return 'Depleted';
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value);
  const col = barColor(value);
  return (
    <View style={hb.container}>
      <View style={hb.header}>
        <Text style={hb.label}>{label}</Text>
        <Text style={[hb.status, { color: col }]}>{barStatus(value)}</Text>
        <Text style={[hb.pct, { color: col }]}>{pct}%</Text>
      </View>
      <View style={hb.track}>
        <View style={[hb.fill, { width: `${pct}%` as any, backgroundColor: col }]} />
      </View>
    </View>
  );
}

const hb = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  status: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs },
  pct: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, minWidth: 36, textAlign: 'right' },
  track: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});

// ─── Activity card ────────────────────────────────────────────────────────────

function RestoreCard({
  activity, xp, onBuy,
}: {
  activity: RestorativeActivity; xp: number; onBuy: () => void;
}) {
  const restoreLines = [
    activity.emotional_restore > 0 && `+${activity.emotional_restore}% Emotional`,
    activity.physical_restore  > 0 && `+${activity.physical_restore}% Physical`,
    activity.mental_restore    > 0 && `+${activity.mental_restore}% Mental`,
  ].filter(Boolean).join('   ');

  const canAfford = xp >= activity.xp_cost;

  return (
    <View style={rc.card}>
      <View style={rc.info}>
        <Text style={rc.name}>{activity.name}</Text>
        {activity.description && <Text style={rc.desc}>{activity.description}</Text>}
        <Text style={rc.restores}>{restoreLines}</Text>
      </View>
      <View style={rc.right}>
        <Text style={[rc.cost, !canAfford && rc.costLow]}>{activity.xp_cost} XP</Text>
        <Pressable
          onPress={canAfford ? onBuy : undefined}
          style={[rc.btn, !canAfford && rc.btnDisabled]}
        >
          <Text style={rc.btnText}>Restore</Text>
        </Pressable>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center',
  },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  desc: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  restores: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.primary },
  right: { alignItems: 'flex-end', gap: spacing.sm },
  cost: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },
  costLow: { color: colors.textMuted },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  btnDisabled: { backgroundColor: colors.border },
  btnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, color: colors.bg },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RechargeScreen() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [rpg, setRpg] = useState<RPGState | null>(null);
  const [activities, setActivities] = useState<RestorativeActivity[]>([]);
  const [addModal, setAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState('50');
  const [newEmotional, setNewEmotional] = useState('0');
  const [newPhysical, setNewPhysical] = useState('0');
  const [newMental, setNewMental] = useState('0');

  function reload() {
    applyHealthDecay();
    setHealth(getHealthState());
    setRpg(getRPGState());
    setActivities(getRestorativeActivities());
  }

  useFocusEffect(useCallback(() => { reload(); }, []));

  function handleBuy(activityId: number) {
    const result = purchaseRestoration(activityId);
    if (result === 'insufficient_xp') {
      Alert.alert('Not enough XP', 'Earn more XP by logging activities.');
      return;
    }
    reload();
  }

  function handleAddCustom() {
    if (!newName.trim()) return;
    addRestorativeActivity(
      newName, newDesc,
      parseInt(newCost, 10) || 50,
      parseFloat(newEmotional) || 0,
      parseFloat(newPhysical) || 0,
      parseFloat(newMental) || 0,
    );
    setNewName(''); setNewDesc(''); setNewCost('50');
    setNewEmotional('0'); setNewPhysical('0'); setNewMental('0');
    setAddModal(false);
    reload();
  }

  const xp = rpg?.total_xp ?? 0;
  const minBar = health ? Math.min(health.emotional, health.physical, health.mental) : 100;
  const penalty = minBar <= 0 ? '−50%' : minBar < 30 ? '−25%' : minBar < 60 ? '−10%' : null;

  return (
    <SwipeNavWrapper currentIndex={3}>
    <SafeAreaView style={s.safe}>
      <TopRibbon title="Recharge" />
      <ScrollView contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.heading}>Recharge</Text>
          <View style={s.xpBadge}>
            <Text style={s.xpText}>{xp.toLocaleString()} XP</Text>
          </View>
        </View>

        {/* Health bars */}
        <View style={s.barsCard}>
          {health && (
            <>
              <HealthBar label="Emotional" value={health.emotional} />
              <View style={s.barDivider} />
              <HealthBar label="Physical"  value={health.physical}  />
              <View style={s.barDivider} />
              <HealthBar label="Mental"    value={health.mental}    />
            </>
          )}
        </View>

        {/* XP penalty warning */}
        {penalty && (
          <View style={s.warningCard}>
            <Text style={s.warningText}>
              Health is low — XP gain penalty {penalty}. Restore bars to recover.
            </Text>
          </View>
        )}

        {/* Decay info */}
        <View style={s.infoCard}>
          <Text style={s.infoText}>Bars deplete −8%/day automatically. Missing relevant activities adds −5% extra.</Text>
          <Text style={s.infoText}>Hitting 0 on any bar will reset your Game level when the Game phase launches.</Text>
        </View>

        {/* Restore section */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeading}>Restore</Text>
            <Pressable onPress={() => setAddModal(true)}>
              <Text style={s.addLink}>+ Custom</Text>
            </Pressable>
          </View>
          {activities.map(a => (
            <RestoreCard key={a.id} activity={a} xp={xp} onBuy={() => handleBuy(a.id)} />
          ))}
        </View>

      </ScrollView>

      {/* Add custom activity modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAvoid}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAddModal(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Custom Restorative Activity</Text>
            <TextInput style={s.input} placeholder="Name" placeholderTextColor={colors.textMuted}
              value={newName} onChangeText={setNewName} autoFocus />
            <TextInput style={s.input} placeholder="Description (optional)" placeholderTextColor={colors.textMuted}
              value={newDesc} onChangeText={setNewDesc} />
            <TextInput style={s.input} placeholder="XP cost" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={newCost} onChangeText={setNewCost} />
            <Text style={s.sheetSubLabel}>Restore amounts (%)</Text>
            <View style={s.restoreRow}>
              {[
                { label: 'Emotional', val: newEmotional, set: setNewEmotional },
                { label: 'Physical',  val: newPhysical,  set: setNewPhysical  },
                { label: 'Mental',    val: newMental,    set: setNewMental    },
              ].map(r => (
                <View key={r.label} style={s.restoreInput}>
                  <Text style={s.restoreLabel}>{r.label}</Text>
                  <TextInput style={s.restoreField} keyboardType="numeric"
                    value={r.val} onChangeText={r.set}
                    placeholderTextColor={colors.textMuted} placeholder="0" />
                </View>
              ))}
            </View>
            <Pressable onPress={handleAddCustom} style={s.addBtn}>
              <Text style={s.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  xpBadge: {
    borderWidth: 1, borderColor: colors.success, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  xpText: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },

  barsCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.lg, gap: spacing.md,
  },
  barDivider: { height: 1, backgroundColor: colors.border },

  warningCard: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, padding: spacing.md,
  },
  warningText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.danger },

  infoCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, gap: 4,
  },
  infoText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },

  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  addLink: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },

  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, paddingBottom: 40,
  },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sheetSubLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base,
    color: colors.textPrimary, backgroundColor: colors.bg,
  },
  restoreRow: { flexDirection: 'row', gap: spacing.sm },
  restoreInput: { flex: 1, gap: 4 },
  restoreLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  restoreField: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, fontFamily: fonts.mono.regular, fontSize: fontSize.sm,
    color: colors.textPrimary, backgroundColor: colors.bg, textAlign: 'center',
  },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  addBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
