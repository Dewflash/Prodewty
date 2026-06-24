import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../src/components/Screen';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { getNoteById, saveNote, deleteNote } from '../src/db/bible';
import { RichJournalEditor, RichJournalEditorHandle } from '../src/components/rich-text/RichJournalEditor';

export default function BibleEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = parseInt(id ?? '0', 10);

  const [saved, setSaved] = useState(true);
  const [title, setTitle] = useState('');
  const [initialContent, setInitialContent] = useState<string | null>(null);

  const editorRef = useRef<RichJournalEditorHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store the latest content so handleBack can save immediately
  const contentRef = useRef({ text: '', html: '' });

  useEffect(() => {
    const note = getNoteById(noteId);
    if (note) {
      // If there's html_content, use it; otherwise wrap the plain text in a paragraph.
      const html = note.html_content || (note.content ? `<p>${note.content.replace(/\n/g, '<br/>')}</p>` : '');
      setInitialContent(html);
      setTitle(note.title || 'New Note');
      contentRef.current = { text: note.content, html: html };
    } else {
      setInitialContent('');
    }
  }, [noteId]);

  function scheduleAutoSave(text: string, html: string) {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote(noteId, text, html);
      setSaved(true);
    }, 800);
  }

  function handleChange(change: { text: string; html: string }) {
    contentRef.current = change;
    setTitle(change.text.split('\n')[0].trim() || 'New Note');
    scheduleAutoSave(change.text, change.html);
  }

  function handleBack() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const final = contentRef.current;
    if (final.text.trim() || final.html.replace(/<[^>]*>?/gm, '').trim()) {
      saveNote(noteId, final.text, final.html);
    } else {
      deleteNote(noteId);
    }
    router.back();
  }

  if (initialContent === null) return null;

  return (
    <Screen style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.saveIndicator}>{saved ? '●' : '○'}</Text>
      </View>

      {/* Editor */}
      <View style={s.editorContainer}>
        <RichJournalEditor
          ref={editorRef}
          initialContent={initialContent}
          placeholder="Start writing..."
          onChange={handleChange}
        />
      </View>
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
  iconBtn:       { padding: 6 },
  headerTitle:   { flex: 1, fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  saveIndicator: { fontFamily: fonts.mono.regular, fontSize: 10, color: colors.textMuted, paddingRight: 4 },
  editorContainer: { flex: 1 },
});
