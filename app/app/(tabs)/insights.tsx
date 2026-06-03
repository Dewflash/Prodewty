import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { TopRibbon } from '../../src/components/TopRibbon';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { Feather } from '@expo/vector-icons';
import {
  getHealthState, getRestorativeActivities, addRestorativeActivity,
  applyHealthDecay, purchaseRestoration,
  type HealthState, type RestorativeActivity,
} from '../../src/db/health';
import { getRPGState, type RPGState } from '../../src/db/rpg';
import { db } from '../../src/db/schema';
import { triggerCurrencyRefresh } from '../../src/db/currencySignal';

type WeeklyStatRow = { avg: number | null; min: number | null; max: number | null };
type WeeklyHealthStats = { emotional: WeeklyStatRow; physical: WeeklyStatRow; mental: WeeklyStatRow };

function statScoreColor(v: number | null): { color: string } {
  if (v === null) return { color: colors.textMuted };
  if (v < 3)  return { color: '#F87171' }; // bright red
  if (v < 7)  return { color: '#FBBF24' }; // yellow
  return           { color: '#34D399' };   // green
}

function getWeeklyHealthStats(): WeeklyHealthStats {
  try {
    const row = db.getFirstSync<{
      mood_avg: number | null; mood_min: number | null; mood_max: number | null;
      energy_avg: number | null; energy_min: number | null; energy_max: number | null;
      prod_avg: number | null; prod_min: number | null; prod_max: number | null;
    }>(
      `SELECT
         ROUND(AVG(mood_rating),1) as mood_avg, MIN(mood_rating) as mood_min, MAX(mood_rating) as mood_max,
         ROUND(AVG(energy_rating),1) as energy_avg, MIN(energy_rating) as energy_min, MAX(energy_rating) as energy_max,
         ROUND(AVG(productivity_rating),1) as prod_avg, MIN(productivity_rating) as prod_min, MAX(productivity_rating) as prod_max
       FROM activity_logs
       WHERE entry_type = 'mood'
         AND log_date >= date('now', '-7 days')
         AND mood_rating > 0`,
    );
    return {
      emotional: { avg: row?.mood_avg ?? null,   min: row?.mood_min ?? null,   max: row?.mood_max ?? null },
      physical:  { avg: row?.energy_avg ?? null, min: row?.energy_min ?? null, max: row?.energy_max ?? null },
      mental:    { avg: row?.prod_avg ?? null,   min: row?.prod_min ?? null,   max: row?.prod_max ?? null },
    };
  } catch {
    return {
      emotional: { avg: null, min: null, max: null },
      physical:  { avg: null, min: null, max: null },
      mental:    { avg: null, min: null, max: null },
    };
  }
}

// ─── Health bar ───────────────────────────────────────────────────────────────

type StatBarConfig = { label: string; icon: React.ComponentProps<typeof Feather>['name']; baseColor: string };

const STAT_BAR_CONFIG: Record<string, StatBarConfig> = {
  Emotional: { label: 'Emotional', icon: 'activity', baseColor: colors.statEmotional },
  Physical:  { label: 'Physical',  icon: 'zap',      baseColor: colors.statPhysical  },
  Mental:    { label: 'Mental',    icon: 'cpu',       baseColor: colors.statMental    },
};

function barStatus(v: number) {
  if (v >= 70) return 'Good';
  if (v >= 40) return 'Low';
  if (v > 0)   return 'Critical';
  return 'Depleted';
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value);
  const cfg = STAT_BAR_CONFIG[label] ?? { icon: 'heart', baseColor: colors.success };
  const col = cfg.baseColor;
  return (
    <View style={hb.container}>
      <View style={hb.header}>
        <Feather name={cfg.icon} size={14} color={col} />
        <Text style={[hb.label, { color: col }]}>{label}</Text>
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
  label: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, flex: 1 },
  status: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs },
  pct: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, minWidth: 36, textAlign: 'right' },
  track: { height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
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
  const [infoModal, setInfoModal] = useState(false);
  const [snapshotInfoModal, setSnapshotInfoModal] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyHealthStats | null>(null);

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
    setWeeklyStats(getWeeklyHealthStats());
  }

  useFocusEffect(useCallback(() => { reload(); }, []));

  function handleBuy(activityId: number) {
    const result = purchaseRestoration(activityId);
    if (result === 'insufficient_xp') {
      Alert.alert('Not enough XP', 'Earn more XP by logging activities.');
      return;
    }
    reload();
    triggerCurrencyRefresh();
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
  const penalty = minBar <= 0 ? '−50% XP (Depleted)'
    : minBar < 10 ? '−35% XP (Critical)'
    : minBar < 20 ? '−25% XP (Danger)'
    : minBar < 50 ? '−15% XP (Weakened)'
    : minBar < 70 ? '−5% XP (Recovering)'
    : null;

  return (
    <SwipeNavWrapper currentIndex={3}>
    <SafeAreaView style={s.safe}>
      <TopRibbon title="Recharge" />
      <ScrollView contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.heading}>Recharge</Text>
          <TouchableOpacity onPress={() => setInfoModal(true)} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="info" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
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

        {/* 7-day rolling stats */}
        {weeklyStats && (
          <View style={s.weeklyCard}>
            <View style={s.weeklyHeaderRow}>
              <Text style={s.weeklyTitle}>7-DAY SNAPSHOT</Text>
              <TouchableOpacity onPress={() => setSnapshotInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="info" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {([
              { label: 'Emotional', key: 'emotional' as const, color: colors.statEmotional },
              { label: 'Physical',  key: 'physical'  as const, color: colors.statPhysical  },
              { label: 'Mental',    key: 'mental'    as const, color: colors.statMental    },
            ]).map(({ label, key, color }) => {
              const st = weeklyStats[key];
              return (
                <View key={key} style={s.weeklyRow}>
                  <Text style={[s.weeklyLabel, { color }]}>{label}</Text>
                  <Text style={s.weeklyStat}>low <Text style={[s.weeklyNum, statScoreColor(st.min)]}>{st.min ?? '—'}</Text></Text>
                  <Text style={s.weeklyStat}>avg <Text style={[s.weeklyNum, statScoreColor(st.avg)]}>{st.avg ?? '—'}</Text></Text>
                  <Text style={s.weeklyStat}>high <Text style={[s.weeklyNum, statScoreColor(st.max)]}>{st.max ?? '—'}</Text></Text>
                </View>
              );
            })}
          </View>
        )}

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

      {/* Decay info modal */}
      <Modal visible={infoModal} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setInfoModal(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.infoSheetTitle}>How Recharge Works</Text>
            <View style={s.infoDivider} />
            <Text style={s.infoSheetText}>Bars deplete −8%/day. Missing physical/recreational/any activity adds −5% extra per category.</Text>
            <Text style={s.infoSheetText}>Logging a physical activity restores +5% Physical. Recreational restores +5% Mental.</Text>
            <Text style={s.infoSheetText}>Hitting 0 triggers death state: XP blocked, game penalised.</Text>
            <View style={s.infoDivider} />
            <Text style={[s.infoSheetText, { fontFamily: fonts.ui.semibold, color: colors.textPrimary }]}>XP Penalty Tiers (lowest bar)</Text>
            <Text style={s.infoSheetText}>≥70% — No penalty (Stable/Peak)</Text>
            <Text style={s.infoSheetText}>50–70% — −5% XP (Recovering)</Text>
            <Text style={s.infoSheetText}>20–50% — −15% XP (Weakened)</Text>
            <Text style={s.infoSheetText}>10–20% — −25% XP (Danger)</Text>
            <Text style={s.infoSheetText}>&lt;10% — −35% XP (Critical)</Text>
            <Text style={s.infoSheetText}>0% — −50% XP (Depleted)</Text>
            <View style={s.infoDivider} />
            <Text style={[s.infoSheetText, { fontFamily: fonts.ui.semibold, color: colors.textPrimary }]}>HP Effect (per day)</Text>
            <Text style={s.infoSheetText}>&lt;30% — HP falls (−2 to −10 HP/day)</Text>
            <Text style={s.infoSheetText}>30–50% — Neutral</Text>
            <Text style={s.infoSheetText}>50–70% — HP +2/day</Text>
            <Text style={s.infoSheetText}>70%+ — HP +5/day</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Snapshot info modal */}
      <Modal visible={snapshotInfoModal} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setSnapshotInfoModal(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.infoSheetTitle}>7-Day Snapshot — How to read</Text>
            <View style={s.infoDivider} />
            <Text style={s.infoSheetText}>Shows low / avg / high from your mood, energy and productivity scores over the past 7 days.</Text>
            <Text style={s.infoSheetText}>Emotional = mood score · Physical = energy score · Mental = productivity score</Text>
            <Text style={[s.infoSheetText, { color: '#F87171' }]}>Red (1–3): critically low</Text>
            <Text style={[s.infoSheetText, { color: '#FBBF24' }]}>Yellow (4–6): moderate</Text>
            <Text style={[s.infoSheetText, { color: '#34D399' }]}>Green (7–10): healthy</Text>
          </Pressable>
        </Pressable>
      </Modal>

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
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

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

  infoBtn: { padding: 2 },

  weeklyCard:  { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  weeklyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weeklyTitle: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, flex: 1 },
  weeklyRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weeklyLabel: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, width: 72 },
  weeklyStat:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1, textAlign: 'right' },
  weeklyNum:   { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textPrimary },
  weeklyHint:  { fontFamily: fonts.ui.regular, fontSize: 10, color: colors.border, marginTop: 2 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  infoSheet:    { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  handle:       { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  infoSheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  infoDivider:    { height: 1, backgroundColor: colors.border },
  infoSheetText:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

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
