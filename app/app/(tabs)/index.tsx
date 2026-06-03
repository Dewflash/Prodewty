import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { XPBar } from '../../src/components/XPBar';
import { TopRibbon } from '../../src/components/TopRibbon';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { useAppStore } from '../../src/store/useAppStore';
import {
  getLogs, getRecentLogs, getCategoryEffects, getActivityTimeStats,
  type ActivityLog, type CategoryEffect, type ActivityTimeStat,
} from '../../src/db/logs';
import { getRPGState, isInDeathState, selfDestruct, setCurrentMood } from '../../src/db/rpg';
import { resetDeathIgnore } from '../../src/db/game';
import { triggerDeathCheck } from '../../src/db/deathCheckSignal';
import { getHealthState, type HealthState } from '../../src/db/health';

type Period = 'week' | 'month' | 'year';

const MOOD_STATES = ['driven', 'burnout', 'reminiscing', 'lonely', 'overstimulated', 'relapsed'] as const;
type MoodState = typeof MOOD_STATES[number];
const MOOD_STATE_COLORS: Record<MoodState, string> = {
  driven:       colors.success,
  burnout:      '#EF4444',
  reminiscing:  '#A855F7',
  lonely:       '#64748B',
  overstimulated: '#F97316',
  relapsed:     '#EF4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCategories(raw: string): string[] { try { return JSON.parse(raw); } catch { return []; } }
function resolveDate(l: ActivityLog) { return l.log_date ?? l.created_at.split('T')[0].split(' ')[0]; }
function fmtAvg(arr: (number | null)[]) {
  const vals = arr.filter(v => v !== null) as number[];
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
}
function scoreToColor(v: number | null) {
  if (v === null) return colors.border;
  return colors.moodActive[Math.min(Math.max(Math.round(v) - 1, 0), 9)];
}
function fmtMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

type DayData = { date: string; mood: number | null; energy: number | null; prod: number | null; xp: number };

function buildDailyData(logs: ActivityLog[], days: number): DayData[] {
  const byDate: Record<string, ActivityLog[]> = {};
  for (const l of logs) { const d = resolveDate(l); (byDate[d] ??= []).push(l); }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    const ls = byDate[key] ?? [];
    const ms = ls.find(l => l.entry_type === 'mood') ?? ls.find(l => l.mood_rating !== null);
    return { date: key, mood: ms?.mood_rating ?? null, energy: ms?.energy_rating ?? null, prod: ms?.productivity_rating ?? null, xp: ls.reduce((s, l) => s + l.xp_awarded, 0) };
  });
}

function buildWeeklyData(logs: ActivityLog[]): DayData[] {
  const byWeek: Record<string, ActivityLog[]> = {};
  for (const l of logs) {
    const d = new Date(resolveDate(l) + 'T12:00:00');
    const mon = new Date(d); mon.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    const key = mon.toISOString().split('T')[0];
    (byWeek[key] ??= []).push(l);
  }
  return Object.keys(byWeek).sort().slice(-52).map(key => {
    const ls = byWeek[key];
    const avg = (field: keyof ActivityLog) => { const v = ls.map(l => l[field] as number | null).filter(x => x !== null) as number[]; return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    return { date: key, mood: avg('mood_rating'), energy: avg('energy_rating'), prod: avg('productivity_rating'), xp: ls.reduce((s, l) => s + l.xp_awarded, 0) };
  });
}

function buildBreakdown(logs: ActivityLog[]) {
  const counts: Record<string, number> = {};
  for (const l of logs) for (const c of parseCategories(l.categories)) { counts[c] = (counts[c] ?? 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, count]) => ({ name, count }));
}

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS = [colors.primary, colors.accent, colors.success, '#F97316', '#FBBF24', '#EC4899', '#8B5CF6'];

const BADGES = [
  { id:'log_1',   name:'First Step',   desc:'First log entry'    },
  { id:'log_5',   name:'Momentum',     desc:'5 entries'          },
  { id:'log_10',  name:'Consistent',   desc:'10 entries'         },
  { id:'log_20',  name:'Dedicated',    desc:'20 entries'         },
  { id:'log_50',  name:'Committed',    desc:'50 entries'         },
  { id:'log_100', name:'Centurion',    desc:'100 entries'        },
  { id:'str_3',   name:'3-Day Streak', desc:'3 days in a row'    },
  { id:'str_7',   name:'Week Warrior', desc:'7-day streak'       },
  { id:'str_14',  name:'2 Weeks',      desc:'14-day streak'      },
  { id:'str_30',  name:'Month',        desc:'30-day streak'      },
  { id:'mood_10', name:'Best Day',     desc:'Mood 10'            },
  { id:'nrg_10',  name:'Full Power',   desc:'Energy 10'          },
  { id:'prd_10',  name:'Peak Focus',   desc:'Productivity 10'    },
  { id:'all_10',  name:'???',          desc:'???', secret: true  },
];

function earnedBadges(logs: ActivityLog[], streak: number) {
  const e = new Set<string>();
  const n = logs.length;
  if (n>=1) e.add('log_1'); if (n>=5) e.add('log_5'); if (n>=10) e.add('log_10');
  if (n>=20) e.add('log_20'); if (n>=50) e.add('log_50'); if (n>=100) e.add('log_100');
  if (streak>=3) e.add('str_3'); if (streak>=7) e.add('str_7');
  if (streak>=14) e.add('str_14'); if (streak>=30) e.add('str_30');
  if (logs.some(l => l.mood_rating===10)) e.add('mood_10');
  if (logs.some(l => l.energy_rating===10)) e.add('nrg_10');
  if (logs.some(l => l.productivity_rating===10)) e.add('prd_10');
  if (logs.some(l => l.mood_rating===10 && l.energy_rating===10 && l.productivity_rating===10)) e.add('all_10');
  return e;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CELL_H_COMPACT = 10;

function ScoreRow({ label, vals, cellH, dates, period }: { label: string; vals: (number|null)[]; cellH: number; dates: string[]; period: Period }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [rowW, setRowW] = React.useState(300);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function pressIn(i:number) { if(timer.current)clearTimeout(timer.current); setHovered(i); }
  function pressOut() { timer.current = setTimeout(() => setHovered(null), 1500); }
  function tooltipLabel(i:number) {
    const d = dates[i]; if (!d) return '';
    if (period==='year') { const dt=new Date(d+'T12:00:00'); const fj=new Date(dt.getFullYear(),0,1); const wk=Math.ceil(((dt.getTime()-fj.getTime())/86400000+fj.getDay()+1)/7); return `Wk ${wk}`; }
    const dt = new Date(d+'T12:00:00'); return `${dt.getDate()} ${MONTHS_S[dt.getMonth()]}`;
  }
  const tooltipLeft = hovered !== null ? Math.max(2, Math.min(rowW-48, ((hovered+0.5)/vals.length)*rowW-24)) : 0;
  return (
    <View style={s.chartBlock}>
      <View style={s.chartHeader}>
        <Text style={s.chartLabel}>{label}</Text>
        <Text style={s.chartAvg}>avg {fmtAvg(vals)}</Text>
      </View>
      <View style={{ paddingTop: hovered !== null ? 22 : 0 }}>
        {hovered !== null && (
          <View pointerEvents="none" style={[s.tooltip, { left: tooltipLeft }]}>
            <Text style={s.tooltipTxt}>{tooltipLabel(hovered)}</Text>
          </View>
        )}
        <View style={[s.cellRow, { height: cellH }]} onLayout={e => setRowW(e.nativeEvent.layout.width)}>
          {vals.map((v,i) => (
            <Pressable key={i} style={[s.cell, { backgroundColor: scoreToColor(v) }]} onPressIn={() => pressIn(i)} onPressOut={pressOut} />
          ))}
        </View>
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
        {vals.map((v,i) => (
          <View key={i} style={[s.cell, { height: v ? Math.max((v/max)*cellH, 2) : 2, backgroundColor: v ? colors.success : colors.border, borderRadius: 2 }]} />
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
        {data.map((d,i) => <View key={d.name} style={{ flex: d.count, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />)}
      </View>
      <View style={s.legendRow}>
        {data.map((d,i) => (
          <View key={d.name} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
            <Text style={s.legendText}>{d.name} {Math.round((d.count/total)*100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActivityStatsSection({ stats }: { stats: ActivityTimeStat[] }) {
  if (stats.length === 0) return <Text style={s.emptyNote}>No activity data yet.</Text>;
  const maxMins = Math.max(...stats.map(s => s.total_mins), 1);
  return (
    <View style={s.chartBlock}>
      <Text style={s.chartLabel}>Activity Stats</Text>
      {stats.map((item, i) => (
        <View key={item.category} style={s.actStatRow}>
          <Text style={s.actStatCat}>{item.category}</Text>
          <View style={s.actStatBarWrap}>
            <View style={[s.actStatBar, { width: `${(item.total_mins / maxMins) * 100}%` as any, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
          </View>
          <Text style={s.actStatTime}>{fmtMins(item.total_mins)}</Text>
          <Text style={s.actStatCount}>{item.count}×</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { rpgState, setRPGState } = useAppStore();
  const [period, setPeriod] = useState<Period>('week');
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [periodLogs, setPeriodLogs] = useState<ActivityLog[]>([]);
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [catEffects, setCatEffects] = useState<CategoryEffect[]>([]);
  const [actStats, setActStats] = useState<ActivityTimeStat[]>([]);
  const [currentMoodState, setCurrentMoodState] = useState<MoodState>('driven');
  const [health, setHealth] = useState<HealthState | null>(null);
  const [todaySdCount, setTodaySdCount] = useState(0);
  const [showRevival, setShowRevival] = useState(false);

  // Shake + flash
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [sdFlashVisible, setSdFlashVisible] = useState(false);
  const [sdCount, setSdCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const rpg = getRPGState();
      setRPGState(rpg);
      setCurrentMoodState((rpg.current_mood as MoodState) ?? 'driven');
      setSdCount(rpg.self_destruct_count ?? 0);
      const today = new Date().toISOString().split('T')[0];
      const tsc = getLogs().filter(l => l.entry_type === 'self_destruct' && l.log_date === today).length;
      setTodaySdCount(tsc);
      const all = getLogs();
      setAllLogs(all);
      const days = period === 'week' ? 7 : 30;
      const recent = getRecentLogs(period === 'year' ? 365 : days);
      setPeriodLogs(recent);
      setChartData(period === 'year' ? buildWeeklyData(recent) : buildDailyData(recent, days));
      setCatEffects(getCategoryEffects());
      setActStats(getActivityTimeStats(period));
      try { setHealth(getHealthState()); } catch {}
      setShowRevival(isInDeathState() && (rpg.death_acknowledged ?? 0) === 1);
    }, [period]),
  );

  function handleSelfDestruct() {
    // Shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();

    // Flash overlay
    setSdFlashVisible(true);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(flashOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setSdFlashVisible(false));

    const result = selfDestruct();
    setSdCount(result.count);
  }

  function handleMoodSelect(mood: MoodState) {
    setCurrentMood(mood);
    setCurrentMoodState(mood);
  }

  const cellH = period === 'week' ? 28 : period === 'month' ? 16 : CELL_H_COMPACT;
  const moodVals   = chartData.map(d => d.mood);
  const energyVals = chartData.map(d => d.energy);
  const prodVals   = chartData.map(d => d.prod);
  const xpVals     = chartData.map(d => d.xp);
  const streak     = rpgState?.streak_days ?? 0;
  const earned     = earnedBadges(allLogs, streak);
  const breakdown  = buildBreakdown(periodLogs);
  const dates      = chartData.map(d => d.date);

  const maxXP   = allLogs.reduce((m, l) => Math.max(m, l.xp_awarded), 0);
  const maxMood = allLogs.reduce((m, l) => l.mood_rating   ? Math.max(m, l.mood_rating)   : m, 0);
  const maxNrg  = allLogs.reduce((m, l) => l.energy_rating ? Math.max(m, l.energy_rating) : m, 0);

  const moodColor = MOOD_STATE_COLORS[currentMoodState] ?? colors.primary;

  return (
    <SwipeNavWrapper currentIndex={0}>
    <SafeAreaView style={s.safe}>
      <TopRibbon title="Progress" />
      <Animated.ScrollView
        contentContainerStyle={s.content}
        style={{ transform: [{ translateX: shakeAnim }] }}
      >

        {rpgState && (
          <>
            <XPBar
              level={rpgState.current_level}
              totalXP={rpgState.total_xp}
              xpToNext={rpgState.xp_to_next_level}
              title={rpgState.title}
              streakDays={rpgState.streak_days}
              frozen={(rpgState.streak_freezes ?? 0) > 0}
            />
            <View style={s.xpFooter}>
              <Text style={s.buffsText}>Buffs: None</Text>
              <Text style={s.xpToNext}>{rpgState.xp_to_next_level - rpgState.total_xp} XP to Level {rpgState.current_level + 1}</Text>
            </View>

            {/* Streak freeze chip + Self-destruct button */}
            <View style={s.actionRow}>
              <View style={s.chipsLeft}>
                {(rpgState.streak_freezes ?? 0) > 0 && (
                  <View style={s.effectChip}>
                    <Text style={s.effectIcon}>❄</Text>
                    <Text style={s.effectText}>Streak Freeze × {rpgState.streak_freezes}</Text>
                  </View>
                )}
              </View>
                      <Pressable onPress={handleSelfDestruct} style={s.sdBtn}>
                <Text style={s.sdBtnTxt}>
                  {todaySdCount > 0 ? `SELF DESTRUCT :${todaySdCount}` : 'SELF DESTRUCT'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Revival urgent prompt */}
        {showRevival && (
          <Pressable
            style={s.revivalUrgent}
            onPress={() => { resetDeathIgnore(); triggerDeathCheck(); }}
          >
            <Text style={s.revivalUrgentTxt}>YOU HAVE DIED — START REVIVAL QUEST</Text>
          </Pressable>
        )}

        {/* Current Mood */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHead}>Current Mood</Text>
            <View style={[s.moodStateBadge, { borderColor: moodColor }]}>
              <Text style={[s.moodStateBadgeTxt, { color: moodColor }]}>{currentMoodState}</Text>
            </View>
          </View>
          <View style={s.moodStateRow}>
            {MOOD_STATES.map(m => {
              const active = currentMoodState === m;
              const col = MOOD_STATE_COLORS[m];
              return (
                <Pressable key={m} onPress={() => handleMoodSelect(m)} style={[s.moodStateBtn, { borderColor: active ? col : colors.border }, active && { backgroundColor: `${col}15` }]}>
                  <Text style={[s.moodStateTxt, { color: active ? col : colors.textMuted }]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.strip}>
          {[
            { val: allLogs.length,                               label: 'Logs'   },
            { val: streak,                                        label: 'Streak' },
            { val: allLogs.reduce((t,l) => t+l.xp_awarded, 0),  label: 'XP'     },
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
          {(['week','month','year'] as Period[]).map(p => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={[s.periodBtn, period===p && s.periodBtnOn]}>
              <Text style={[s.periodTxt, period===p && s.periodTxtOn]}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Compact mood/energy/prod bars */}
        <ScoreRow label="Mood"         vals={moodVals}   cellH={cellH} dates={dates} period={period} />
        <ScoreRow label="Energy"       vals={energyVals} cellH={cellH} dates={dates} period={period} />
        <ScoreRow label="Productivity" vals={prodVals}   cellH={cellH} dates={dates} period={period} />
        <XPChart                       vals={xpVals}     cellH={Math.max(cellH, 40)} />

        {/* Activity Stats */}
        <ActivityStatsSection stats={actStats} />

        {/* Breakdown */}
        <BreakdownChart data={breakdown} />

        {/* Activity Effects */}
        {catEffects.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionHead}>Activity Effects</Text>
            <Text style={s.sectionSub}>Before vs after logging each activity type</Text>
            {catEffects.map(e => {
              const diff = e.nextDayMood !== null && e.baselineMood !== null ? (e.nextDayMood - e.baselineMood).toFixed(1) : null;
              const positive = diff !== null && parseFloat(diff) >= 0;
              return (
                <View key={e.category} style={s.effectRow}>
                  <Text style={s.effectCat}>{e.category}</Text>
                  <View style={s.effectStats}>
                    <Text style={s.effectVal}>Pre {e.baselineMood ?? '—'}</Text>
                    <Text style={s.effectVal}>Post {e.nextDayMood ?? '—'}</Text>
                    {diff !== null && (
                      <Text style={[s.effectDiff, { color: positive ? colors.success : colors.danger }]}>
                        {positive ? '+' : ''}{diff}
                      </Text>
                    )}
                  </View>
                  <Text style={s.effectSamples}>{e.sampleCount}×</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Records */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Records</Text>
          <View style={s.recordGrid}>
            {[
              { label: 'Best single XP',     value: maxXP   || '—' },
              { label: 'Best mood',           value: maxMood || '—' },
              { label: 'Best energy',         value: maxNrg  || '—' },
              { label: 'Current streak',      value: `${streak}d`   },
              { label: 'Self-destruct count', value: sdCount, red: true },
            ].map(r => (
              <View key={r.label} style={[s.recordCard, (r as any).red && sdCount > 0 && s.recordCardRed]}>
                <Text style={[s.recordVal, (r as any).red && sdCount > 0 && { color: colors.danger }]}>{r.value}</Text>
                <Text style={s.recordLabel}>{r.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Badges</Text>
          <View style={s.badgeGrid}>
            {BADGES.map(b => {
              const has = earned.has(b.id);
              if ((b as any).secret && !has) return (
                <View key={b.id} style={[s.badge, s.badgeLocked]}><Text style={s.badgeNameLocked}>???</Text></View>
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

      </Animated.ScrollView>

      {/* Self-destruct flash overlay */}
      {sdFlashVisible && (
        <Animated.View style={[s.sdFlash, { opacity: flashOpacity }]} pointerEvents="none">
          <Text style={s.sdFlashTxt}>YOU SELF DESTRUCTED</Text>
          {rpgState?.last_self_destruct && (
            <Text style={s.sdFlashSub}>Count: {sdCount}</Text>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },

  xpFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -spacing.sm },
  buffsText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  xpToNext:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },

  actionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipsLeft:  { flexDirection: 'row', gap: spacing.sm, flex: 1 },
  effectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  effectIcon: { fontSize: 11, color: colors.primary },
  effectText: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.primary },

  revivalUrgent:    {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
    shadowColor: colors.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  revivalUrgentTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.danger, letterSpacing: 2 },

  sdBtn:    { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  sdBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger, letterSpacing: 1 },

  // Current mood
  section:           { gap: spacing.md },
  sectionHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sectionSub:        { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.sm },
  moodStateBadge:    { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  moodStateBadgeTxt: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, letterSpacing: 1 },
  moodStateRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodStateBtn:      { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  moodStateTxt:      { fontFamily: fonts.ui.medium, fontSize: fontSize.xs },

  strip:      { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  stripItem:  { flex: 1, alignItems: 'center', gap: 2 },
  stripVal:   { fontFamily: fonts.mono.bold,    fontSize: fontSize.md, color: colors.textPrimary },
  stripLabel: { fontFamily: fonts.ui.regular,   fontSize: fontSize.xs, color: colors.textMuted },
  stripDiv:   { width: 1, height: 32, backgroundColor: colors.border },

  periodRow:   { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  periodBtn:   { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  periodBtnOn: { backgroundColor: colors.primary },
  periodTxt:   { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  periodTxtOn: { color: colors.bg },

  chartBlock:  { gap: spacing.xs },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel:  { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.5 },
  chartAvg:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  cellRow:     { flexDirection: 'row', gap: 2 },
  cell:        { flex: 1, borderRadius: 2 },

  actStatRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  actStatCat:    { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted, width: 72 },
  actStatBarWrap:{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  actStatBar:    { height: '100%', borderRadius: radius.pill },
  actStatTime:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textPrimary, width: 40, textAlign: 'right' },
  actStatCount:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, width: 28, textAlign: 'right' },

  breakBar:   { flexDirection: 'row', height: 16, borderRadius: radius.sm, overflow: 'hidden', gap: 1 },
  legendRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  emptyNote:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  tooltip:    { position: 'absolute', top: 0, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.textPrimary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  tooltipTxt: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textPrimary },

  effectRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  effectCat:     { fontFamily: fonts.ui.medium,    fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  effectStats:   { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  effectVal:     { fontFamily: fonts.mono.regular,  fontSize: fontSize.xs, color: colors.textMuted },
  effectDiff:    { fontFamily: fonts.mono.bold,     fontSize: fontSize.xs },
  effectSamples: { fontFamily: fonts.mono.regular,  fontSize: fontSize.xs, color: colors.textMuted, marginLeft: spacing.sm },

  recordGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recordCard:    { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  recordCardRed: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.04)' },
  recordVal:     { fontFamily: fonts.mono.bold,   fontSize: fontSize.lg, color: colors.textPrimary },
  recordLabel:   { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs, color: colors.textMuted },

  badgeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge:             { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2, minWidth: 90 },
  badgeOn:           { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.06)' },
  badgeLocked:       { borderColor: colors.border },
  badgeName:         { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.primary },
  badgeNameLocked:   { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  badgeDesc:         { fontFamily: fonts.ui.regular, fontSize: 10, color: colors.textMuted },

  // Self-destruct flash
  sdFlash:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  sdFlashTxt: {
    fontFamily: fonts.mono.bold, fontSize: fontSize.xl, color: colors.danger,
    letterSpacing: 3, textAlign: 'center',
    shadowColor: colors.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20,
  },
  sdFlashSub: { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
