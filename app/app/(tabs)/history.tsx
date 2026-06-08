import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert,
  TextInput, KeyboardAvoidingView, Platform, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import {
  getLogsForDate, getLogsForMonth, getWeeklyLogs, deleteLog, searchLogs, editLog,
  updateSelfDestructNotes, type ActivityLog,
} from '../../src/db/logs';
import { db } from '../../src/db/schema';
import { localDateStr } from '../../src/utils/date';
import { TopRibbon } from '../../src/components/TopRibbon';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { playSound, switchBGM } from '../../src/services/audio';
import { getNotesForDate, type BibleNote } from '../../src/db/bible';

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr()                    { return localDateStr(); }
function getDaysInMonth(y:number,m:number){ return new Date(y,m,0).getDate(); }
function getFirstDayOffset(y:number,m:number){ return (new Date(y,m-1,1).getDay()+6)%7; }
function dateStr(y:number,m:number,d:number){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function resolveDate(l:ActivityLog)    { return l.log_date ?? l.created_at.split('T')[0].split(' ')[0]; }
function scoreColor(v:number|null)     { if(v===null)return colors.primary; return colors.moodActive[Math.min(Math.max(Math.round(v)-1,0),9)]; }
function parseCategories(raw:string)   { try{return JSON.parse(raw);}catch{return[];} }
function weekNumber(ds:string)         { const d=new Date(ds+'T12:00:00');const fj=new Date(d.getFullYear(),0,1);return Math.ceil(((d.getTime()-fj.getTime())/86400000+fj.getDay()+1)/7); }

// Fetch category → colour map from DB
function getCatColors(): Record<string, string> {
  try {
    const rows = db.getAllSync<{ name: string; color: string }>('SELECT name, color FROM categories');
    return Object.fromEntries(rows.map(r => [r.name, r.color]));
  } catch { return {}; }
}

// ─── Score chip ──────────────────────────────────────────────────────────────

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
  wrap:  { flexDirection:'row', alignItems:'center', gap:4, borderWidth:1, borderRadius:radius.pill, paddingHorizontal:spacing.sm, paddingVertical:2 },
  label: { fontFamily:fonts.ui.regular, fontSize:fontSize.xs, color:colors.textMuted },
  val:   { fontFamily:fonts.mono.bold,  fontSize:fontSize.xs },
});

// ─── Edit modal ──────────────────────────────────────────────────────────────

function EditModal({ log, onClose, onSaved }: { log: ActivityLog; onClose: () => void; onSaved: () => void }) {
  const isMood = log.entry_type === 'mood';
  const [note,   setNote]   = useState(log.description || '');
  const [well,   setWell]   = useState(log.what_went_well || '');
  const [revel,  setRevel]  = useState(log.what_to_improve || '');
  const [journl, setJournl] = useState(log.journal_entry || '');

  function save() {
    editLog(log.id, { note: !isMood ? note : null, what_went_well: well, what_to_improve: revel, journal_entry: isMood ? journl : null });
    onSaved(); onClose();
  }
  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={em.kbAvoid}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={em.sheet}>
          <Text style={em.title}>Edit {isMood ? 'Daily Entry' : 'Activity'}</Text>
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
  kbAvoid: { flex:1, justifyContent:'flex-end' },
  sheet:   { backgroundColor:colors.card, borderTopLeftRadius:radius.lg, borderTopRightRadius:radius.lg, padding:spacing.lg, gap:spacing.sm, paddingBottom:40, maxHeight:'85%' },
  title:   { fontFamily:fonts.ui.semibold, fontSize:fontSize.md, color:colors.textPrimary },
  locked:  { fontFamily:fonts.ui.regular,  fontSize:fontSize.xs, color:colors.textMuted },
  label:   { fontFamily:fonts.ui.medium,   fontSize:fontSize.xs, color:colors.textMuted, marginTop:4 },
  input:   { borderWidth:1, borderColor:colors.border, borderRadius:radius.md, padding:spacing.sm, fontFamily:fonts.ui.regular, fontSize:fontSize.sm, color:colors.textPrimary, backgroundColor:colors.bg, minHeight:52, textAlignVertical:'top' },
  saveBtn: { backgroundColor:colors.primary, borderRadius:radius.md, padding:spacing.md, alignItems:'center', marginTop:spacing.sm },
  saveBtnText: { fontFamily:fonts.ui.semibold, fontSize:fontSize.base, color:colors.bg },
});

// ─── Mood card (daily entry) ──────────────────────────────────────────────────

function MoodCard({ log, onSaved }: { log: ActivityLog; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <View style={cd.moodCard}>
      <View style={cd.topRow}>
        <View style={cd.scores}>
          <ScoreChip label="Mood"   value={log.mood_rating} />
          <ScoreChip label="Energy" value={log.energy_rating} />
          <ScoreChip label="Prod"   value={log.productivity_rating} />
        </View>
        <View style={cd.rightRow}>
          <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
          <Pressable onPress={() => setEditing(true)} style={cd.actionBtn}>
            <Feather name="edit-2" size={13} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
      {log.journal_entry ? <Text style={cd.journal}>{log.journal_entry}</Text> : null}
      <Text style={cd.time}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
      {editing && <EditModal log={log} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </View>
  );
}

// ─── Activity card (accordion) ───────────────────────────────────────────────

function ActivityCard({ log, onDelete, catColors }: { log: ActivityLog; onDelete: () => void; catColors: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const cats    = parseCategories(log.categories);
  const primary = cats[0] || '—';
  const catColor = catColors[primary] ?? colors.border;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  }
  function confirmDelete() {
    Alert.alert('Delete Activity', `Remove "${primary}"? ${log.xp_awarded} XP will be deducted.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress:() => { deleteLog(log.id); playSound('deleteitem'); onDelete(); } },
    ]);
  }

  return (
    <Pressable onPress={toggle} style={cd.card}>
      {/* Collapsed row always visible */}
      <View style={cd.topRow}>
        <View style={cd.tagRow}>
          <View style={[cd.tag, { borderColor: catColor }]}>
            <Text style={[cd.tagText, { color: catColor }]}>{primary}</Text>
          </View>
          {cats.slice(1).map((c:string) => (
            <View key={c} style={[cd.tag, { borderColor: catColors[c] ?? colors.border }]}>
              <Text style={[cd.tagText, { color: catColors[c] ?? colors.textMuted }]}>{c}</Text>
            </View>
          ))}
        </View>
        <View style={cd.rightRow}>
          <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </View>
      </View>
      {log.description ? <Text style={cd.title}>{log.description}</Text> : null}

      {/* Expanded details */}
      {expanded && (
        <>
          {log.duration_mins ? <Text style={cd.meta}>{log.duration_mins} min</Text> : null}
          <View style={cd.divider} />
          {log.what_went_well ? (
            <View style={cd.noteBlock}>
              <Text style={cd.notePrompt}>What went well?</Text>
              <Text style={cd.noteText}>{log.what_went_well}</Text>
            </View>
          ) : (
            <Text style={cd.emptyPrompt}>What went well? —</Text>
          )}
          {log.what_to_improve ? (
            <View style={cd.noteBlock}>
              <Text style={cd.notePrompt}>Revelation</Text>
              <Text style={cd.noteText}>{log.what_to_improve}</Text>
            </View>
          ) : (
            <Text style={cd.emptyPrompt}>Revelation —</Text>
          )}
          <View style={cd.expandedActions}>
            <Text style={cd.timeSm}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
            <View style={{ flexDirection:'row', gap:spacing.md }}>
              <Pressable onPress={() => setEditing(true)} style={cd.actionBtn}>
                <Feather name="edit-2" size={13} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={confirmDelete} style={cd.actionBtn}>
                <Feather name="trash-2" size={14} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </>
      )}
      {editing && <EditModal log={log} onClose={() => setEditing(false)} onSaved={onDelete} />}
    </Pressable>
  );
}

// ─── Dungeon card ─────────────────────────────────────────────────────────────

function DungeonCard({ log, catColors }: { log: ActivityLog; catColors: Record<string, string> }) {
  const cats    = parseCategories(log.categories);
  const primary = cats[0] || '—';
  const catColor = catColors[primary] ?? colors.border;
  return (
    <View style={cd.dungeonCard}>
      <View style={cd.topRow}>
        <View style={cd.tagRow}>
          <View style={cd.dungeonTag}>
            <Text style={cd.dungeonTagTxt}>DUNGEON</Text>
          </View>
          <View style={[cd.tag, { borderColor: catColor }]}>
            <Text style={[cd.tagText, { color: catColor }]}>{primary}</Text>
          </View>
        </View>
        <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
      </View>
      {log.description ? <Text style={cd.title}>{log.description}</Text> : null}
      {log.duration_mins ? <Text style={cd.meta}>{log.duration_mins} min</Text> : null}
      <Text style={cd.time}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
    </View>
  );
}

// ─── Quest card ───────────────────────────────────────────────────────────────

function QuestCard({ log, catColors }: { log: ActivityLog; catColors: Record<string, string> }) {
  const cats    = parseCategories(log.categories);
  const primary = cats[0] || '—';
  const catColor = catColors[primary] ?? colors.border;
  return (
    <View style={cd.questCard}>
      <View style={cd.topRow}>
        <View style={cd.tagRow}>
          <View style={cd.questTag}>
            <Text style={cd.questTagTxt}>QUEST</Text>
          </View>
          <View style={[cd.tag, { borderColor: catColor }]}>
            <Text style={[cd.tagText, { color: catColor }]}>{primary}</Text>
          </View>
        </View>
        <Text style={cd.xp}>+{log.xp_awarded} XP</Text>
      </View>
      {log.description ? <Text style={cd.title}>{log.description}</Text> : null}
      <Text style={cd.time}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
    </View>
  );
}

// ─── Self-destruct banner ─────────────────────────────────────────────────────

function SelfDestructBanner({ log, onSaved }: { log: ActivityLog; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [notes,   setNotes]   = useState((log as any).self_destruct_notes || '');

  function handleEdit() {
    // Biometric placeholder — replace with expo-local-authentication when installed
    Alert.alert(
      'Face ID Required',
      'Authenticate to view and edit self-destruct notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Authenticate', onPress: () => setEditing(true) },
      ],
    );
  }

  function saveNotes() {
    updateSelfDestructNotes(log.id, notes);
    setEditing(false);
    onSaved();
  }

  const hasNotes = !!((log as any).self_destruct_notes?.trim());
  return (
    <>
      <Pressable onPress={handleEdit} style={cd.sdBanner}>
        <Feather name="alert-triangle" size={14} color={colors.danger} />
        <Text style={cd.sdText}>Self Destructed :(</Text>
        {hasNotes && <Text style={cd.sdNoted}>Noted</Text>}
        <Text style={cd.sdTime}>{log.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
      </Pressable>

      {editing && (
        <Modal visible transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={em.kbAvoid}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEditing(false)} />
            <View style={em.sheet}>
              <Text style={em.title}>Self-Destruct Notes</Text>
              <Text style={em.locked}>Only visible and editable after authentication.</Text>
              <TextInput
                style={em.input}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="What happened? What led to this?"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={saveNotes} style={[em.saveBtn, { backgroundColor: colors.danger }]}>
                <Text style={em.saveBtnText}>Save Notes</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </>
  );
}

const cd = StyleSheet.create({
  // Base card
  card:       { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm+4, gap: 4 },
  moodCard:   { backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: radius.md, padding: spacing.sm+4, gap: 4, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)' },
  dungeonCard:{ backgroundColor: 'rgba(56,189,248,0.06)',  borderRadius: radius.md, padding: spacing.sm+4, gap: 4, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  questCard:  { backgroundColor: 'rgba(52,211,153,0.06)',  borderRadius: radius.md, padding: spacing.sm+4, gap: 4, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  bibleCard:  { backgroundColor: 'rgba(251,191,36,0.06)',  borderRadius: radius.md, padding: spacing.sm+4, gap: 4, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' },
  bibleTag:    { borderWidth:1, borderColor:'#FBBF24', borderRadius:3, paddingHorizontal:5, paddingVertical:1 },
  bibleTagTxt: { fontFamily:fonts.mono.regular, fontSize:9, color:'#FBBF24', letterSpacing:1 },
  sdBanner:   { flexDirection:'row', alignItems:'center', gap:spacing.sm, backgroundColor:'rgba(239,68,68,0.06)', borderRadius:radius.md, padding:spacing.sm+4, borderWidth:1, borderColor:'rgba(239,68,68,0.3)' },

  topRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  scores:     { flexDirection:'row', gap:4, flexWrap:'wrap', flex:1 },
  tagRow:     { flexDirection:'row', gap:4, flex:1, flexWrap:'wrap' },
  tag:        { borderWidth:1, borderColor:colors.border, borderRadius:radius.pill, paddingHorizontal:spacing.sm, paddingVertical:2 },
  tagText:    { fontFamily:fonts.ui.medium, fontSize:fontSize.xs, color:colors.textMuted },

  dungeonTag:    { borderWidth:1, borderColor:colors.primary, borderRadius:3, paddingHorizontal:5, paddingVertical:1 },
  dungeonTagTxt: { fontFamily:fonts.mono.regular, fontSize:9, color:colors.primary, letterSpacing:1 },
  questTag:      { borderWidth:1, borderColor:colors.success, borderRadius:3, paddingHorizontal:5, paddingVertical:1 },
  questTagTxt:   { fontFamily:fonts.mono.regular, fontSize:9, color:colors.success, letterSpacing:1 },

  rightRow:    { flexDirection:'row', alignItems:'center', gap:spacing.sm },
  xp:          { fontFamily:fonts.mono.bold, fontSize:fontSize.sm, color:colors.success },
  actionBtn:   { padding:4 },
  title:       { fontFamily:fonts.ui.regular, fontSize:fontSize.sm, color:colors.textPrimary },
  meta:        { fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted },
  journal:     { fontFamily:fonts.ui.regular, fontSize:fontSize.sm, color:colors.textPrimary, lineHeight:20 },
  time:        { fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted, alignSelf:'flex-end' },
  timeSm:      { fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted },

  divider:     { height:1, backgroundColor:colors.border, marginVertical:2 },
  noteBlock:   { gap:2 },
  notePrompt:  { fontFamily:fonts.ui.medium, fontSize:fontSize.xs, color:colors.textMuted },
  noteText:    { fontFamily:fonts.ui.regular, fontSize:fontSize.sm, color:colors.textPrimary },
  emptyPrompt: { fontFamily:fonts.ui.regular, fontSize:fontSize.xs, color:colors.border },
  expandedActions: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:2 },

  sdText:  { flex:1, fontFamily:fonts.ui.medium,    fontSize:fontSize.sm, color:colors.danger },
  sdNoted: { fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted, marginRight:4 },
  sdTime:  { fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted },
});

// ─── Bible note card (shown in Bible toggle view) ────────────────────────────

function BibleNoteCard({ note }: { note: BibleNote }) {
  return (
    <View style={cd.bibleCard}>
      <View style={cd.topRow}>
        <View style={cd.bibleTag}>
          <Text style={cd.bibleTagTxt}>BIBLE</Text>
        </View>
        <Text style={cd.xp}>+{note.xp_awarded} XP</Text>
      </View>
      <Text style={cd.title}>{note.title || 'Untitled'}</Text>
      <Text style={cd.time}>{note.created_at.split(' ')[1]?.slice(0,5) ?? ''}</Text>
    </View>
  );
}

// ─── Dispatch card by entry_type ──────────────────────────────────────────────

function LogCard({ log, onDelete, catColors }: { log: ActivityLog; onDelete: () => void; catColors: Record<string, string> }) {
  switch (log.entry_type) {
    case 'mood':         return <MoodCard     log={log} onSaved={onDelete} />;
    case 'dungeon':      return <DungeonCard  log={log} catColors={catColors} />;
    case 'quest':        return <QuestCard    log={log} catColors={catColors} />;
    case 'bible':        return null;
    case 'self_destruct':return <SelfDestructBanner log={log} onSaved={onDelete} />;
    default:             return <ActivityCard log={log} onDelete={onDelete} catColors={catColors} />;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const now = new Date();
  const [tab,         setTab]         = useState<'daily' | 'weekly'>('daily');
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [selected,    setSelected]    = useState(todayStr());
  const [monthLogs,   setMonthLogs]   = useState<ActivityLog[]>([]);
  const [dayLogs,     setDayLogs]     = useState<ActivityLog[]>([]);
  const [weekGroups,  setWeekGroups]  = useState<{ weekStart: string; logs: ActivityLog[] }[]>([]);
  const [bibleNotes,  setBibleNotes]  = useState<BibleNote[]>([]);
  const [viewMode,    setViewMode]    = useState<'logs' | 'bible'>('logs');
  const [monthPicker, setMonthPicker] = useState(false);
  const [yearPicker,  setYearPicker]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ActivityLog[] | null>(null);
  const [catColors,   setCatColors]   = useState<Record<string, string>>({});

  function reload() {
    setCatColors(getCatColors());
    if (tab === 'daily') {
      setMonthLogs(getLogsForMonth(year, month));
      setDayLogs(getLogsForDate(selected));
      setBibleNotes(getNotesForDate(selected));
    } else {
      setWeekGroups(getWeeklyLogs());
    }
  }

  useFocusEffect(useCallback(() => { void switchBGM('historylog'); }, []));
  useFocusEffect(useCallback(() => { reload(); }, [tab, year, month, selected]));

  const moodByDate: Record<string, number> = {};
  for (const l of monthLogs) {
    if (l.entry_type === 'mood' && l.mood_rating) moodByDate[resolveDate(l)] = l.mood_rating;
  }
  // Mark days with self-destruct
  const sdDates = new Set(monthLogs.filter(l => l.entry_type === 'self_destruct').map(l => resolveDate(l)));

  function prevMonth() { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }
  function handleSearch(q: string) { setSearchQuery(q); setSearchResults(q.trim() ? searchLogs(q) : null); }

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_,i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <SwipeNavWrapper currentIndex={1}>
    <SafeAreaView style={s.safe}>
      <TopRibbon title="History" />

      <View style={s.tabRow}>
        {(['daily','weekly'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab===t && s.tabBtnActive]}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'daily' ? (
        <ScrollView contentContainerStyle={s.content}>
          <View style={[s.searchRow, { marginBottom: spacing.md }]}>
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput style={s.searchInput} placeholder="Search notes & journal..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={handleSearch} />
            {searchQuery.length > 0 && <Pressable onPress={() => handleSearch('')}><Feather name="x" size={15} color={colors.textMuted} /></Pressable>}
          </View>

          <View style={s.headerRow}>
            <Text style={s.heading}>History</Text>
            <View style={s.pickerRow}>
              <Pressable onPress={prevMonth} style={s.arrowBtn}><Feather name="chevron-left" size={18} color={colors.textPrimary} /></Pressable>
              <Pressable style={s.pickerBtn} onPress={() => setMonthPicker(true)}><Text style={s.pickerText}>{MONTHS[month-1]}</Text></Pressable>
              <Pressable onPress={nextMonth} style={s.arrowBtn}><Feather name="chevron-right" size={18} color={colors.textPrimary} /></Pressable>
              <Pressable style={s.pickerBtn} onPress={() => setYearPicker(true)}><Text style={s.pickerText}>{year}</Text></Pressable>
            </View>
          </View>

          <View style={[s.calendar, { marginBottom: spacing.md }]}>
            <View style={s.calRow}>{DAY_LABELS.map(d => <Text key={d} style={s.dayLabel}>{d}</Text>)}</View>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <View key={row} style={s.calRow}>
                {cells.slice(row*7, row*7+7).map((day, col) => {
                  if (!day) return <View key={col} style={s.emptyCell} />;
                  const ds = dateStr(year, month, day);
                  const moodRating = moodByDate[ds];
                  const hasLog = ds in moodByDate;
                  const hasSd  = sdDates.has(ds);
                  const isSel  = selected === ds;
                  const isToday = ds === todayStr();
                  return (
                    <Pressable key={col} onPress={() => setSelected(ds)}
                      style={[s.cell, isSel && s.cellSel, isToday && !isSel && s.cellToday, hasSd && !isSel && s.cellSd]}>
                      <Text style={[s.cellNum, isSel && s.cellNumSel]}>{day}</Text>
                      {hasLog && <View style={[s.dot, { backgroundColor: isSel ? colors.bg : colors.moodActive[Math.min(Math.max((moodRating ?? 5)-1,0),9)] }]} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {searchResults !== null ? (
            <>
              <View style={s.dayHeader}><Text style={s.dayTitle}>{searchResults.length} result{searchResults.length!==1?'s':''}</Text></View>
              {searchResults.length === 0
                ? <Text style={s.emptyNote}>Nothing found.</Text>
                : searchResults.map(log => <LogCard key={log.id} log={log} onDelete={reload} catColors={catColors} />)
              }
            </>
          ) : (
            <>
              <View style={s.dayHeader}>
                <Text style={s.dayTitle}>
                  {selected === todayStr() ? 'Today' : new Date(selected+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                </Text>
                <View style={s.viewToggle}>
                  <Pressable onPress={() => setViewMode('logs')} style={[s.toggleBtn, viewMode==='logs' && s.toggleBtnOn]}>
                    <Text style={[s.toggleTxt, viewMode==='logs' && s.toggleTxtOn]}>Logs</Text>
                  </Pressable>
                  <Pressable onPress={() => setViewMode('bible')} style={[s.toggleBtn, viewMode==='bible' && s.toggleBtnOn]}>
                    <Text style={[s.toggleTxt, viewMode==='bible' && s.toggleTxtOn]}>Bible</Text>
                  </Pressable>
                </View>
              </View>
              {viewMode === 'logs' ? (() => {
                const filtered = dayLogs.filter(l => l.log_type !== 'weekly');
                return filtered.length === 0
                  ? <Text style={s.emptyNote}>No logs for this date.</Text>
                  : filtered.map(log => <LogCard key={log.id} log={log} onDelete={reload} catColors={catColors} />);
              })() : (
                bibleNotes.length === 0
                  ? <Text style={s.emptyNote}>No devotions for this date.</Text>
                  : bibleNotes.map(note => <BibleNoteCard key={note.id} note={note} />)
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.heading}>Weekly Logs</Text>
          {weekGroups.length === 0
            ? <Text style={s.emptyNote}>No weekly logs yet.</Text>
            : weekGroups.map(({ weekStart, logs }) => (
                <View key={weekStart} style={s.weekGroup}>
                  <Text style={s.weekHeading}>
                    Week {weekNumber(weekStart)}, {weekStart.split('-')[0]}{'  ·  '}{new Date(weekStart+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </Text>
                  {logs.map(log => <LogCard key={log.id} log={log} onDelete={() => setWeekGroups(getWeeklyLogs())} catColors={catColors} />)}
                </View>
              ))
          }
        </ScrollView>
      )}

      <Modal visible={monthPicker} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setMonthPicker(false)}>
          <View style={s.pickerSheet}>
            {MONTHS.map((m,i) => (
              <Pressable key={m} onPress={() => { setMonth(i+1); setMonthPicker(false); }} style={[s.pickerItem, month===i+1 && s.pickerItemActive]}>
                <Text style={[s.pickerItemText, month===i+1 && s.pickerItemTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={yearPicker} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setYearPicker(false)}>
          <View style={[s.pickerSheet, { paddingVertical: spacing.md }]}>
            {years.map(y => (
              <Pressable key={y} onPress={() => { setYear(y); setYearPicker(false); }} style={[s.pickerItem, year===y && s.pickerItemActive]}>
                <Text style={[s.pickerItemText, year===y && s.pickerItemTextActive]}>{y}</Text>
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
  safe:         { flex:1, backgroundColor:colors.bg },
  tabRow:       { flexDirection:'row', borderBottomWidth:1, borderBottomColor:colors.border },
  tabBtn:       { flex:1, paddingVertical:spacing.md, alignItems:'center' },
  tabBtnActive: { borderBottomWidth:2, borderBottomColor:colors.primary },
  tabText:      { fontFamily:fonts.ui.medium,    fontSize:fontSize.sm, color:colors.textMuted },
  tabTextActive:{ color:colors.primary },
  content:      { padding:spacing.lg, paddingBottom:spacing.xxl*2, gap:spacing.sm },
  searchRow:    { flexDirection:'row', alignItems:'center', gap:spacing.sm, backgroundColor:colors.card, borderRadius:radius.md, paddingHorizontal:spacing.md, paddingVertical:spacing.sm },
  searchInput:  { flex:1, fontFamily:fonts.ui.regular, fontSize:fontSize.sm, color:colors.textPrimary },
  arrowBtn:     { padding:4 },
  headerRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  heading:      { fontFamily:fonts.ui.semibold, fontSize:fontSize.xl, color:colors.textPrimary },
  pickerRow:    { flexDirection:'row', gap:spacing.sm },
  pickerBtn:    { borderWidth:1, borderColor:colors.border, borderRadius:radius.md, paddingHorizontal:spacing.md, paddingVertical:6 },
  pickerText:   { fontFamily:fonts.ui.medium, fontSize:fontSize.sm, color:colors.textPrimary },
  calendar:     { gap:4 },
  calRow:       { flexDirection:'row' },
  dayLabel:     { flex:1, textAlign:'center', fontFamily:fonts.mono.regular, fontSize:fontSize.xs, color:colors.textMuted, paddingBottom:spacing.xs },
  emptyCell:    { flex:1, aspectRatio:1 },
  cell:         { flex:1, aspectRatio:1, borderRadius:radius.sm, alignItems:'center', justifyContent:'center', gap:2 },
  cellSel:      { backgroundColor:colors.primary },
  cellToday:    { borderWidth:1, borderColor:colors.primary },
  cellSd:       { borderWidth:1, borderColor:colors.danger },
  cellNum:      { fontFamily:fonts.ui.regular, fontSize:fontSize.xs, color:colors.textPrimary },
  cellNumSel:   { color:colors.bg, fontFamily:fonts.ui.medium },
  dot:          { width:4, height:4, borderRadius:2 },
  dayHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:1, borderBottomColor:colors.border, paddingBottom:spacing.sm },
  dayTitle:     { fontFamily:fonts.ui.semibold, fontSize:fontSize.md, color:colors.textPrimary },
  viewToggle:   { flexDirection:'row', gap:4 },
  toggleBtn:    { paddingHorizontal:spacing.sm, paddingVertical:3, borderRadius:radius.sm, borderWidth:1, borderColor:colors.border },
  toggleBtnOn:  { borderColor:'#FBBF24', backgroundColor:'rgba(251,191,36,0.08)' },
  toggleTxt:    { fontFamily:fonts.mono.regular, fontSize:9, color:colors.textMuted, letterSpacing:1 },
  toggleTxtOn:  { color:'#FBBF24' },
  emptyNote:    { fontFamily:fonts.ui.regular, fontSize:fontSize.base, color:colors.textMuted },
  weekGroup:    { gap:spacing.sm },
  weekHeading:  { fontFamily:fonts.ui.semibold, fontSize:fontSize.sm, color:colors.primary, paddingTop:spacing.sm },
  overlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  pickerSheet:  { backgroundColor:colors.card, borderRadius:radius.lg, paddingVertical:spacing.sm, width:220 },
  pickerItem:   { paddingHorizontal:spacing.lg, paddingVertical:spacing.md },
  pickerItemActive:    { backgroundColor:'rgba(56,189,248,0.08)' },
  pickerItemText:      { fontFamily:fonts.ui.regular, fontSize:fontSize.base, color:colors.textPrimary },
  pickerItemTextActive:{ color:colors.primary, fontFamily:fonts.ui.medium },
});
