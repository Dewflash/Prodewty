import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { db } from '../src/db/schema';

type Milestone = { id: number; date: string; title: string };

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00');
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getFirstDayOffset(y: number, m: number) { return (new Date(y, m-1, 1).getDay()+6)%7; }
function padded(n: number) { return String(n).padStart(2,'0'); }
function dateStr(y: number, m: number, d: number) { return `${y}-${padded(m)}-${padded(d)}`; }

function getMilestones(): Milestone[] {
  try {
    return db.getAllSync<Milestone>('SELECT * FROM milestones ORDER BY date DESC, created_at DESC');
  } catch { return []; }
}
function addMilestone(date: string, title: string) {
  db.runSync('INSERT INTO milestones (date, title) VALUES (?, ?)', date, title.trim());
}
function deleteMilestone(id: number) {
  db.runSync('DELETE FROM milestones WHERE id = ?', id);
}

export default function MilestonesScreen() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [modal, setModal] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [title, setTitle] = useState('');
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);

  useFocusEffect(useCallback(() => { setItems(getMilestones()); }, []));

  function reload() { setItems(getMilestones()); }

  function handleAdd() {
    if (!title.trim()) return;
    addMilestone(selectedDate, title);
    setTitle(''); setModal(false); reload();
  }

  function confirmDelete(id: number, t: string) {
    Alert.alert('Delete Milestone', `Remove "${t}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteMilestone(id); reload(); } },
    ]);
  }

  // Calendar for picker
  const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);
  const offset = getFirstDayOffset(pickerYear, pickerMonth);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Milestones</Text>
        <Pressable onPress={() => setModal(true)} style={s.addBtn}>
          <Feather name="plus" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={s.empty}>
          <Feather name="flag" size={40} color={colors.border} />
          <Text style={s.emptyTitle}>No milestones yet</Text>
          <Text style={s.emptyText}>Record significant moments in your journey.</Text>
          <Pressable onPress={() => setModal(true)} style={s.emptyAddBtn}>
            <Text style={s.emptyAddText}>Add first milestone</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <Pressable style={s.card} onLongPress={() => confirmDelete(item.id, item.title)}>
              <View style={s.cardLeft}>
                <View style={s.flagDot} />
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardDate}>{fmtDate(item.date)}</Text>
                </View>
              </View>
              <Pressable onPress={() => confirmDelete(item.id, item.title)}>
                <Feather name="trash-2" size={14} color={colors.border} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {/* Add milestone modal */}
      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAvoid}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModal(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Milestone</Text>

            <Pressable style={s.datePickerRow} onPress={() => setPickerVisible(true)}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={s.datePickerText}>{fmtDate(selectedDate)}</Text>
              <Feather name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            <TextInput
              style={s.input}
              placeholder="What happened?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              multiline
            />

            <Pressable onPress={handleAdd} style={s.saveBtn}>
              <Text style={s.saveBtnText}>Save Milestone</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date picker */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={s.calSheet} onPress={() => {}}>
            <View style={s.calHeader}>
              <Pressable onPress={() => { if (pickerMonth===1){setPickerMonth(12);setPickerYear(y=>y-1);}else setPickerMonth(m=>m-1); }}>
                <Feather name="chevron-left" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={s.calTitle}>{MONTHS[pickerMonth-1]} {pickerYear}</Text>
              <Pressable onPress={() => { if (pickerMonth===12){setPickerMonth(1);setPickerYear(y=>y+1);}else setPickerMonth(m=>m+1); }}>
                <Feather name="chevron-right" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={s.calRow}>
              {DAY_LABELS.map(d => <Text key={d} style={s.dayLabel}>{d}</Text>)}
            </View>
            {Array.from({length: cells.length/7}, (_,row) => (
              <View key={row} style={s.calRow}>
                {cells.slice(row*7, row*7+7).map((day, col) => {
                  if (!day) return <View key={col} style={s.emptyCell} />;
                  const ds = dateStr(pickerYear, pickerMonth, day);
                  const isSel = selectedDate === ds;
                  return (
                    <Pressable key={col} onPress={() => { setSelectedDate(ds); setPickerVisible(false); }}
                      style={[s.calCell, isSel && s.calCellSel]}>
                      <Text style={[s.calCellNum, isSel && s.calCellNumSel]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { padding: 4 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  addBtn: { padding: 4 },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  sep: { height: 1, backgroundColor: colors.border },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  flagDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardInfo: { gap: 2 },
  cardTitle: { fontFamily: fonts.ui.medium, fontSize: fontSize.base, color: colors.textPrimary },
  cardDate: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center' },
  emptyAddBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  emptyAddText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },
  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  datePickerText: { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.base, color: colors.primary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg, minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calSheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, width: '90%', gap: spacing.sm },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  calTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  calRow: { flexDirection: 'row' },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, paddingBottom: 4 },
  emptyCell: { flex: 1, aspectRatio: 1 },
  calCell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  calCellSel: { backgroundColor: colors.primary },
  calCellNum: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  calCellNumSel: { color: colors.bg, fontFamily: fonts.ui.medium },
});
