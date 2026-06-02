import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { getLogsForDate, getLogsForMonth, getWeeklyLogs, deleteLog, searchLogs, editLog, type ActivityLog } from '../../src/db/logs';
import { TopRibbon } from '../../src/components/TopRibbon';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getFirstDayOffset(y: number, m: number) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function resolveDate(l: ActivityLog) {
  return l.log_date ?? l.created_at.split('T')[0].split(' ')[0];
}
function scoreColor(v: number | null) {
  if (v === null) return colors.primary;
  return colors.moodActive[Math.min(Math.max(Math.round(v) - 1, 0), 9)];
}
function parseCategories(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}
function weekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const firstJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const col = scoreColor(value);
  return (
    <View style={[chip.wrap, { borderColor: col }]}>
      <Text style={chip.label}>{label}</Text>
      <Text style={[chip.val, { color: col }]}>{value}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  label: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  val: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
});

function MoodCard({ log, onSaved }: { log: ActivityLog; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <View style={cd.card}>
      <Text style={cd.moodTitle}>Daily Entry</Text>
      <View style={cd.topRow}>
        <View style={cd.scores}>
          <ScoreChip label="Mood" value={log.mood_rating} />
          <ScoreChip label="Energy" value={log.energy_rating} />
          <ScoreChip label="Prod" value={log.productivity_rating} />
        </View>
        <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
      </View>
      {log.journal_entry ? (
        <Text style={cd.journal}>{log.journal_entry}</Text>
      ) : null}
      <View style={cd.footer}>
        <Text style={cd.entryBadge}>Mood</Text>
        <Pressable onPress={() => setEditing(true)} style={{ marginRight: spacing.sm }}>
          <Feather name="edit-2" size={13} color={colors.textMuted} />
        </Pressable>
        <Text style={cd.time}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
      </View>
      {editing && <EditModal log={log} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </View>
  );
}

function EditModal({ log, onClose, onSaved }: { log: ActivityLog; onClose: () => void; onSaved: () => void }) {
  const isMood = log.entry_type === 'mood';
  const [note,   setNote]   = useState(log.description || '');
  const [well,   setWell]   = useState(log.what_went_well || '');
  const [revel,  setRevel]  = useState(log.what_to_improve || '');
  const [journl, setJournl] = useState(log.journal_entry || '');

  function save() {
    editLog(log.id, {
      note:           !isMood ? note   : null,
      what_went_well:            well,
      what_to_improve:           revel,
      journal_entry:  isMood  ? journl : null,
    });
    onSaved();
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={em.kbAvoid}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={em.sheet}>
          <Text style={em.title}>Edit {isMood ? 'Mood Entry' : 'Activity'}</Text>
          <Text style={em.locked}>Category, date, XP and duration are locked.</Text>
          {!isMood && <><Text style={em.label}>Note</Text><TextInput style={em.input} value={note} onChangeText={setNote} multiline placeholderTextColor={colors.textMuted} placeholder="Note..." /></>}
          <Text style={em.label}>What went well?</Text>
          <TextInput style={em.input} value={well} onChangeText={setWell} multiline placeholderTextColor={colors.textMuted} placeholder="Wins..." />
          <Text style={em.label}>Revelation</Text>
          <TextInput style={em.input} value={revel} onChangeText={setRevel} multiline placeholderTextColor={colors.textMuted} placeholder="Revelation..." />
          {isMood && <><Text style={em.label}>Journal</Text><TextInput style={em.input} value={journl} onChangeText={setJournl} multiline placeholderTextColor={colors.textMuted} placeholder="Journal..." /></>}
          <Pressable onPress={save} style={em.saveBtn}><Text style={em.saveBtnText}>Save</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = StyleSheet.create({
  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, paddingBottom: 40, maxHeight: '85%' },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  locked: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  label: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, backgroundColor: colors.bg, minHeight: 52, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});

function ActivityCard({ log, onDelete }: { log: ActivityLog; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const cats = parseCategories(log.categories);
  const primary = cats[0] || log.category || '—';
  const isWeekly = log.log_type === 'weekly';

  function confirmDelete() {
    Alert.alert(
      'Delete Activity',
      `Remove "${primary}"? ${log.xp_awarded} XP will be deducted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteLog(log.id); onDelete(); } },
      ],
    );
  }

  return (
    <View style={cd.card}>
      <View style={cd.topRow}>
        <View style={cd.tagRow}>
          <View style={[cd.tag, isWeekly && { borderColor: colors.accent }]}>
            <Text style={[cd.tagText, isWeekly && { color: colors.accent }]}>{primary}</Text>
          </View>
          {isWeekly && <View style={cd.tag}><Text style={cd.tagText}>Weekly</Text></View>}
        </View>
        <View style={cd.rightRow}>
          <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
          <Pressable onPress={() => setEditing(true)} style={cd.deleteBtn}>
            <Feather name="edit-2" size={13} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={confirmDelete} style={cd.deleteBtn}>
            <Feather name="trash-2" size={14} color={colors.danger} />
          </Pressable>
        </View>
        {editing && <EditModal log={log} onClose={() => setEditing(false)} onSaved={onDelete} />}
      </View>
      {log.description ? <Text style={cd.note}>{log.description}</Text> : null}
      {log.duration_mins ? <Text style={cd.meta}>{log.duration_mins} min</Text> : null}
      {log.what_went_well ? (
        <View style={cd.noteRow}><Text style={cd.noteLabel}>Well: </Text><Text style={cd.noteText} numberOfLines={2}>{log.what_went_well}</Text></View>
      ) : null}
      {log.what_to_improve ? (
        <View style={cd.noteRow}><Text style={cd.noteLabel}>Improve: </Text><Text style={cd.noteText} numberOfLines={2}>{log.what_to_improve}</Text></View>
      ) : null}
      {log.journal_entry && isWeekly ? (
        <Text style={cd.journal}>{log.journal_entry}</Text>
      ) : null}
      <Text style={cd.time}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
    </View>
  );
}

const cd = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm + 4, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scores: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  tagRow: { flexDirection: 'row', gap: 4, flex: 1, flexWrap: 'wrap' },
  tag: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xp: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.success },
  deleteBtn: { padding: 4 },
  meta: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  journal: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  noteRow: { flexDirection: 'row' },
  noteLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  noteText: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary, flex: 1 },
  note: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  moodTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.accent },
  entryBadge: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.accent, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  time: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, alignSelf: 'flex-end' },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const now = new Date();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(todayStr());
  const [monthLogs, setMonthLogs] = useState<ActivityLog[]>([]);
  const [dayLogs, setDayLogs] = useState<ActivityLog[]>([]);
  const [weekGroups, setWeekGroups] = useState<{ weekStart: string; logs: ActivityLog[] }[]>([]);
  const [monthPicker, setMonthPicker] = useState(false);
  const [yearPicker, setYearPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ActivityLog[] | null>(null);

  function reload() {
    if (tab === 'daily') {
      setMonthLogs(getLogsForMonth(year, month));
      setDayLogs(getLogsForDate(selected));
    } else {
      setWeekGroups(getWeeklyLogs());
    }
  }

  useFocusEffect(useCallback(() => { reload(); }, [tab, year, month, selected]));

  const moodByDate: Record<string, number> = {};
  for (const l of monthLogs) {
    if (l.entry_type === 'mood' && l.mood_rating) {
      moodByDate[resolveDate(l)] = l.mood_rating;
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function handleSearch(q: string) {
    setSearchQuery(q);
    setSearchResults(q.trim() ? searchLogs(q) : null);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <SwipeNavWrapper currentIndex={1}>
    <SafeAreaView style={s.safe}>
      <TopRibbon title="History" />

      {/* Tab toggle */}
      <View style={s.tabRow}>
        {(['daily', 'weekly'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'daily' ? (
        <ScrollView contentContainerStyle={s.content}>

          {/* Search */}
          <View style={s.searchRow}>
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search notes & journal..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => handleSearch('')}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Header */}
          <View style={s.headerRow}>
            <Text style={s.heading}>History</Text>
            <View style={s.pickerRow}>
              <Pressable onPress={prevMonth} style={s.arrowBtn}>
                <Feather name="chevron-left" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable style={s.pickerBtn} onPress={() => setMonthPicker(true)}>
                <Text style={s.pickerText}>{MONTHS[month - 1]}</Text>
              </Pressable>
              <Pressable onPress={nextMonth} style={s.arrowBtn}>
                <Feather name="chevron-right" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable style={s.pickerBtn} onPress={() => setYearPicker(true)}>
                <Text style={s.pickerText}>{year}</Text>
              </Pressable>
            </View>
          </View>

          {/* Calendar */}
          <View style={s.calendar}>
            <View style={s.calRow}>
              {DAY_LABELS.map(d => <Text key={d} style={s.dayLabel}>{d}</Text>)}
            </View>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <View key={row} style={s.calRow}>
                {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  if (!day) return <View key={col} style={s.emptyCell} />;
                  const ds = dateStr(year, month, day);
                  const moodRating = moodByDate[ds];
                  const hasLog = ds in moodByDate;
                  const isSel = selected === ds;
                  const isToday = ds === todayStr();
                  return (
                    <Pressable key={col} onPress={() => setSelected(ds)}
                      style={[s.cell, isSel && s.cellSel, isToday && !isSel && s.cellToday]}>
                      <Text style={[s.cellNum, isSel && s.cellNumSel]}>{day}</Text>
                      {hasLog && (
                      <View style={[s.dot, {
                        backgroundColor: isSel
                          ? colors.bg
                          : colors.moodActive[Math.min(Math.max((moodRating ?? 5) - 1, 0), 9)],
                      }]} />
                    )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Search results override calendar day */}
          {searchResults !== null ? (
            <>
              <View style={s.dayHeader}>
                <Text style={s.dayTitle}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</Text>
              </View>
              {searchResults.length === 0
                ? <Text style={s.emptyNote}>Nothing found.</Text>
                : searchResults.map(log => <ActivityCard key={log.id} log={log} onDelete={reload} />)
              }
            </>
          ) : (
            <>
              <View style={s.dayHeader}>
                <Text style={s.dayTitle}>
                  {selected === todayStr() ? 'Today' : new Date(selected + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              {(() => {
                const filteredLogs = dayLogs.filter(l => l.log_type !== 'weekly');
                return filteredLogs.length === 0
                  ? <Text style={s.emptyNote}>No logs for this date.</Text>
                  : filteredLogs.map(log =>
                      log.entry_type === 'mood'
                        ? <MoodCard key={log.id} log={log} onSaved={reload} />
                        : <ActivityCard key={log.id} log={log} onDelete={reload} />
                    );
              })()}
            </>
          )}
        </ScrollView>
      ) : (
        // Weekly tab
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.heading}>Weekly Logs</Text>
          {weekGroups.length === 0
            ? <Text style={s.emptyNote}>No weekly logs yet.</Text>
            : weekGroups.map(({ weekStart, logs }) => (
                <View key={weekStart} style={s.weekGroup}>
                  <Text style={s.weekHeading}>
                    Week {weekNumber(weekStart)}, {weekStart.split('-')[0]}
                    {'  ·  '}
                    {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                  {logs.map(log => (
                    <ActivityCard key={log.id} log={log} onDelete={() => setWeekGroups(getWeeklyLogs())} />
                  ))}
                </View>
              ))
          }
        </ScrollView>
      )}

      {/* Month picker */}
      <Modal visible={monthPicker} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setMonthPicker(false)}>
          <View style={s.pickerSheet}>
            {MONTHS.map((m, i) => (
              <Pressable key={m} onPress={() => { setMonth(i + 1); setMonthPicker(false); }}
                style={[s.pickerItem, month === i + 1 && s.pickerItemActive]}>
                <Text style={[s.pickerItemText, month === i + 1 && s.pickerItemTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Year picker */}
      <Modal visible={yearPicker} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setYearPicker(false)}>
          <View style={[s.pickerSheet, { paddingVertical: spacing.md }]}>
            {years.map(y => (
              <Pressable key={y} onPress={() => { setYear(y); setYearPicker(false); }}
                style={[s.pickerItem, year === y && s.pickerItemActive]}>
                <Text style={[s.pickerItemText, year === y && s.pickerItemTextActive]}>{y}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  arrowBtn: { padding: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  pickerRow: { flexDirection: 'row', gap: spacing.sm },
  pickerBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pickerText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  calendar: { gap: 4 },
  calRow: { flexDirection: 'row' },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, paddingBottom: spacing.xs },
  emptyCell: { flex: 1, aspectRatio: 1 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellSel: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1, borderColor: colors.primary },
  cellNum: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  cellNumSel: { color: colors.bg, fontFamily: fonts.ui.medium },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dayHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  dayTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  emptyNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted },
  weekGroup: { gap: spacing.sm },
  weekHeading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.primary, paddingTop: spacing.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerSheet: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: spacing.sm, width: 220 },
  pickerItem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pickerItemActive: { backgroundColor: 'rgba(56,189,248,0.08)' },
  pickerItemText: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary },
  pickerItemTextActive: { color: colors.primary, fontFamily: fonts.ui.medium },
});
