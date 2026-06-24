import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen } from '../src/components/Screen';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { 
  getFolders, createFolder, renameFolder, deleteFolder, 
  getNotes, createNote, deleteNote, togglePinNote, getAllNotesCount,
  type BibleNote, type BibleFolder 
} from '../src/db/bible';
import { localDateStr } from '../src/utils/date';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BibleScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const isTopLevel = !folderId;

  const [folders, setFolders] = useState<BibleFolder[]>([]);
  const [allNotesCount, setAllNotesCount] = useState(0);
  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [editMode, setEditMode] = useState(false);
  
  // Add/Rename folder modal
  const [dialogVisible, setDialogVisible] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);

  function loadData() {
    if (isTopLevel) {
      setFolders(getFolders());
      setAllNotesCount(getAllNotesCount());
    } else {
      const parsedId = folderId === 'all' ? 'all' : parseInt(folderId, 10);
      setNotes(getNotes(parsedId));
    }
  }

  useFocusEffect(useCallback(() => { loadData(); }, [isTopLevel, folderId]));
  // Also load on plain mount/param-change (not just navigation focus) — needed
  // so this screen renders real data when mounted as a non-focused "peek"
  // behind the note editor's edge-swipe-back gesture (see EdgeSwipeBack).
  React.useEffect(() => { loadData(); }, [isTopLevel, folderId]);

  function handleAddFolder() {
    setEditingFolderId(null);
    setFolderInput('');
    setDialogVisible(true);
  }

  function handleRenameFolder(folder: BibleFolder) {
    setEditingFolderId(folder.id);
    setFolderInput(folder.name);
    setDialogVisible(true);
  }

  function submitFolder() {
    const name = folderInput.trim();
    if (name) {
      if (editingFolderId) {
        renameFolder(editingFolderId, name);
      } else {
        createFolder(name);
      }
    }
    setDialogVisible(false);
    loadData();
  }

  function handleDeleteFolder(id: number) {
    Alert.alert('Delete folder?', 'Notes will not be deleted but moved to All Notes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteFolder(id); loadData(); } }
    ]);
  }

  function handleNewNote() {
    const parsedId = (folderId && folderId !== 'all') ? parseInt(folderId, 10) : null;
    const id = createNote(parsedId);
    router.push(`/bible-editor?id=${id}&folderId=${parsedId || ''}`);
  }

  function handleNoteLongPress(note: BibleNote) {
    Alert.alert(note.title || 'Untitled', 'Note Options', [
      { text: note.is_pinned ? 'Unpin Note' : 'Pin Note', onPress: () => { togglePinNote(note.id, note.is_pinned); loadData(); } },
      { text: 'Delete Note', style: 'destructive', onPress: () => { deleteNote(note.id); loadData(); } },
      { text: 'Cancel', style: 'cancel' }
    ]);
  }

  // Grouping logic for Notes
  const groupedNotes = useMemo(() => {
    const pinned: BibleNote[] = [];
    const today: BibleNote[] = [];
    const yesterday: BibleNote[] = [];
    const other: { [key: string]: BibleNote[] } = {};

    const todayStr = localDateStr();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    notes.forEach(n => {
      if (n.is_pinned) {
        pinned.push(n);
      } else if (n.log_date === todayStr) {
        today.push(n);
      } else if (n.log_date === yesterdayStr) {
        yesterday.push(n);
      } else {
        if (!other[n.log_date]) other[n.log_date] = [];
        other[n.log_date].push(n);
      }
    });

    // Sort other dates descending
    const sortedDates = Object.keys(other).sort((a, b) => b.localeCompare(a));
    const sortedOther = sortedDates.map(date => ({ date, notes: other[date] }));

    return { pinned, today, yesterday, sortedOther };
  }, [notes]);

  const folderName = useMemo(() => {
    if (isTopLevel) return 'Folders';
    if (folderId === 'all') return 'All Notes';
    return folders.find(f => f.id === parseInt(folderId, 10))?.name || 'Folder';
  }, [isTopLevel, folderId, folders]);


  return (
    <Screen style={s.root} edges={['top']}>
      {/* HEADER */}
      <View style={s.header}>
        {isTopLevel ? (
          <View style={s.headerLeft} />
        ) : (
          <Pressable onPress={() => router.back()} style={s.headerLeft}>
            <Feather name="chevron-left" size={24} color={colors.primary} />
            <Text style={s.headerBackText}>Folders</Text>
          </Pressable>
        )}

        {isTopLevel ? (
          <View style={s.headerRight}>
            <Pressable onPress={handleAddFolder} style={s.iconBtn}>
              <Feather name="folder-plus" size={20} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => setEditMode(!editMode)} style={s.iconBtn}>
              <Text style={s.headerActionText}>{editMode ? 'Done' : 'Edit'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.headerRight}>
            <Pressable onPress={handleNewNote} style={s.iconBtn}>
              <Feather name="edit" size={20} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* TITLE & SUBTITLE */}
      <View style={s.titleContainer}>
        <Text style={s.mainTitle}>{folderName}</Text>
        {!isTopLevel && (
          <Text style={s.subTitle}>{notes.length} Notes</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {isTopLevel ? (
          // --- FOLDERS VIEW ---
          <>
            <Pressable style={s.folderRow} onPress={() => router.push('/bible?folderId=all')}>
              <View style={s.folderIconWrap}>
                <Feather name="folder" size={20} color={colors.textMuted} />
              </View>
              <Text style={s.folderName}>All Notes</Text>
              <View style={{ flex: 1 }} />
              <Text style={s.folderCount}>{allNotesCount}</Text>
              <Feather name="chevron-right" size={16} color={colors.border} />
            </Pressable>

            {folders.map(folder => (
              <Pressable 
                key={folder.id} 
                style={s.folderRow} 
                onPress={() => editMode ? handleRenameFolder(folder) : router.push(`/bible?folderId=${folder.id}`)}
              >
                {editMode && (
                  <Pressable onPress={() => handleDeleteFolder(folder.id)} style={s.folderDeleteBtn}>
                    <Feather name="minus-circle" size={20} color={colors.danger} />
                  </Pressable>
                )}
                <View style={s.folderIconWrap}>
                  <Feather name="folder" size={20} color={colors.primary} />
                </View>
                <Text style={s.folderName}>{folder.name}</Text>
                <View style={{ flex: 1 }} />
                {!editMode && (
                  <>
                    <Text style={s.folderCount}>{folder.note_count || 0}</Text>
                    <Feather name="chevron-right" size={16} color={colors.border} />
                  </>
                )}
                {editMode && <Feather name="edit-2" size={16} color={colors.textMuted} />}
              </Pressable>
            ))}
          </>
        ) : (
          // --- NOTES VIEW ---
          <>
            {notes.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyText}>No notes</Text>
              </View>
            )}

            {groupedNotes.pinned.length > 0 && (
              <NoteSection title="Pinned" notes={groupedNotes.pinned} onLongPress={handleNoteLongPress} isAllNotes={folderId === 'all'} />
            )}
            {groupedNotes.today.length > 0 && (
              <NoteSection title="Today" notes={groupedNotes.today} onLongPress={handleNoteLongPress} isAllNotes={folderId === 'all'} />
            )}
            {groupedNotes.yesterday.length > 0 && (
              <NoteSection title="Yesterday" notes={groupedNotes.yesterday} onLongPress={handleNoteLongPress} isAllNotes={folderId === 'all'} />
            )}
            {groupedNotes.sortedOther.map(group => (
              <NoteSection key={group.date} title={formatLongDate(group.date)} notes={group.notes} onLongPress={handleNoteLongPress} isAllNotes={folderId === 'all'} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Add/Rename Folder Dialog */}
      <Modal visible={dialogVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>{editingFolderId ? 'Rename Folder' : 'New Folder'}</Text>
            <TextInput
              style={s.dialogInput}
              value={folderInput}
              onChangeText={setFolderInput}
              placeholder="Folder Name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={s.dialogActions}>
              <Pressable onPress={() => setDialogVisible(false)} style={s.dialogBtn}>
                <Text style={s.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitFolder} style={s.dialogBtn}>
                <Text style={s.dialogSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

// --- SUBCOMPONENTS ---

function NoteSection({ title, notes, onLongPress, isAllNotes }: { title: string; notes: BibleNote[]; onLongPress: (n: BibleNote) => void; isAllNotes: boolean }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>
        {notes.map((note, i) => {
          // Preview body: remove HTML tags if any, else use plain content
          const bodyPlain = note.html_content 
            ? note.html_content.replace(/<[^>]*>?/gm, '').split('\n').slice(1).join(' ').trim() 
            : note.content.split('\n').slice(1).join(' ').trim();
          
          return (
            <Pressable 
              key={note.id} 
              style={[s.noteRow, i < notes.length - 1 && s.noteBorder]}
              onPress={() => router.push(`/bible-editor?id=${note.id}&folderId=${note.folder_id || ''}`)}
              onLongPress={() => onLongPress(note)}
            >
              <Text style={s.noteTitle} numberOfLines={1}>{note.title || 'New Note'}</Text>
              
              <View style={s.noteMetaRow}>
                <Text style={s.noteDate}>{formatShortDate(note.log_date)}</Text>
                <Text style={s.notePreview} numberOfLines={1}>{bodyPlain || 'No additional text'}</Text>
              </View>

              {isAllNotes && note.folder_name && (
                <View style={s.noteFolderBadge}>
                  <Feather name="folder" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={s.noteFolderText}>{note.folder_name}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- STYLES ---

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    height: 44,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60, marginLeft: -8 },
  headerBackText: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 60, justifyContent: 'flex-end' },
  headerActionText: { fontFamily: fonts.ui.medium, fontSize: fontSize.base, color: colors.primary },
  iconBtn: { padding: 4 },

  titleContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  mainTitle: { fontFamily: fonts.ui.bold, fontSize: 32, color: colors.textPrimary },
  subTitle: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  list: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontFamily: fonts.ui.medium, fontSize: fontSize.base, color: colors.textMuted },

  // Folders
  folderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
    marginBottom: 2, borderWidth: 1, borderColor: colors.border,
  },
  folderIconWrap: { marginRight: spacing.sm },
  folderName: { fontFamily: fonts.ui.medium, fontSize: fontSize.base, color: colors.textPrimary },
  folderCount: { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted, marginRight: spacing.sm },
  folderDeleteBtn: { marginRight: spacing.sm, padding: 4 },

  // Notes
  section: { gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary, marginLeft: spacing.sm },
  sectionCard: { backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  noteRow: { padding: spacing.md, gap: 4 },
  noteBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  noteTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  noteMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDate: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  notePreview: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  noteFolderBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  noteFolderText: { fontFamily: fonts.ui.regular, fontSize: 11, color: colors.textMuted },

  // Dialog
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialogBox: { backgroundColor: colors.card, width: 280, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  dialogTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary, textAlign: 'center' },
  dialogInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, fontFamily: fonts.ui.regular, fontSize: fontSize.base },
  dialogActions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  dialogBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  dialogCancelText: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  dialogSaveText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },
});
