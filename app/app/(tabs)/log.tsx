import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { CategoryGrid } from '../../src/components/CategoryGrid';
import { MoodSelector } from '../../src/components/MoodSelector';
import { useAppStore } from '../../src/store/useAppStore';
import { getCategories } from '../../src/db/categories';
import { getHabits, addHabit } from '../../src/db/habits';
import { createActivityLog, upsertMoodLog, getMoodLogForDate } from '../../src/db/logs';
import { getRPGState } from '../../src/db/rpg';

type LogMode = 'daily' | 'weekly' | 'other';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getFirstDayOffset(y: number, m: number) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
function padded(n: number) { return String(n).padStart(2, '0'); }
function dateStr(y: number, m: number, d: number) {
  return `${y}-${padded(m)}-${padded(d)}`;
}
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${padded(d.getMonth()+1)}-${padded(d.getDate())}`;
}

export default function LogScreen() {
  const { categories, habits, setCategories, setHabits, setRPGState } = useAppStore();

  const [logMode, setLogMode] = useState<LogMode>('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [datePicker, setDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [productivity, setProductivity] = useState<number | null>(null);
  const [duration, setDuration] = useState('');
  const [journal, setJournal] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [checkedHabits, setCheckedHabits] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const [originalMood, setOriginalMood] = useState<{ m: number; e: number; p: number } | null>(null);

  const [habitModal, setHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitWeight, setNewHabitWeight] = useState(3);

  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpY = useRef(new Animated.Value(0)).current;
  const [lastXP, setLastXP] = useState(0);

  function loadMoodForDate(date: string) {
    try {
      const moodLog = getMoodLogForDate(date);
      if (moodLog) {
        setMood(moodLog.mood_rating);
        setEnergy(moodLog.energy_rating);
        setProductivity(moodLog.productivity_rating);
        setOriginalMood({ m: moodLog.mood_rating!, e: moodLog.energy_rating!, p: moodLog.productivity_rating! });
      } else {
        setMood(null); setEnergy(null); setProductivity(null);
        setOriginalMood(null);
      }
    } catch {}
  }

  useFocusEffect(
    useCallback(() => {
      setCategories(getCategories());
      setHabits(getHabits());
      if (logMode !== 'weekly') loadMoodForDate(selectedDate);
    }, []),
  );

  useEffect(() => {
    if (logMode !== 'weekly') loadMoodForDate(selectedDate);
    else { setMood(null); setEnergy(null); setProductivity(null); setOriginalMood(null); }
  }, [selectedDate, logMode]);

  function showXPPopup(xp: number) {
    setLastXP(xp);
    xpY.setValue(0);
    xpOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(xpY, { toValue: -48, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(xpOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function toggleHabit(id: number) {
    const next = new Set(checkedHabits);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedHabits(next);
  }

  function handleAddHabit() {
    if (!newHabitName.trim()) return;
    addHabit(newHabitName.trim(), newHabitWeight);
    setHabits(getHabits());
    setNewHabitName(''); setNewHabitWeight(3); setHabitModal(false);
  }

  function selectDate(ds: string) {
    setSelectedDate(ds);
    setDatePicker(false);
  }

  function resetForm() {
    setSelectedCat(null); setNote('');
    setDuration(''); setJournal(''); setWentWell(''); setToImprove('');
    setCheckedHabits(new Set());
    if (logMode === 'other') { setLogMode('daily'); setSelectedDate(todayStr()); }
    setMood(null); setEnergy(null); setProductivity(null); setOriginalMood(null);
  }

  async function handleSubmit() {
    const hasActivity = selectedCat !== null;
    const hasMood = mood !== null && energy !== null && productivity !== null;
    if (!hasActivity && !hasMood) return;
    setSubmitting(true);

    try {
      const catWeightMap: Record<string, number> = {};
      for (const c of categories) catWeightMap[c.name] = c.weight;

      let totalXP = 0;

      if (hasActivity) {
        const dur = duration ? parseInt(duration, 10) : undefined;
        const completedHabits = habits.filter(h => checkedHabits.has(h.id)).map(h => ({ name: h.name, weight: h.weight }));
        const r = createActivityLog({
          log_date: selectedDate,
          log_type: logMode === 'weekly' ? 'weekly' : 'daily',
          week_start: logMode === 'weekly' ? getWeekStart() : undefined,
          selectedCategories: [{ name: selectedCat!, weight: catWeightMap[selectedCat!] ?? 3 }],
          note: note || undefined,
          duration_mins: dur && !isNaN(dur) ? dur : undefined,
          journal_entry: logMode === 'weekly' ? journal || undefined : undefined,
          what_went_well: wentWell || undefined,
          what_to_improve: toImprove || undefined,
          completedHabits,
        });
        totalXP += r.xp_awarded;
      }

      if (hasMood && logMode !== 'weekly') {
        const moodChanged = !originalMood ||
          mood !== originalMood.m || energy !== originalMood.e || productivity !== originalMood.p;
        const hasJournal = journal.trim().length > 0;

        if (moodChanged || hasJournal) {
          const r = upsertMoodLog({
            log_date: selectedDate,
            mood_rating: mood!,
            energy_rating: energy!,
            productivity_rating: productivity!,
            journal_entry: journal || undefined,
          });
          totalXP += r.xp_awarded;
        }
      }

      showXPPopup(totalXP); // show even on 0 so user knows the log was saved
      setRPGState(getRPGState());
      resetForm();
      loadMoodForDate(todayStr());
    } catch (e: unknown) {
      Alert.alert('Log failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const hasActivity = selectedCat !== null;
  const hasMood = mood !== null && energy !== null && productivity !== null;
  const canSubmit = (hasActivity || hasMood) && !submitting;
  const showMoodSection = logMode !== 'weekly';

  // Calendar grid for date picker
  const daysInPickerMonth = getDaysInMonth(pickerYear, pickerMonth);
  const pickerOffset = getFirstDayOffset(pickerYear, pickerMonth);
  const pickerCells: (number | null)[] = [
    ...Array(pickerOffset).fill(null),
    ...Array.from({ length: daysInPickerMonth }, (_, i) => i + 1),
  ];
  while (pickerCells.length % 7 !== 0) pickerCells.push(null);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Mode selector */}
          <View style={s.modeRow}>
            {(['daily', 'weekly', 'other'] as LogMode[]).map(m => (
              <Pressable key={m} onPress={() => { setLogMode(m); if (m !== 'other') setSelectedDate(todayStr()); }}
                style={[s.modeBtn, logMode === m && s.modeBtnActive]}>
                <Text style={[s.modeBtnText, logMode === m && s.modeBtnTextActive]}>
                  {m === 'other' ? 'Past Date' : m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Date display for Other mode */}
          {logMode === 'other' && (
            <Pressable style={s.dateRow} onPress={() => setDatePicker(true)}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={s.dateText}>{selectedDate}</Text>
              <Feather name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Activity */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Activity</Text>
            <CategoryGrid
              categories={categories}
              selected={selectedCat ? [selectedCat] : []}
              onSelect={(names) => {
                const added = names.find(n => n !== selectedCat);
                setSelectedCat(added ?? null);
              }}
              onAdded={() => setCategories(getCategories())}
            />
          </View>

          {/* Note — title/description for this activity */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Note</Text>
            <TextInput style={s.textArea} placeholder="What did you work on?"
              placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} multiline />
          </View>

          {/* Duration */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Duration (min)</Text>
            <TextInput style={s.shortInput} placeholder="Optional" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={duration} onChangeText={setDuration} />
          </View>

          {/* Mood/Energy/Productivity — daily only */}
          {showMoodSection && (
            <>
              <View style={s.section}><MoodSelector value={mood} onChange={setMood} label="Mood" /></View>
              <View style={s.section}><MoodSelector value={energy} onChange={setEnergy} label="Energy" /></View>
              <View style={s.section}><MoodSelector value={productivity} onChange={setProductivity} label="Productivity" /></View>
            </>
          )}

          {/* Journal — daily only, lives with mood log */}
          {showMoodSection && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Journal Entry</Text>
              <TextInput style={s.textArea} placeholder="What happened today?"
                placeholderTextColor={colors.textMuted} value={journal} onChangeText={setJournal} multiline />
            </View>
          )}

          {/* Weekly journal */}
          {logMode === 'weekly' && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Weekly Journal</Text>
              <TextInput style={s.textArea} placeholder="Reflection for this week..."
                placeholderTextColor={colors.textMuted} value={journal} onChangeText={setJournal} multiline />
            </View>
          )}

          {/* Habits */}
          <View style={s.section}>
            <View style={s.rowBetween}>
              <Text style={s.sectionLabel}>Habits</Text>
              <Pressable onPress={() => setHabitModal(true)}><Text style={s.addLink}>+ Add</Text></Pressable>
            </View>
            {habits.length === 0
              ? <Text style={s.emptyNote}>No habits yet.</Text>
              : habits.map(habit => (
                <Pressable key={habit.id} style={s.habitRow} onPress={() => toggleHabit(habit.id)}>
                  <View style={[s.checkbox, checkedHabits.has(habit.id) && s.checkboxChecked]}>
                    {checkedHabits.has(habit.id) && <Feather name="check" size={11} color={colors.bg} />}
                  </View>
                  <Text style={s.habitName}>{habit.name}</Text>
                  <Text style={s.habitWeight}>w{habit.weight}</Text>
                </Pressable>
              ))
            }
          </View>

          {/* Reflection — what went well + insight (formerly what to improve) */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>What went well?</Text>
            <TextInput style={s.textArea} placeholder="Wins..." placeholderTextColor={colors.textMuted}
              value={wentWell} onChangeText={setWentWell} multiline />
            <Text style={[s.sectionLabel, { marginTop: spacing.sm }]}>Insight</Text>
            <TextInput style={s.textArea} placeholder="What to carry forward..."
              placeholderTextColor={colors.textMuted} value={toImprove} onChangeText={setToImprove} multiline />
          </View>

          {/* Submit */}
          <View style={s.submitWrapper}>
            <Animated.Text style={[s.xpPopup, { opacity: xpOpacity, transform: [{ translateY: xpY }] }]}>
              +{lastXP} XP
            </Animated.Text>
            <Pressable onPress={handleSubmit} disabled={!canSubmit}
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}>
              <Text style={s.submitText}>
                {logMode === 'weekly' ? 'Log Week' : logMode === 'other' ? `Log for ${selectedDate}` : 'Log Day'}
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker modal */}
      <Modal visible={datePicker} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setDatePicker(false)}>
          <Pressable style={s.datePickerSheet} onPress={() => {}}>
            <View style={s.pickerHeader}>
              <Pressable onPress={() => {
                if (pickerMonth === 1) { setPickerMonth(12); setPickerYear(y => y - 1); }
                else setPickerMonth(m => m - 1);
              }}>
                <Feather name="chevron-left" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={s.pickerTitle}>{MONTHS[pickerMonth - 1]} {pickerYear}</Text>
              <Pressable onPress={() => {
                if (pickerMonth === 12) { setPickerMonth(1); setPickerYear(y => y + 1); }
                else setPickerMonth(m => m + 1);
              }}>
                <Feather name="chevron-right" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={s.calRow}>
              {DAY_LABELS.map(d => <Text key={d} style={s.dayLabel}>{d}</Text>)}
            </View>
            {Array.from({ length: pickerCells.length / 7 }, (_, row) => (
              <View key={row} style={s.calRow}>
                {pickerCells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  if (!day) return <View key={col} style={s.emptyCell} />;
                  const ds = dateStr(pickerYear, pickerMonth, day);
                  const isFuture = ds > todayStr();
                  const isSel = selectedDate === ds;
                  return (
                    <Pressable key={col} onPress={() => !isFuture && selectDate(ds)}
                      style={[s.calCell, isSel && s.calCellSelected, isFuture && s.calCellDisabled]}>
                      <Text style={[s.calCellNum, isSel && s.calCellNumSelected, isFuture && s.calCellNumDisabled]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Habit Modal */}
      <Modal visible={habitModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAvoid}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setHabitModal(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Habit</Text>
            <TextInput style={s.modalInput} placeholder="Habit name" placeholderTextColor={colors.textMuted}
              value={newHabitName} onChangeText={setNewHabitName} autoFocus />
            <Text style={s.sheetSubLabel}>Weight</Text>
            <View style={s.weightRow}>
              {[1, 2, 3, 4, 5].map(w => (
                <Pressable key={w} onPress={() => setNewHabitWeight(w)}
                  style={[s.weightBtn, newHabitWeight === w && s.weightBtnActive]}>
                  <Text style={[s.weightText, newHabitWeight === w && s.weightTextActive]}>{w}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleAddHabit} style={s.modalAddBtn}>
              <Text style={s.modalAddBtnText}>Add</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  modeRow: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  modeBtn: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  modeBtnTextActive: { color: colors.bg },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md,
  },
  dateText: { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.base, color: colors.primary },

  section: { gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.5 },
  shortInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontFamily: fonts.mono.regular, fontSize: fontSize.base,
    color: colors.textPrimary, width: 120,
  },
  textArea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base,
    color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLink: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },
  emptyNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  habitName: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary },
  habitWeight: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },

  submitWrapper: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  xpPopup: {
    fontFamily: fonts.mono.bold, fontSize: fontSize.lg, color: colors.success,
    position: 'absolute', top: -spacing.lg,
    shadowColor: colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
  },
  submitBtn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  submitBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0 },
  submitText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },

  // Date picker modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  datePickerSheet: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.lg, width: '90%', gap: spacing.sm,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pickerTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  calRow: { flexDirection: 'row' },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, paddingBottom: 4 },
  emptyCell: { flex: 1, aspectRatio: 1 },
  calCell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  calCellSelected: { backgroundColor: colors.primary },
  calCellDisabled: { opacity: 0.3 },
  calCellNum: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  calCellNumSelected: { color: colors.bg, fontFamily: fonts.ui.medium },
  calCellNumDisabled: { color: colors.textMuted },

  // Habit modal
  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sheetSubLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg },
  weightRow: { flexDirection: 'row', gap: spacing.sm },
  weightBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  weightBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.08)' },
  weightText: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textMuted },
  weightTextActive: { color: colors.primary },
  modalAddBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  modalAddBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
