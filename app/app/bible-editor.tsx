import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Screen } from '../src/components/Screen';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getNoteById, saveNote, deleteNote } from '../src/db/bible';

// ─── List-format cycling helpers ──────────────────────────────────────────────

function toRoman(n: number): string {
  const pairs: [number, string][] = [
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let out = '';
  let rem = n;
  for (const [val, sym] of pairs) {
    while (rem >= val) { out += sym; rem -= val; }
  }
  return out || String(n);
}

function fromRoman(s: string): number {
  const map: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  const lower = s.toLowerCase();
  let total = 0;
  for (let k = 0; k < lower.length; k++) {
    const curr = map[lower[k]] ?? 0;
    const next = map[lower[k + 1]] ?? 0;
    total += next > curr ? -curr : curr;
  }
  return total || 1;
}

function numToLetter(n: number): string {
  return n >= 1 && n <= 26 ? String.fromCharCode(96 + n) : String(n);
}

function fromLetter(s: string): number {
  const code = s.toLowerCase().charCodeAt(0);
  return code >= 97 && code <= 122 ? code - 96 : 1;
}

// Returns true if the string looks like a roman numeral (only i,v,x,l,c,d,m)
function isRomanLike(s: string): boolean {
  return /^[ivxlcdm]+$/.test(s.toLowerCase());
}

export default function BibleEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = parseInt(id ?? '0', 10);

  const [content, setContent] = useState('');
  const [title,   setTitle]   = useState('');
  const [saved,   setSaved]   = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const inputRef  = useRef<TextInput>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(''); // latest content for flush on back

  useEffect(() => {
    const note = getNoteById(noteId);
    if (note) {
      setContent(note.content);
      setTitle(note.content.split('\n')[0].trim() || 'New Note');
      contentRef.current = note.content;
    }
  }, [noteId]);

  function scheduleAutoSave(text: string) {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote(noteId, text);
      setSaved(true);
    }, 800);
  }

  function handleChange(text: string) {
    setContent(text);
    contentRef.current = text;
    setTitle(text.split('\n')[0].trim() || 'New Note');
    scheduleAutoSave(text);
  }

  function handleBack() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const final = contentRef.current;
    if (final.trim()) {
      saveNote(noteId, final);
    } else {
      deleteNote(noteId);
    }
    router.back();
  }

  // ─── Formatting helpers ────────────────────────────────────────────────────

  function getLineStart(text: string, pos: number): number {
    let i = pos;
    while (i > 0 && text[i - 1] !== '\n') i--;
    return i;
  }

  function getLineEnd(text: string, pos: number): number {
    let i = pos;
    while (i < text.length && text[i] !== '\n') i++;
    return i;
  }

  function applyToLine(ls: number, le: number, line: string, oldPfx: string, newPfx: string) {
    const next = contentRef.current.slice(0, ls) + newPfx + line.slice(oldPfx.length) + contentRef.current.slice(le);
    setContent(next);
    contentRef.current = next;
    scheduleAutoSave(next);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function insertAtLineStart(prefix: string) {
    const pos = selection.start;
    const ls  = getLineStart(contentRef.current, pos);
    const next = contentRef.current.slice(0, ls) + prefix + contentRef.current.slice(ls);
    setContent(next);
    contentRef.current = next;
    scheduleAutoSave(next);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function removeFromLineStart(prefix: string) {
    const pos  = selection.start;
    const ls   = getLineStart(contentRef.current, pos);
    const le   = getLineEnd(contentRef.current, pos);
    const line = contentRef.current.slice(ls, le);
    if (!line.startsWith(prefix)) { inputRef.current?.focus(); return; }
    const next = contentRef.current.slice(0, ls) + line.slice(prefix.length) + contentRef.current.slice(le);
    setContent(next);
    contentRef.current = next;
    scheduleAutoSave(next);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleBullet() { insertAtLineStart('• '); }

  function handleNumbered() {
    const lines = contentRef.current.split('\n');
    const count = lines.filter(l => /^\d+\.\s/.test(l)).length;
    insertAtLineStart(`${count + 1}. `);
  }

  // Cycles: bullet(•) ↔ dash(-) — both indent and dedent toggle between the two
  // Numbered(1.) → lettered(a.) → roman(i.) → numbered (indent)
  // Reverse for dedent. Plain lines get space indent/dedent.
  function handleIndent() {
    const pos  = selection.start;
    const text = contentRef.current;
    const ls   = getLineStart(text, pos);
    const le   = getLineEnd(text, pos);
    const line = text.slice(ls, le);

    if (line.startsWith('• '))  return applyToLine(ls, le, line, '• ', '- ');
    if (line.startsWith('- '))  return applyToLine(ls, le, line, '- ', '• ');

    const numM = line.match(/^(\d+)\. /);
    if (numM) {
      return applyToLine(ls, le, line, numM[0], `${numToLetter(parseInt(numM[1], 10))}. `);
    }

    const letM = line.match(/^([a-z]+)\. /);
    if (letM) {
      const s = letM[1];
      if (isRomanLike(s)) {
        // roman → back to numbered (cycle complete)
        return applyToLine(ls, le, line, letM[0], `${fromRoman(s)}. `);
      }
      // lettered → roman
      return applyToLine(ls, le, line, letM[0], `${toRoman(fromLetter(s))}. `);
    }

    insertAtLineStart('    ');
  }

  function handleDedent() {
    const pos  = selection.start;
    const text = contentRef.current;
    const ls   = getLineStart(text, pos);
    const le   = getLineEnd(text, pos);
    const line = text.slice(ls, le);

    if (line.startsWith('- '))  return applyToLine(ls, le, line, '- ', '• ');
    // '• ' → no-op; fall through to space dedent

    const letM = line.match(/^([a-z]+)\. /);
    if (letM) {
      const s = letM[1];
      if (isRomanLike(s)) {
        // roman → lettered
        return applyToLine(ls, le, line, letM[0], `${numToLetter(fromRoman(s))}. `);
      }
      // lettered → numbered
      return applyToLine(ls, le, line, letM[0], `${fromLetter(s)}. `);
    }

    removeFromLineStart('    ');
  }

  // ─── Render ────────────────────────────────────────────────────────────────

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

      {/* Formatting ribbon */}
      <View style={s.ribbon}>
        <Pressable style={s.ribbonBtn} onPress={handleBullet}>
          <Text style={s.ribbonTxt}>• List</Text>
        </Pressable>
        <View style={s.ribbonDivider} />
        <Pressable style={s.ribbonBtn} onPress={handleNumbered}>
          <Text style={s.ribbonTxt}>1. List</Text>
        </Pressable>
        <View style={s.ribbonDivider} />
        <Pressable style={s.ribbonBtn} onPress={handleDedent}>
          <Feather name="chevron-left" size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable style={s.ribbonBtn} onPress={handleIndent}>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Editor */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            ref={inputRef}
            style={s.editor}
            multiline
            value={content}
            onChangeText={handleChange}
            onSelectionChange={e => setSelection(e.nativeEvent.selection)}
            placeholder="Start writing..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

  ribbon: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  ribbonBtn:     { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  ribbonTxt:     { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  ribbonDivider: { width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: spacing.xs },

  editor: {
    flex: 1,
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
    padding: spacing.md,
    minHeight: 600,
  },
});
