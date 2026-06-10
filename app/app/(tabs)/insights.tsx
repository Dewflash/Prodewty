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
  getHealthState, getRestorativeActivities, addRestorativeActivity, deleteRestorativeActivity,
  getPastHistoryRestorativeActivities, applyHealthDecay, purchaseRestoration,
  type HealthState, type RestorativeActivity,
} from '../../src/db/health';
import { getRPGState, type RPGState } from '../../src/db/rpg';
import { db } from '../../src/db/schema';
import { triggerCurrencyRefresh } from '../../src/db/currencySignal';
import { STAT_ICON, STAT_COLOR } from '../../src/constants/stats';
import { playSound, switchBGM } from '../../src/services/audio';

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

// Map capitalised label to shared stat key (insights uses 'Emotional' as key, constants use 'emotional')
const LABEL_TO_KEY: Record<string, string> = {
  Emotional: 'emotional', Physical: 'physical', Mental: 'mental',
};

function barStatus(v: number) {
  if (v >= 70) return 'Good';
  if (v >= 40) return 'Low';
  if (v > 0)   return 'Critical';
  return 'Depleted';
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value);
  const key = LABEL_TO_KEY[label] ?? 'emotional';
  const col  = STAT_COLOR[key as keyof typeof STAT_COLOR] ?? colors.success;
  const icon = STAT_ICON[key as keyof typeof STAT_ICON] ?? 'heart';
  return (
    <View style={hb.container}>
      <View style={hb.header}>
        <Feather name={icon as any} size={14} color={col} />
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
  activity, xp, onBuy, onDelete,
}: {
  activity: RestorativeActivity; xp: number; onBuy: () => void; onDelete: () => void;
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[rc.cost, !canAfford && rc.costLow]}>{activity.xp_cost} XP</Text>
          <Pressable onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Feather name="trash-2" size={12} color={colors.danger} />
          </Pressable>
        </View>
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
  const [historyModal, setHistoryModal] = useState(false);
  const [pastActivities, setPastActivities] = useState<RestorativeActivity[]>([]);
  const [infoModal, setInfoModal] = useState(false);
  const [snapshotInfoModal, setSnapshotInfoModal] = useState(false);
  const [restoreInfoModal, setRestoreInfoModal] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyHealthStats | null>(null);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState('50');
  const [newEmotional, setNewEmotional] = useState('0');
  const [newPhysical, setNewPhysical] = useState('0');
  const [newMental, setNewMental] = useState('0');
  const [isStatDead, setIsStatDead] = useState(false);

  function reload() {
    applyHealthDecay();
    const h = getHealthState();
    setHealth(h);
    setRpg(getRPGState());
    setActivities(getRestorativeActivities());
    setWeeklyStats(getWeeklyHealthStats());
    // Block Recharge restore when a health stat is at 0 — must complete revival quest first
    setIsStatDead(h.emotional <= 0 || h.physical <= 0 || h.mental <= 0);
  }

  useFocusEffect(useCallback(() => { void switchBGM('recharge'); }, []));
  useFocusEffect(useCallback(() => { reload(); }, []));

  function handleBuy(activityId: number) {
    const result = purchaseRestoration(activityId);
    if (result === 'death_state') {
      Alert.alert('Revival required', 'Complete a Revival Quest before using Recharge.');
      return;
    }
    if (result === 'insufficient_xp') {
      Alert.alert('Not enough XP', 'Earn more XP by logging activities.');
      return;
    }
    playSound('restoreinrecharge');
    reload();
    triggerCurrencyRefresh();
  }

  function handleDelete(activity: RestorativeActivity) {
    const usedHint = activity.used === 1
      ? ` It's been used to restore before, so it'll move to Past Restore — viewable, but can't be selected again.`
      : '';
    Alert.alert('Remove restore activity?', `Remove "${activity.name}" from your active list.${usedHint}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteRestorativeActivity(activity.id);
        reload();
      }},
    ]);
  }

  function openPastHistory() {
    setPastActivities(getPastHistoryRestorativeActivities());
    setHistoryModal(true);
  }

  function handleAddCustom() {
    if (!newName.trim()) return;
    const cost = parseInt(newCost, 10) || 0;
    if (cost < 20) {
      Alert.alert('XP cost too low', 'Minimum XP cost for a restorative activity is 20.');
      return;
    }
    const emotional = parseFloat(newEmotional) || 0;
    const physical  = parseFloat(newPhysical)  || 0;
    const mental    = parseFloat(newMental)    || 0;
    if (emotional > 20 || physical > 20 || mental > 20) {
      Alert.alert('Restore amount too high', 'No single restore amount (Emotional/Physical/Mental) can exceed 20%.');
      return;
    }
    if (emotional + physical + mental > 50) {
      Alert.alert('Combined restore too high', 'Emotional + Physical + Mental restore combined cannot exceed 50% for one activity.');
      return;
    }
    addRestorativeActivity(newName, newDesc, cost, emotional, physical, mental);
    setNewName(''); setNewDesc(''); setNewCost('50');
    setNewEmotional('0'); setNewPhysical('0'); setNewMental('0');
    setAddModal(false);
    reload();
  }

  const xp = rpg?.spendable_xp ?? rpg?.total_xp ?? 0;
  const minBar = health ? Math.min(health.emotional, health.physical, health.mental) : 100;
  const penalty = minBar <= 0 ? '0.93× XP (Depleted)'
    : minBar < 10 ? '0.94× XP (Critical)'
    : minBar < 20 ? '0.95× XP (Danger)'
    : minBar < 30 ? '0.96× XP (Weakened)'
    : minBar < 50 ? '0.98× XP (Worn)'
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
            <TouchableOpacity onPress={() => setRestoreInfoModal(true)} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="info" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <Pressable onPress={openPastHistory} style={s.pastRestoreBtn}>
              <Feather name="archive" size={12} color={colors.textMuted} />
              <Text style={s.pastRestoreBtnText}>Past Restore</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            {!isStatDead && (
              <Pressable onPress={() => setAddModal(true)}>
                <Text style={s.addLink}>+ Custom</Text>
              </Pressable>
            )}
          </View>
          {isStatDead ? (
            <View style={s.revivalBlock}>
              <Feather name="alert-circle" size={20} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={s.revivalBlockTitle}>REVIVAL REQUIRED</Text>
                <Text style={s.revivalBlockDesc}>
                  A health bar has hit 0. Complete a Revival Quest from the Progress page before using Recharge.
                </Text>
              </View>
            </View>
          ) : (
            activities.map(a => (
              <RestoreCard key={a.id} activity={a} xp={xp} onBuy={() => handleBuy(a.id)} onDelete={() => handleDelete(a)} />
            ))
          )}
        </View>

      </ScrollView>

      {/* Decay info modal */}
      <Modal visible={infoModal} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setInfoModal(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.infoSheetTitle}>How Recharge Works</Text>
            <View style={s.infoDivider} />
            <Text style={s.infoSheetText}>Bars deplete −30%/day if you've logged an activity today, −20%/day if not.</Text>
            <Text style={s.infoSheetText}>Logging a physical activity restores +5% Physical. Recreational restores +5% Mental.</Text>
            <Text style={s.infoSheetText}>Hitting 0 triggers death state: XP blocked, game penalised.</Text>
            <View style={s.infoDivider} />
            <Text style={[s.infoSheetText, { fontFamily: fonts.ui.semibold, color: colors.textPrimary }]}>XP Multiplier Tiers (lowest bar)</Text>
            <Text style={s.infoSheetText}>≥90% — 1.03× (Peak)</Text>
            <Text style={s.infoSheetText}>70–90% — 1.02× (Strong)</Text>
            <Text style={s.infoSheetText}>50–70% — 1.01× (Stable)</Text>
            <Text style={s.infoSheetText}>30–50% — 0.98× (Worn)</Text>
            <Text style={s.infoSheetText}>20–30% — 0.96× (Weakened)</Text>
            <Text style={s.infoSheetText}>10–20% — 0.95× (Danger)</Text>
            <Text style={s.infoSheetText}>&lt;10% — 0.94× (Critical)</Text>
            <Text style={s.infoSheetText}>0% — 0.93× (Depleted)</Text>
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

      {/* Restore section info modal */}
      <Modal visible={restoreInfoModal} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setRestoreInfoModal(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.infoSheetTitle}>Restore — How it works</Text>
            <View style={s.infoDivider} />
            <Text style={s.infoSheetText}>Spend Spendable XP to restore your Emotional/Physical/Mental health bars. Build your own list — name it, describe it, and set both the XP cost and the restore amounts to whatever fits your real-life routine.</Text>
            <Text style={s.infoSheetText}>Minimum XP cost per activity is 20 — keeps restoration a deliberate trade-off, not a free top-up.</Text>
            <Text style={s.infoSheetText}>No single restore amount (Emotional/Physical/Mental) can exceed 20%, and the three combined can't exceed 50% — keeps any one custom activity from trivialising recovery.</Text>
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
            <Text style={s.restoreCapHint}>Max 20% per bar · combined max 50% · min XP cost 20</Text>
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

      {/* Past Restore history modal */}
      <Modal visible={historyModal} transparent animationType="fade">
        <Pressable style={s.historyOverlay} onPress={() => setHistoryModal(false)} />
        <View style={s.historySheet}>
          <Text style={s.sheetTitle}>Past Restore</Text>
          <Text style={s.sheetSubLabel}>Archived restore activities — viewable, can't be selected again.</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {pastActivities.length === 0 ? (
              <Text style={s.historyEmpty}>Nothing archived yet.</Text>
            ) : pastActivities.map(a => {
              const lines = [
                a.emotional_restore > 0 && `+${a.emotional_restore}% Emotional`,
                a.physical_restore  > 0 && `+${a.physical_restore}% Physical`,
                a.mental_restore    > 0 && `+${a.mental_restore}% Mental`,
              ].filter(Boolean).join('  ');
              return (
                <View key={a.id} style={s.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyName}>{a.name}</Text>
                    {!!lines && <Text style={s.historyMeta}>{lines}</Text>}
                  </View>
                  <Text style={s.historyMeta}>{a.xp_cost} XP</Text>
                </View>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => setHistoryModal(false)} style={s.historyCloseBtn}>
            <Text style={s.historyCloseBtnText}>Close</Text>
          </Pressable>
        </View>
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
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  xpText: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.primary },

  barsCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.lg, gap: spacing.md,
  },
  barDivider: { height: 1, backgroundColor: colors.border },

  revivalBlock: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: radius.md, padding: spacing.md,
  },
  revivalBlockTitle: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger, letterSpacing: 1, marginBottom: 4 },
  revivalBlockDesc:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },

  warningCard: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, padding: spacing.md,
  },
  warningText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.danger },

  infoBtn: { padding: 2, marginLeft: spacing.xs },

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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionHeading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  addLink: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },
  pastRestoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  pastRestoreBtnText: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },

  historyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  historySheet: {
    position: 'absolute', top: '20%', left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  historyEmpty: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, paddingVertical: spacing.md, textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  historyName: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  historyMeta: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  historyCloseBtn: { borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  historyCloseBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, paddingBottom: 40,
  },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sheetSubLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  restoreCapHint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border, marginTop: -2 },
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
