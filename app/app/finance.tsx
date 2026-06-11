import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  useWindowDimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Screen } from '../src/components/Screen';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getAllNetWorth, getNetWorthForMonth, saveNetWorth, type NetWorthEntry } from '../src/db/finance';
import { getSetting } from '../src/db/settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
}

function formatAmount(n: number, sym = '$'): string {
  const abs = Math.abs(n);
  const formatted = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2);
  return (n < 0 ? '-' : '') + sym + formatted;
}

// ─── Line Chart (pure RN, no library) ─────────────────────────────────────────

type ChartPoint = { label: string; value: number };

function LineChart({ points }: { points: ChartPoint[] }) {
  const { width } = useWindowDimensions();
  const chartW = width - spacing.md * 2 - spacing.md * 2; // screen - screen padding - card padding
  const chartH = 160;
  const padX = 8;
  const padY = 16;

  if (points.length === 0) {
    return (
      <View style={[ch.wrap, { width: chartW, height: chartH + 40 }]}>
        <Text style={ch.empty}>No data yet</Text>
      </View>
    );
  }

  const values = points.map(p => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range  = maxVal - minVal || 1;

  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  function xFor(i: number): number {
    return padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  }
  function yFor(v: number): number {
    return padY + innerH - ((v - minVal) / range) * innerH;
  }

  const dots   = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), label: p.label, value: p.value }));
  const segments: { midX: number; midY: number; length: number; angle: number }[] = [];

  for (let i = 0; i < dots.length - 1; i++) {
    const a = dots[i], b = dots[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    segments.push({
      midX:   (a.x + b.x) / 2,
      midY:   (a.y + b.y) / 2,
      length: Math.sqrt(dx * dx + dy * dy),
      angle:  Math.atan2(dy, dx) * (180 / Math.PI),
    });
  }

  return (
    <View style={{ width: chartW }}>
      {/* Chart canvas */}
      <View style={[ch.canvas, { width: chartW, height: chartH }]}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => (
          <View
            key={t}
            style={[ch.grid, { top: padY + (1 - t) * innerH, width: chartW - padX * 2, left: padX }]}
          />
        ))}

        {/* Line segments */}
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left:     seg.midX - seg.length / 2,
              top:      seg.midY - 1,
              width:    seg.length,
              height:   2,
              backgroundColor: '#FBBF24',
              transform: [{ rotate: `${seg.angle}deg` }],
            }}
          />
        ))}

        {/* Dots */}
        {dots.map((d, i) => (
          <View key={i} style={[ch.dot, { left: d.x - 4, top: d.y - 4 }]} />
        ))}
      </View>

      {/* X-axis labels */}
      <View style={[ch.xAxis, { width: chartW }]}>
        {dots.map((d, i) => (
          <Text
            key={i}
            style={[ch.xLabel, { left: d.x - 20, width: 40 }]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ch = StyleSheet.create({
  wrap:    { alignItems: 'center', justifyContent: 'center' },
  empty:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  canvas:  { position: 'relative', backgroundColor: 'transparent' },
  grid:    { position: 'absolute', height: 1, backgroundColor: colors.border },
  dot:     { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24', borderWidth: 2, borderColor: colors.bg },
  xAxis:   { height: 22, position: 'relative', marginTop: 4 },
  xLabel:  { position: 'absolute', fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

type TabKey = 'accounting' | 'analysis';
type ChartRange = 'monthly' | 'yearly';

export default function FinanceScreen() {
  const [tab,          setTab]          = useState<TabKey>('accounting');
  const [entries,      setEntries]      = useState<NetWorthEntry[]>([]);
  const [input,        setInput]        = useState('');
  const [saved,        setSaved]        = useState(false);
  const [chartRange,   setChartRange]   = useState<ChartRange>('monthly');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const month = currentMonth();

  useFocusEffect(useCallback(() => {
    setCurrencySymbol(getSetting('finance_currency', '$') || '$');
    const all = getAllNetWorth();
    setEntries(all);
    const existing = getNetWorthForMonth(month);
    if (existing) {
      setInput(String(existing.amount));
      setSaved(true);
    } else {
      setInput('');
      setSaved(false);
    }
  }, []));

  function handleSave() {
    const n = parseFloat(input.replace(/,/g, ''));
    if (isNaN(n)) return;
    saveNetWorth(month, n);
    const all = getAllNetWorth();
    setEntries(all);
    setSaved(true);
  }

  // Build chart points
  function buildMonthlyPoints(): ChartPoint[] {
    return [...entries]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map(e => ({ label: formatMonth(e.month).split(' ')[0], value: e.amount }));
  }

  function buildYearlyPoints(): ChartPoint[] {
    const byYear: Record<string, number> = {};
    for (const e of entries) {
      const year = e.month.split('-')[0];
      byYear[year] = e.amount; // last entry for that year wins (entries sorted DESC)
    }
    // entries are DESC so we reassign; last assigned = earliest month in year
    // Redo: sort ASC so last assigned = latest month
    const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
    const byYearAsc: Record<string, number> = {};
    for (const e of sorted) {
      byYearAsc[e.month.split('-')[0]] = e.amount;
    }
    return Object.entries(byYearAsc)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amount]) => ({ label: year, value: amount }));
  }

  const chartPoints = chartRange === 'monthly' ? buildMonthlyPoints() : buildYearlyPoints();

  return (
    <Screen style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Finance</Text>
        {/* Segmented control */}
        <View style={s.seg}>
          {(['accounting', 'analysis'] as TabKey[]).map(t => (
            <Pressable
              key={t}
              style={[s.segBtn, tab === t && s.segBtnOn]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.segTxt, tab === t && s.segTxtOn]}>
                {t === 'accounting' ? 'Accounting' : 'Analysis'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'accounting' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <Text style={s.monthLabel}>{formatMonth(month)}</Text>
              <Text style={s.fieldLabel}>Net Worth</Text>
              <View style={s.inputRow}>
                <Text style={s.currency}>{currencySymbol}</Text>
                <TextInput
                  style={s.input}
                  value={input}
                  onChangeText={t => { setInput(t); setSaved(false); }}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>
              <Pressable
                style={[s.saveBtn, saved && s.saveBtnDone]}
                onPress={handleSave}
              >
                <Text style={[s.saveBtnTxt, saved && s.saveBtnTxtDone]}>
                  {saved ? 'Saved' : 'Save'}
                </Text>
              </Pressable>
              <Text style={s.hint}>One entry per month — saving overwrites the current figure.</Text>
            </View>

            {/* Recent entries preview */}
            {entries.length > 0 && (
              <View style={s.recentCard}>
                <Text style={s.sectionTitle}>Recent</Text>
                {entries.slice(0, 3).map(e => (
                  <View key={e.id} style={s.recentRow}>
                    <Text style={s.recentMonth}>{formatMonth(e.month)}</Text>
                    <Text style={[s.recentAmount, e.amount < 0 && s.negative]}>
                      {formatAmount(e.amount, currencySymbol)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          {/* Chart card */}
          <View style={s.card}>
            {/* Range toggle */}
            <View style={s.rangeSeg}>
              {(['monthly', 'yearly'] as ChartRange[]).map(r => (
                <Pressable
                  key={r}
                  style={[s.rangeBtn, chartRange === r && s.rangeBtnOn]}
                  onPress={() => setChartRange(r)}
                >
                  <Text style={[s.rangeTxt, chartRange === r && s.rangeTxtOn]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <LineChart points={chartPoints} />
          </View>

          {/* History list */}
          <View style={s.historyCard}>
            <Text style={s.sectionTitle}>History</Text>
            {entries.length === 0 ? (
              <Text style={s.emptyHint}>No entries yet — record your first net worth in Accounting.</Text>
            ) : (
              entries.map((e, i) => {
                const prev    = entries[i + 1];
                const delta   = prev ? e.amount - prev.amount : null;
                return (
                  <View key={e.id} style={[s.histRow, i < entries.length - 1 && s.histRowBorder]}>
                    <Text style={s.histMonth}>{formatMonth(e.month)}</Text>
                    <View style={s.histRight}>
                      {delta !== null && (
                        <Text style={[s.histDelta, delta >= 0 ? s.positive : s.negative]}>
                          {delta >= 0 ? '+' : ''}{formatAmount(delta, currencySymbol)}
                        </Text>
                      )}
                      <Text style={[s.histAmount, e.amount < 0 && s.negative]}>
                        {formatAmount(e.amount, currencySymbol)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  iconBtn: { padding: 6 },
  title:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },

  // Header segmented control
  seg:       { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  segBtn:    { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
  segBtnOn:  { borderColor: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.08)' },
  segTxt:    { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  segTxtOn:  { color: '#FBBF24' },

  body: { padding: spacing.md, gap: spacing.md },

  card: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },

  // Accounting
  monthLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  fieldLabel: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  currency:   { fontFamily: fonts.mono.bold, fontSize: fontSize.xl, color: colors.textPrimary },
  input: {
    flex: 1,
    fontFamily: fonts.mono.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 4,
  },
  saveBtnDone:    { borderColor: colors.success },
  saveBtnTxt:     { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1 },
  saveBtnTxtDone: { color: colors.success },
  hint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  recentCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  recentRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  recentMonth:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  recentAmount: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.textPrimary },

  // Analysis
  rangeSeg:    { flexDirection: 'row', gap: 4, alignSelf: 'flex-end' },
  rangeBtn:    { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
  rangeBtnOn:  { borderColor: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.08)' },
  rangeTxt:    { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  rangeTxtOn:  { color: '#FBBF24' },

  // History
  historyCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  emptyHint:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  histRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  histMonth:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  histRight:  { alignItems: 'flex-end', gap: 1 },
  histAmount: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.textPrimary },
  histDelta:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs },

  positive: { color: colors.success },
  negative: { color: '#F87171' },
});
