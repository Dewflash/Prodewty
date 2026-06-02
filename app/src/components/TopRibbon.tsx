import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { getWeeklySummary, type WeeklySummary } from '../db/logs';
import { getRPGState } from '../db/rpg';

type Props = { title: string };

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatWeekLabel(d: string): string {
  const dt = new Date(d + 'T12:00:00');
  const end = new Date(dt); end.setDate(dt.getDate() + 6);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={sh.row}>
      <Text style={sh.label}>{label}</Text>
      <Text style={sh.value}>{value}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  value: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.textPrimary },
});

export function TopRibbon({ title }: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  function openSummary() {
    setSummary(getWeeklySummary());
    setSheetVisible(true);
  }

  const rpg = (() => { try { return getRPGState(); } catch { return null; } })();
  const coins = rpg?.coins ?? 0;

  return (
    <>
      <View style={s.ribbon}>

        {/* Left: Store + Inventory */}
        <View style={s.group}>
          <Pressable style={s.iconBtn} onPress={() => router.push('/store')}>
            <Feather name="dollar-sign" size={20} color={colors.textPrimary} />
            {coins > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{coins}</Text></View>
            )}
          </Pressable>
          <Pressable style={s.iconBtn} onPress={() => router.push('/inventory')}>
            <Feather name="archive" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Centre: page name */}
        <Text style={s.title}>{title}</Text>

        {/* Right: Milestones + Summary + Revelations */}
        <View style={s.group}>
          <Pressable style={s.iconBtn} onPress={() => router.push('/milestones')}>
            <Feather name="flag" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={s.iconBtn} onPress={openSummary}>
            <Feather name="clipboard" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={s.iconBtn} onPress={() => router.push('/revelations')}>
            <Ionicons name="bulb-outline" size={21} color="#FBBF24" />
          </Pressable>
        </View>

      </View>

      {/* Weekly summary sheet */}
      <Modal visible={sheetVisible} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>This Week</Text>
            {summary && (
              <>
                <Text style={s.sheetSub}>{formatWeekLabel(summary.weekStart)}</Text>
                <View style={s.div} />
                <Row label="Days active"    value={`${summary.daysLogged} / 7`} />
                <Row label="Activity logs"  value={String(summary.totalLogs)} />
                <Row label="XP earned"      value={`${summary.totalXP} XP`} />
                <View style={s.div} />
                <Row label="Avg mood"        value={summary.avgMood} />
                <Row label="Avg energy"      value={summary.avgEnergy} />
                <Row label="Avg productivity" value={summary.avgProd} />
                {summary.topCategory && (
                  <><View style={s.div} /><Row label="Top activity" value={summary.topCategory} /></>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  ribbon: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  group: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.success, borderRadius: 8,
    paddingHorizontal: 3, minWidth: 15, alignItems: 'center',
  },
  badgeText: { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.bg },
  title: {
    flex: 1, textAlign: 'center',
    fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: 40, gap: 2,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.lg, color: colors.textPrimary },
  sheetSub: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  div: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
