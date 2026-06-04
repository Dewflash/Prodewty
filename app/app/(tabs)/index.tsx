import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { db } from '../../src/db/schema';
import { MoodSettingsSheet } from '../../src/components/MoodSettingsSheet';
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
import { getRPGState, isInDeathState, selfDestruct, setCurrentMood, getCustomMoods, MOOD_FALLBACK_COLORS, type CustomMood } from '../../src/db/rpg';
import { resetDeathIgnore, getDeathCount, getQuestCompletedCount, getDungeonClearedCount } from '../../src/db/game';
import { triggerDeathCheck } from '../../src/db/deathCheckSignal';
import { triggerCurrencyRefresh } from '../../src/db/currencySignal';
import { getHealthState, getHealthTier, type HealthState } from '../../src/db/health';

type Period = 'week' | 'month' | 'year';

type MoodState = string;

// Soul Record permanent colors
const BLIGHT_COLOR = '#94A3B8'; // light grey
const VIGOR_COLOR  = '#15803D'; // dark green
const ANIMA_COLOR  = '#60A5FA'; // cool silvery blue (permanent)

const TIER_COLOR: Record<string, string> = {
  Depleted: '#EF4444', Critical: '#F87171', Danger: '#F97316',
  Weakened: '#FBBF24', Worn: '#A3E635', Stable: colors.success,
  Strong: '#34D399', Peak: '#38BDF8',
};

const ALL_HEALTH_TIERS = [
  { label: 'Peak',      range: '>90%',   xp: 'None',  hp: '+5/day'  },
  { label: 'Strong',    range: '70–90%', xp: 'None',  hp: '+5/day'  },
  { label: 'Stable',    range: '50–70%', xp: 'None',  hp: '+2/day'  },
  { label: 'Worn',      range: '30–50%', xp: '−5%',   hp: 'Neutral' },
  { label: 'Weakened',  range: '20–30%', xp: '−15%',  hp: '−2/day'  },
  { label: 'Danger',    range: '10–20%', xp: '−25%',  hp: '−5/day'  },
  { label: 'Critical',  range: '<10%',   xp: '−35%',  hp: '−10/day' },
  { label: 'Depleted',  range: '0%',     xp: '−50%',  hp: '−20/day' },
];

const MOOD_FALLBACK_PASSIVE: Record<string, string[]> = {
  driven:        ['+10% XP gain', '+5% coin drops'],
  burnout:       ['−20% XP gain', '−10% coins earned'],
  reminiscing:   ['+5% XP gain', 'neutral coin rate'],
  lonely:        ['−5% XP gain', 'neutral coin rate'],
  overstimulated:['−10% XP gain', '−5% mental recovery'],
  relapsed:      ['−30% XP gain', '−15% coins earned'],
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
function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  const rm = m % 60;
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
      <View style={{ position: 'relative' }}>
        <View style={[s.cellRow, { height: cellH }]} onLayout={e => setRowW(e.nativeEvent.layout.width)}>
          {vals.map((v,i) => (
            <Pressable key={i} style={[s.cell, { backgroundColor: scoreToColor(v) }]} onPressIn={() => pressIn(i)} onPressOut={pressOut} />
          ))}
        </View>
        {hovered !== null && (
          <View pointerEvents="none" style={[s.floatTooltip, { left: Math.max(0, Math.min(rowW - 72, tooltipLeft - 30)) }]}>
            <Text style={s.floatTooltipDate}>{tooltipLabel(hovered)}</Text>
            <Text style={s.floatTooltipVal}>{vals[hovered] !== null ? vals[hovered]?.toFixed(1) : '—'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function XPChart({ vals, cellH, period, dates }: { vals: number[]; cellH: number; period: Period; dates: string[] }) {
  const max = Math.max(...vals, 1);
  const [hoveredXP, setHoveredXP] = React.useState<{ i: number; v: number } | null>(null);
  const [rowW, setRowW] = React.useState(300);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function pressIn(i: number, v: number) { if (timer.current) clearTimeout(timer.current); setHoveredXP({ i, v }); }
  function pressOut() { timer.current = setTimeout(() => setHoveredXP(null), 1500); }
  const tooltipLeft = hoveredXP !== null ? Math.max(2, Math.min(rowW - 48, ((hoveredXP.i + 0.5) / vals.length) * rowW - 24)) : 0;
  const label = period === 'year' ? 'XP per week' : 'XP per day';
  return (
    <View style={s.chartBlock}>
      <View style={s.chartHeader}>
        <Text style={s.chartLabel}>{label}</Text>
        {hoveredXP && <Text style={[s.chartAvg, { color: colors.success }]}>{hoveredXP.v} XP</Text>}
      </View>
      <View style={{ position: 'relative' }}>
        <View style={[s.cellRow, { height: Math.max(cellH, 40), alignItems: 'flex-end' }]} onLayout={e => setRowW(e.nativeEvent.layout.width)}>
          {vals.map((v, i) => (
            <Pressable key={i} onPressIn={() => pressIn(i, v)} onPressOut={pressOut}
              style={[s.cell, { height: v ? Math.max((v / max) * Math.max(cellH, 40), 2) : 2, backgroundColor: v ? colors.success : colors.border, borderRadius: 2 }]}
            />
          ))}
        </View>
        {hoveredXP !== null && (
          <View pointerEvents="none" style={[s.floatTooltip, { left: Math.max(0, Math.min(rowW - 52, tooltipLeft - 26)), bottom: '100%' }]}>
            <Text style={s.floatTooltipVal}>{hoveredXP.v}</Text>
          </View>
        )}
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

function ActivityStatsSection({ stats, period }: { stats: ActivityTimeStat[]; period: Period }) {
  if (stats.length === 0) return <Text style={s.emptyNote}>No activity data yet.</Text>;
  const maxMins = Math.max(...stats.map(s => s.total_mins), 1);
  return (
    <View style={s.chartBlock}>
      <Text style={s.chartLabel}>Activity Stats <Text style={{ color: colors.border, fontSize: 10 }}>({period})</Text></Text>
      {stats.map((item, i) => (
        <View key={item.category} style={s.actStatRow}>
          <Text style={s.actStatCat} numberOfLines={1}>{item.category}</Text>
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

// ─── Mood settings sheet ──────────────────────────────────────────────────────

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
  const [customMoods, setCustomMoods] = useState<CustomMood[]>([]);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [todaySdCount, setTodaySdCount] = useState(0);
  const [showRevival, setShowRevival] = useState(false);
  const [effectsInfoVisible, setEffectsInfoVisible] = useState(false);
  const [moodInfoVisible, setMoodInfoVisible] = useState(false);
  const [soulRecordInfoVisible, setSoulRecordInfoVisible] = useState(false);
  const [moodSettingsVisible, setMoodSettingsVisible] = useState(false);
  const [deathCount, setDeathCount] = useState(0);
  const [revivalCount, setRevivalCount] = useState(0);
  const [questCount, setQuestCount] = useState(0);
  const [dungeonClearCount, setDungeonClearCount] = useState(0);
  const [vigorCount, setVigorCount] = useState(0);
  const [healthTierLabel, setHealthTierLabel] = useState('');
  const [effectsDialogVisible, setEffectsDialogVisible] = useState(false);

  // Shake + flash
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [sdFlashVisible, setSdFlashVisible] = useState(false);
  const [sdCount, setSdCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      // ── Immediate: tiny reads rendered above the fold before navigation settles ──
      const rpg = getRPGState();
      const h   = getHealthState();
      setRPGState(rpg);
      setCurrentMoodState(rpg.current_mood ?? 'driven');
      setCustomMoods(getCustomMoods());
      setSdCount(rpg.self_destruct_count ?? 0);
      setVigorCount(rpg.vigor ?? 0);
      setRevivalCount(rpg.revival_count ?? 0);
      setHealth(h);
      setHealthTierLabel(getHealthTier(Math.min(h.emotional, h.physical, h.mental)).label);
      setShowRevival(isInDeathState() && (rpg.death_acknowledged ?? 0) === 1);
      setDeathCount(getDeathCount());
      setQuestCount(getQuestCompletedCount());
      setDungeonClearCount(getDungeonClearedCount());

      // ── Deferred: heavy reads run after animation frame so navigation stays smooth ──
      const task = InteractionManager.runAfterInteractions(() => {
        if (!active) return;
        const today  = new Date().toISOString().split('T')[0];
        const all    = getLogs();
        const days   = period === 'week' ? 7 : 30;
        const recent = getRecentLogs(period === 'year' ? 365 : days);
        setAllLogs(all);
        setTodaySdCount(all.filter(l => l.entry_type === 'self_destruct' && l.log_date === today).length);
        setPeriodLogs(recent);
        setChartData(period === 'year' ? buildWeeklyData(recent) : buildDailyData(recent, days));
        setCatEffects(getCategoryEffects());
        setActStats(getActivityTimeStats(period));
      });

      return () => { active = false; task.cancel(); };
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
    triggerDeathCheck();
    triggerCurrencyRefresh();
  }

  function handleMoodSelect(mood: MoodState) {
    setCurrentMood(mood);
    setCurrentMoodState(mood);
  }

  const cellH = period === 'week' ? 10 : period === 'month' ? 6 : 4;

  // Memoised — only recompute when the underlying data actually changes
  const streak     = useMemo(() => rpgState?.streak_days ?? 0, [rpgState]);
  const moodVals   = useMemo(() => chartData.map(d => d.mood),   [chartData]);
  const energyVals = useMemo(() => chartData.map(d => d.energy), [chartData]);
  const prodVals   = useMemo(() => chartData.map(d => d.prod),   [chartData]);
  const xpVals     = useMemo(() => chartData.map(d => d.xp),     [chartData]);
  const dates      = useMemo(() => chartData.map(d => d.date),   [chartData]);
  const earned     = useMemo(() => earnedBadges(allLogs, streak), [allLogs, streak]);
  const breakdown  = useMemo(() => buildBreakdown(periodLogs),   [periodLogs]);
  const maxXP      = useMemo(() => allLogs.reduce((m, l) => Math.max(m, l.xp_awarded), 0), [allLogs]);
  const maxMood    = useMemo(() => allLogs.reduce((m, l) => l.mood_rating   ? Math.max(m, l.mood_rating)   : m, 0), [allLogs]);
  const maxNrg     = useMemo(() => allLogs.reduce((m, l) => l.energy_rating ? Math.max(m, l.energy_rating) : m, 0), [allLogs]);

  function moodColorFor(name: string): string {
    return customMoods.find(m => m.name === name)?.color ?? MOOD_FALLBACK_COLORS[name] ?? colors.primary;
  }

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
            <View style={s.xpGroup}>
            <XPBar
              level={rpgState.current_level}
              totalXP={rpgState.total_xp}
              xpToNext={rpgState.xp_to_next_level}
              title={rpgState.title}
              streakDays={rpgState.streak_days}
              frozen={(rpgState.streak_freezes ?? 0) > 0}
            />
            {/* Effects row — wraps when many tags active */}
            <View style={s.xpEffectsRow}>
              <View style={s.effectsLabel}>
                <Text style={s.effectsTitle}>Effects</Text>
                <TouchableOpacity onPress={() => setEffectsDialogVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="info" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={s.effectsTags}>
                {healthTierLabel ? (
                  <View style={[s.effectTag, { borderColor: TIER_COLOR[healthTierLabel] ?? colors.border }]}>
                    <Text style={[s.effectTagTxt, { color: TIER_COLOR[healthTierLabel] ?? colors.textMuted }]}>{healthTierLabel}</Text>
                  </View>
                ) : null}
                <View style={[s.effectTag, { borderColor: moodColorFor(currentMoodState), alignSelf: 'center' }]}>
                  <Text style={[s.effectTagTxt, { color: moodColorFor(currentMoodState) }]}>{currentMoodState}</Text>
                </View>
                {(vigorCount - sdCount) < -10 && (
                  <View style={[s.effectTag, { borderColor: colors.danger }]}>
                    <Text style={[s.effectTagTxt, { color: colors.danger }]}>−20% coins</Text>
                  </View>
                )}
                {(vigorCount - sdCount) > 0 && (
                  <View style={[s.effectTag, { borderColor: '#FF2400' }]}>
                    <Text style={[s.effectTagTxt, { color: '#FF2400' }]}>+gem</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Bonus row (streak freeze) */}
            <View style={s.bonusRow}>
              <Text style={s.bonusTitle}>Bonus</Text>
              <TouchableOpacity onPress={() => setEffectsDialogVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="info" size={12} color={colors.textMuted} />
              </TouchableOpacity>
              {(rpgState.streak_freezes ?? 0) > 0 ? (
                <View style={s.effectChip}>
                  <Text style={s.effectIcon}>❄</Text>
                  <Text style={s.effectText}>Streak Freeze × {rpgState.streak_freezes}</Text>
                </View>
              ) : (
                <Text style={s.bonusNone}>None active</Text>
              )}
            </View>
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

        {/* Soul Record: Blight / Vigor / Anima */}
        <View style={s.tollCard}>
          <View style={s.tollHeader}>
            <Text style={s.tollTitle}>SOUL RECORD</Text>
            <TouchableOpacity onPress={() => setSoulRecordInfoVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: spacing.sm }}>
              <Feather name="info" size={13} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleSelfDestruct} style={s.sdBtn}>
              <Text style={s.sdBtnTxt}>SELF DESTRUCT</Text>
            </Pressable>
          </View>
          <View style={s.tollRow}>
            <View style={s.tollItem}>
              <Feather name="frown" size={16} color={BLIGHT_COLOR} />
              <Text style={[s.tollVal, { color: BLIGHT_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{sdCount}</Text>
              <Text style={[s.tollLabel, { color: BLIGHT_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Blight</Text>
            </View>
            <View style={s.tollSep} />
            <View style={s.tollItem}>
              <Feather name="heart" size={16} color={VIGOR_COLOR} />
              <Text style={[s.tollVal, { color: VIGOR_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{vigorCount}</Text>
              <Text style={[s.tollLabel, { color: VIGOR_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Vigor</Text>
            </View>
            <View style={s.tollSep} />
            <View style={s.tollItem}>
              <Feather name="aperture" size={16} color={ANIMA_COLOR} />
              <Text style={[s.tollVal, { color: ANIMA_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {vigorCount - sdCount >= 0 ? `+${vigorCount - sdCount}` : vigorCount - sdCount}
              </Text>
              <Text style={[s.tollLabel, { color: ANIMA_COLOR }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Anima</Text>
            </View>
          </View>
        </View>

        {/* Mood */}
        <View style={s.moodCard}>
          <View style={s.moodCardHeader}>
            <Text style={s.sectionHead}>Mood</Text>
            <TouchableOpacity onPress={() => setMoodInfoVisible(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Feather name="info" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setMoodSettingsVisible(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Feather name="settings" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.moodStateRow}>
            {customMoods.map(m => {
              const active = currentMoodState === m.name;
              return (
                <Pressable key={m.name} onPress={() => handleMoodSelect(m.name)} style={[s.moodStateBtn, { borderColor: active ? m.color : colors.border }, active && { backgroundColor: `${m.color}15` }]}>
                  <Text style={[s.moodStateTxt, { color: active ? m.color : colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{m.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.strip}>
          {[
            { val: allLogs.length,   label: 'Logs'   },
            { val: questCount,        label: 'Quests' },
            { val: dungeonClearCount, label: 'Clears' },
            { val: streak,            label: 'Streak' },
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
        <XPChart vals={xpVals} cellH={cellH} period={period} dates={dates} />

        {/* Activity Stats */}
        <ActivityStatsSection stats={actStats} period={period} />

        {/* Breakdown */}
        <BreakdownChart data={breakdown} />

        {/* Activity Effects */}
        {catEffects.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeadRow}>
              <Text style={s.sectionHead}>Activity Effects</Text>
              <TouchableOpacity onPress={() => setEffectsInfoVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="info" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {catEffects.map(e => {
              const pre  = e.baselineMood != null ? String(e.baselineMood) : '—';
              const post = e.nextDayMood  != null ? String(e.nextDayMood)  : '—';
              const diff = e.nextDayMood != null && e.baselineMood != null
                ? (e.nextDayMood - e.baselineMood).toFixed(1) : null;
              const positive = diff !== null && parseFloat(diff) >= 0;
              return (
                <View key={e.category} style={s.effectRow}>
                  <Text style={s.effectCat} numberOfLines={1}>{e.category}</Text>
                  <View style={s.effectStats}>
                    <Text style={s.effectLabel}>Pre</Text>
                    <Text style={s.effectNum}>{pre}</Text>
                    <Text style={s.effectLabel}>Post</Text>
                    <Text style={s.effectNum}>{post}</Text>
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
              { label: 'Total XP earned',     value: rpgState?.total_xp_earned ?? 0 },
              { label: 'Total XP spent',      value: Math.max(0, (rpgState?.total_xp_earned ?? 0) - (rpgState?.spendable_xp ?? 0)) },
              { label: 'Best mood',           value: maxMood || '—' },
              { label: 'Best energy',         value: maxNrg  || '—' },
              { label: 'Current streak',      value: `${streak}d`   },
              { label: 'Self-destruct count', value: sdCount,            red: sdCount > 0    },
              { label: 'Total deaths',        value: deathCount || '—', red: deathCount > 0 },
            ].map(r => (
              <View key={r.label} style={[s.recordCard, (r as any).red && s.recordCardRed]}>
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

      {/* Effects Dialogue */}
      <Modal visible={effectsDialogVisible} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setEffectsDialogVisible(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.infoHandle} />
            <Text style={s.infoSheetTitle}>Active Effects</Text>
            <View style={s.infoSheetDiv} />

            <Text style={[s.effectDialogSection, { marginTop: spacing.sm }]}>HEALTH (lowest bar)</Text>
            {ALL_HEALTH_TIERS.map(t => {
              const isActive = t.label === healthTierLabel;
              return (
                <View key={t.label} style={[s.effectDialogRow, isActive && { backgroundColor: `${TIER_COLOR[t.label]}15`, borderRadius: 6 }]}>
                  <View style={[s.effectDialogDot, { backgroundColor: TIER_COLOR[t.label] }]} />
                  <Text style={[s.effectDialogLabel, { color: TIER_COLOR[t.label] }]}>{t.label}</Text>
                  <Text style={s.effectDialogRange}>{t.range}</Text>
                  <Text style={s.effectDialogStat}>XP {t.xp}</Text>
                  <Text style={s.effectDialogStat}>HP {t.hp}</Text>
                  {isActive && <Text style={s.effectDialogActive}>● NOW</Text>}
                </View>
              );
            })}

            <View style={s.infoSheetDiv} />
            <Text style={s.effectDialogSection}>MOOD</Text>
            {customMoods.map(m => {
              const isActive = m.name === currentMoodState;
              const effects = m.passive_effect ?? MOOD_FALLBACK_PASSIVE[m.name]?.join(' · ') ?? '—';
              return (
                <View key={m.name} style={[s.effectDialogRow, isActive && { backgroundColor: `${m.color}15`, borderRadius: 6 }]}>
                  <View style={[s.effectDialogDot, { backgroundColor: m.color }]} />
                  <Text style={[s.effectDialogLabel, { color: m.color }]}>{m.name}</Text>
                  <Text style={s.effectDialogEffects}>{effects}</Text>
                  {isActive && <Text style={s.effectDialogActive}>● NOW</Text>}
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Current Mood info modal */}
      <Modal visible={moodInfoVisible} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setMoodInfoVisible(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.infoHandle} />
            <Text style={s.infoSheetTitle}>Current Mood</Text>
            <View style={s.infoSheetDiv} />
            <Text style={s.infoSheetText}>Your active mood sets Passive Effects — modifiers on XP and coin gains for every activity while this mood is active.</Text>
            <Text style={s.infoSheetText}>Tap the gear icon to customise name, colour, passive effect, and MP regeneration rate.</Text>
            <Text style={s.infoSheetText}>Changing mood here syncs to the Log page, and vice versa.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Soul Record info modal */}
      <Modal visible={soulRecordInfoVisible} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setSoulRecordInfoVisible(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.infoHandle} />
            <Text style={s.infoSheetTitle}>Soul Record</Text>
            <View style={s.infoSheetDiv} />
            <Text style={s.infoSheetText}><Text style={{ color: '#64748B', fontFamily: fonts.ui.semibold }}>Blight</Text> — increments each Self Destruct press. Represents corruption.</Text>
            <Text style={s.infoSheetText}><Text style={{ color: colors.success, fontFamily: fonts.ui.semibold }}>Vigor</Text> — +1 every clean day (no self-destruct). Represents resilience built over time.</Text>
            <Text style={s.infoSheetText}><Text style={{ color: colors.primary, fontFamily: fonts.ui.semibold }}>Anima</Text> — Vigor − Blight. Positive = recovering. Negative = corrupted.</Text>
            <Text style={s.infoSheetText}>Anima &lt; −10: coin drops across all activities reduced by 20%.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mood settings modal */}
      <MoodSettingsSheet
        visible={moodSettingsVisible}
        currentMood={currentMoodState}
        onClose={() => { setMoodSettingsVisible(false); setCustomMoods(getCustomMoods()); }}
      />

      {/* Activity effects info modal */}
      <Modal visible={effectsInfoVisible} transparent animationType="slide">
        <Pressable style={s.sheetOverlay} onPress={() => setEffectsInfoVisible(false)}>
          <Pressable style={s.infoSheet} onPress={() => {}}>
            <View style={s.infoHandle} />
            <Text style={s.infoSheetTitle}>Activity Effects — How it works</Text>
            <View style={s.infoSheetDiv} />
            <Text style={s.infoSheetText}>Pre: average mood score from the closest recorded mood log before each session of that activity type.</Text>
            <Text style={s.infoSheetText}>Post: average mood score across all logs recorded after the earliest session of that activity.</Text>
            <Text style={s.infoSheetText}>The change (±) shows the mood shift associated with doing this activity.</Text>
            <Text style={s.infoSheetText}>× count = total all-time sessions logged for that category (not period-filtered).</Text>
            <Text style={s.infoSheetText}>Category weights (1–5) are XP multipliers when you submit a log — separate from these stats.</Text>
          </Pressable>
        </Pressable>
      </Modal>

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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  xpGroup:      { gap: 10 },
  xpEffectsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  effectsLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  effectsTags:  { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap' },

  bonusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  bonusTitle: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  bonusNone:  { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },

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

  sdBtn:    { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  sdBtnTxt: { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.danger, letterSpacing: 1 },

  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'nowrap' },

  // Effects row (below XP bar)
  effectsRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  effectsTitle: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  effectTag:    { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, flexShrink: 0 },
  effectTagTxt: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 1 },

  // Effects dialogue
  effectDialogSection: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, marginBottom: 2 },
  effectDialogRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 4 },
  effectDialogDot:     { width: 6, height: 6, borderRadius: 3 },
  effectDialogLabel:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, width: 70 },
  effectDialogRange:   { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted, width: 50 },
  effectDialogStat:    { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted, width: 64 },
  effectDialogEffects: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted, flex: 1 },
  effectDialogActive:  { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.primary, marginLeft: 'auto' },

  tollCard:    { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  animaDebuffNote: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.danger },
  tollHeader:  { flexDirection: 'row', alignItems: 'center' },
  tollTitle:   { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 2 },
  tollRow:     { flexDirection: 'row', alignItems: 'center' },
  tollItem:    { flex: 1, alignItems: 'center', gap: 3, paddingVertical: spacing.xs, minWidth: 0 },
  tollSep:     { width: 1, height: 56, backgroundColor: colors.border, alignSelf: 'center', flexShrink: 0 },
  tollVal:     { fontFamily: fonts.mono.bold, fontSize: fontSize.xl, width: '100%', textAlign: 'center' },
  tollLabel:   { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 1, width: '100%', textAlign: 'center' },
  tollEffect:  { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.danger, textAlign: 'center' },

  moodCard:        { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  moodCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  moodSettingsBtn: { alignSelf: 'flex-end', marginTop: spacing.xs },

  sheetOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  infoSheet:      { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  infoHandle:     { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  infoSheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  infoSheetDiv:   { height: 1, backgroundColor: colors.border },
  infoSheetText:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  // Current mood
  section:           { gap: spacing.md },
  sectionHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sectionSub:        { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.sm },
  moodStateBadge:    { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  moodStateBadgeTxt: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, letterSpacing: 1 },
  moodStateRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodStateBtn:      { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5, flexShrink: 0 },
  moodStateTxt:      { fontFamily: fonts.ui.medium, fontSize: fontSize.xs },

  strip:      { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'space-evenly' },
  stripItem:  { alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm },
  stripVal:   { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.textPrimary },
  stripLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  stripDiv:   { width: 1, height: 32, backgroundColor: colors.border },

  periodRow:   { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  periodBtn:   { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  periodBtnOn: { backgroundColor: colors.primary },
  periodTxt:   { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  periodTxtOn: { color: colors.bg },

  chartBlock:  { gap: spacing.xs },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartLabel:  { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.5, flex: 1 },
  chartAvg:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 0 },
  cellRow:     { flexDirection: 'row', gap: 2 },
  cell:        { flex: 1, borderRadius: 2 },

  actStatRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  actStatCat:    { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted, width: 68 },
  actStatBarWrap:{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  actStatBar:    { height: '100%', borderRadius: radius.pill },
  actStatTime:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textPrimary, width: 62, textAlign: 'right' },
  actStatCount:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, width: 30, textAlign: 'right' },

  breakBar:   { flexDirection: 'row', height: 16, borderRadius: radius.sm, overflow: 'hidden', gap: 1 },
  legendRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  emptyNote:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  floatTooltip:     { position: 'absolute', bottom: '100%', marginBottom: 4, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  floatTooltipDate: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted },
  floatTooltipVal:  { fontFamily: fonts.mono.bold, fontSize: 13, color: colors.textPrimary },

  effectRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  effectCat:     { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textPrimary, width: 68 },
  effectStats:   { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'flex-end' },
  effectLabel:   { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted },
  effectNum:     { fontFamily: fonts.mono.bold, fontSize: 10, color: colors.textPrimary, minWidth: 22, textAlign: 'right' },
  effectDiff:    { fontFamily: fonts.mono.bold, fontSize: 10, minWidth: 32, textAlign: 'right' },
  effectSamples: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted, minWidth: 24, textAlign: 'right' },

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
