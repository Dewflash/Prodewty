import React, { useCallback, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Screen } from '../src/components/Screen';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getNotes, createNote, deleteNote, type BibleNote } from '../src/db/bible';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BibleScreen() {
  const [notes, setNotes] = useState<BibleNote[]>([]);

  useFocusEffect(useCallback(() => { setNotes(getNotes()); }, []));

  function handleNew() {
    const id = createNote();
    router.push(`/bible-editor?id=${id}`);
  }

  function handleDelete(note: BibleNote) {
    Alert.alert(
      'Delete note',
      `"${note.title || 'Untitled'}" will be deleted${note.xp_awarded > 0 ? ` and ${note.xp_awarded} XP refunded` : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { deleteNote(note.id); setNotes(getNotes()); },
        },
      ],
    );
  }

  return (
    <Screen style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Bible</Text>
        <Pressable onPress={handleNew} style={s.iconBtn}>
          <Feather name="edit" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {notes.length === 0 ? (
          <View style={s.empty}>
            <Feather name="book-open" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>No notes yet</Text>
            <Text style={s.emptyHint}>Tap the edit icon to write your first devotion</Text>
          </View>
        ) : (
          notes.map(note => (
            <Pressable
              key={note.id}
              style={s.row}
              onPress={() => router.push(`/bible-editor?id=${note.id}`)}
            >
              <View style={s.rowMain}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {note.title || 'Untitled'}
                </Text>
                <Text style={s.rowPreview} numberOfLines={1}>
                  {note.content.split('\n').slice(1).join(' ').trim() || 'No additional text'}
                </Text>
              </View>
              <View style={s.rowMeta}>
                <Text style={s.rowDate}>{formatDate(note.log_date)}</Text>
                {note.xp_awarded > 0 && (
                  <Text style={s.rowXP}>+{note.xp_awarded} XP</Text>
                )}
              </View>
              <Pressable
                style={s.deleteBtn}
                onPress={e => { e.stopPropagation(); handleDelete(note); }}
                hitSlop={8}
              >
                <Feather name="trash-2" size={15} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconBtn: { padding: 6 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  list:  { padding: spacing.md, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  rowMain:    { flex: 1, gap: 2 },
  rowTitle:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  rowPreview: { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs, color: colors.textMuted },
  rowMeta:    { alignItems: 'flex-end', gap: 2 },
  rowDate:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  rowXP:      { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: '#FBBF24' },
  deleteBtn:  { padding: 6, marginLeft: 4 },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: spacing.sm,
  },
  emptyText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textMuted },
  emptyHint: { fontFamily: fonts.ui.regular,  fontSize: fontSize.sm,   color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
