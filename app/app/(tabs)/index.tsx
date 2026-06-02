import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { XPBar } from '../../src/components/XPBar';
import { useAppStore } from '../../src/store/useAppStore';
import { getLogs, getRecentLogs, type ActivityLog } from '../../src/db/logs';
import { getRPGState } from '../../src/db/rpg';

type Period = 'week' | 'month' | 'year';

type DayData = {
  date: string;
  mood: number | null;
  energy: number | null;
  prod: number | null;
  xp: number;
};

function parseCategories(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function resolveDate(l: ActivityLog) {
  return l.log_date ?? l.created_at.split('T')[0].split(' ')[0];
}

function buildDailyData(logs: ActivityLog[], days: number): DayData[] {
  const byDate: Record<string, ActivityLog[]> = {};
  for (const l of logs) {
    const d = resolveDate(l);
    (byDate[d] ??= []).push(l);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    const ls = byDate[key] ?? [];
    // Prefer mood log values; fall back to activity log (legacy data has mood in activity)
    const moodSource = ls.find(l => l.entry_type === 'mood') ?? ls.find(l => l.mood_rating !== null);
    return {
      date: key,
      mood: moodSource?.mood_rating ?? null,
      energy: moodSource?.energy_rating ?? null,
      prod: moodSource?.productivity_rating ?? null,
      xp: ls.reduce((s, l) => s + l.xp_awarded, 0),
    };
  });
}

function buildWeeklyData(logs: ActivityLog[]): DayData[] {
  const byWeek: Record<string, ActivityLog[]> = {};
  for (const l of logs) {
    const d = new Date((resolveDate(l)) + 'T12:00:00');
    const mon = new Date(d);
    mon.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    const key = mon.toISOString().split('T')[0];
    (byWeek[key] ??= []).push(l);
  }
  return Object.keys(byWeek).sort().slice(-52).map(key => {
    const ls = byWeek[key];
    const avg = (field: keyof ActivityLog) => {
      const vals = ls.map(l => l[field] as number | null).filter(v => v !== null) as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      date: key,
      mood: avg('mood_rating'),
      energy: avg('energy_rating'),
      prod: avg('productivity_rating'),
      xp: ls.reduce((s, l) => s + l.xp_awarded, 0),
    };
  });
}

function scoreToColor(v: number | null) {
  if (v === null) return colors.border;
  return colors.moodActive[Math.min(Math.max(Math.round(v) - 1, 0), 9)];
}

function fmtAvg(arr: (number | null)[]) {
  const vals = arr.filter(v => v !== null) as number[];
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
}

function buildBreakdown(logs: ActivityLog[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const l of logs) {
    for (const c of parseCategories(l.categories)) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count]) => ({ name, count }));
}

const CAT_COLORS = [
  colors.primary, colors.accent, colors.success,
  '#F97316', '#FBBF24', '#EC4899', '#8B5CF6',
];

const BADGES = [
  { id: 'log_1',   name: 'First Step',   desc: 'First log entry'         },
  { id: 'log_5',   name: 'Momentum',     desc: '5 entries logged'        },
  { id: 'log_10',  name: 'Consistent',   desc: '10 entries'              },
  { id: 'log_20',  name: 'Dedicated',    desc: '20 entries'              },
  { id: 'log_50',  name: 'Committed',    desc: '50 entries'              },
  { id: 'log_100', name: 'Centurion',    desc: '100 entries'             },
  { id: 'str_3',   name: '3-Day Streak', desc: '3 days in a row'         },
  { id: 'str_7',   name: 'Week Warrior', desc: '7-day streak'            },
  { id: 'str_14',  name: '2 Weeks',      desc: '14-day streak'           },
  { id: 'str_30',  name: 'Month',        desc: '30-day streak'           },
  { id: 'mood_10', name: 'Best Day',     desc: 'Mood 10'                 },
  { id: 'nrg_10',  name: 'Full Power',   desc: 'Energy 10'               },
  { id: 'prd_10',  name: 'Peak Focus',   desc: 'Productivity 10'         },
  { id: 'all_10',  name: '???',          desc: '???', secret: true       },
];

function earnedBadges(logs: ActivityLog[], streak: number): Set<string> {
  const e = new Set<string>();
  const n = logs.length;
  if (n >= 1)   e.add('log_1');
  if (n >= 5)   e.add('log_5');
  if (n >= 10)  e.add('log_10');
  if (n >= 20)  e.add('log_20');
  if (n >= 50)  e.add('log_50');
  if (n >= 100) e.add('log_100');
  if (streak >= 3)  e.add('str_3');
  if (streak >= 7)  e.add('str_7');
  if (streak >= 14) e.add('str_14');
  if (streak >= 30) e.add('str_30');
  if (logs.some(l => l.mood_rating === 10))         e.add('mood_10');
  if (logs.some(l => l.energy_rating === 10))       e.add('nrg_10');
  if (logs.some(l => l.productivity_rating === 10)) e.add('prd_10');
  if (logs.some(l => l.mood_rating === 10 && l.energy_rating === 10 && l.productivity_rating === 10)) e.add('all_10');
  return e;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreRow({ label, vals, cellH }: { label: string; vals: (number | null)[]; cellH: number }) {
  return (
    <View style={s.chartBlock}>
      <View style={s.chartHeader}>
        <Text style={s.chartLabel}>{label}</Text>
        <Text style={s.chartAvg}>avg {fmtAvg(vals)}</Text>
      </View>
      <View style={[s.cellRow, { height: cellH }]}>
        {vals.map((v, i) => (
          <View key={i} style={[s.cell, { backgroundColor: scoreToColor(v) }]} />
        ))}
      </View>
    </View>
  );
}

function XPChart({ vals, cellH }: { vals: number[]; cellH: number }) {
  const max = Math.max(...vals, 1);
  return (
    <View style={s.chartBlock}>
      <Text style={s.chartLabel}>XP per day</Text>
      <View style={[s.cellRow, { height: cellH, alignItems: 'flex-end' }]}>
        {vals.map((v, i) => (
          <View
            key={i}
            style={[
              s.cell,
              {
                height: v ? Math.max((v / max) * cellH, 2) : 2,
                backgroundColor: v ? colors.success : colors.border,
                borderRadius: 2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function BreakdownChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) return <Text style={s.emptyNote}>No logs in this period.</Text>;
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <View style={s.chartBlock}>
      <Text style={s.chartLabel}>Activity breakdown</Text>
      <View style={s.breakBar}>
        {data.map((d, i) => (
          <View key={d.name} style={{ flex: d.count, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
        ))}
      </View>
      <View style={s.legendRow}>
        {data.map((d, i) => (
          <View key={d.name} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
            <Text style={s.legendText}>{d.name} {Math.round((d.count / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { rpgState, setRPGState } = useAppStore();
  const [period, setPeriod] = useState<Period>('week');
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [periodLogs, setPeriodLogs] = useState<ActivityLog[]>([]);
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      setRPGState(getRPGState());
      const all = getLogs();
      setAllLogs(all);
      const days = period === 'week' ? 7 : 30;
      const recent = getRecentLogs(period === 'year' ? 365 : days);
      setPeriodLogs(recent);
      setChartData(period === 'year' ? buildWeeklyData(recent) : buildDailyData(recent, days));
    }, [period]),
  );

  const cellH = period === 'week' ? 36 : period === 'month' ? 20 : 12;
  const moodVals  = chartData.map(d => d.mood);
  const energyVals = chartData.map(d => d.energy);
  const prodVals  = chartData.map(d => d.prod);
  const xpVals    = chartData.map(d => d.xp);

  const streak = rpgState?.streak_days ?? 0;
  const earned = earnedBadges(allLogs, streak);
  const breakdown = buildBreakdown(periodLogs);

  const maxXP   = allLogs.reduce((m, l) => Math.max(m, l.xp_awarded), 0);
  const maxMood = allLogs.reduce((m, l) => l.mood_rating   ? Math.max(m, l.mood_rating)   : m, 0);
  const maxNrg  = allLogs.reduce((m, l) => l.energy_rating ? Math.max(m, l.energy_rating) : m, 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>

        {rpgState && (
          <XPBar
            level={rpgState.current_level}
            totalXP={rpgState.total_xp}
            xpToNext={rpgState.xp_to_next_level}
            title={rpgState.title}
            streakDays={rpgState.streak_days}
          />
        )}

        {/* Quick stats */}
        <View style={s.strip}>
          {[
            { val: allLogs.length,                                      label: 'Logs'   },
            { val: streak,                                               label: 'Streak' },
            { val: allLogs.reduce((t, l) => t + l.xp_awarded, 0),       label: 'XP'     },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{item.val}</Text>
                <Text style={s.stripLabel}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.stripDiv} />}
            </React.Fragment>
          ))}
        </View>

        {/* Period filter */}
        <View style={s.periodRow}>
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <Pressable key={p} onPress={() => setPeriod(p)}
              style={[s.periodBtn, period === p && s.periodBtnOn]}>
              <Text style={[s.periodTxt, period === p && s.periodTxtOn]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Score charts */}
        <ScoreRow label="Mood"         vals={moodVals}   cellH={cellH} />
        <ScoreRow label="Energy"       vals={energyVals} cellH={cellH} />
        <ScoreRow label="Productivity" vals={prodVals}   cellH={cellH} />
        <XPChart                       vals={xpVals}     cellH={Math.max(cellH, 40)} />
        <BreakdownChart data={breakdown} />

        {/* Records */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Records</Text>
          <View style={s.recordGrid}>
            {[
              { label: 'Best single XP', value: maxXP || '—'  },
              { label: 'Best mood',       value: maxMood || '—' },
              { label: 'Best energy',     value: maxNrg  || '—' },
              { label: 'Current streak',  value: `${streak}d`  },
            ].map(r => (
              <View key={r.label} style={s.recordCard}>
                <Text style={s.recordVal}>{r.value}</Text>
                <Text style={s.recordLabel}>{r.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges — at the end */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Badges</Text>
          <View style={s.badgeGrid}>
            {BADGES.map(b => {
              const has = earned.has(b.id);
              if ((b as any).secret && !has) return (
                <View key={b.id} style={[s.badge, s.badgeLocked]}>
                  <Text style={s.badgeNameLocked}>???</Text>
                </View>
              );
              return (
                <View key={b.id} style={[s.badge, has ? s.badgeOn : s.badgeLocked]}>
                  <Text style={has ? s.badgeName : s.badgeNameLocked}>{b.name}</Text>
                  {has && <Text style={s.badgeDesc}>{b.desc}</Text>}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  strip: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 2 },
  stripVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.textPrimary },
  stripLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  stripDiv: { width: 1, height: 32, backgroundColor: colors.border },

  periodRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, overflow: 'hidden',
  },
  periodBtn: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  periodBtnOn: { backgroundColor: colors.primary },
  periodTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  periodTxtOn: { color: colors.bg },

  chartBlock: { gap: spacing.xs },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.5 },
  chartAvg: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  cellRow: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, borderRadius: 2 },

  breakBar: {
    flexDirection: 'row', height: 18, borderRadius: radius.sm, overflow: 'hidden', gap: 1,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  emptyNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  section: { gap: spacing.md },
  sectionHead: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },

  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recordCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, gap: 4,
  },
  recordVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.lg, color: colors.textPrimary },
  recordLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: 2, minWidth: 90,
  },
  badgeOn: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.06)' },
  badgeLocked: { borderColor: colors.border },
  badgeName: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.primary },
  badgeNameLocked: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  badgeDesc: { fontFamily: fonts.ui.regular, fontSize: 10, color: colors.textMuted },
});
