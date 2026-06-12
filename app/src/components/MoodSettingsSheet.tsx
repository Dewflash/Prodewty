import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { db } from '../db/schema';
import { MOOD_FALLBACK_COLORS, getCustomMoods, deleteCustomMood, renameCustomMood, updateCustomMood, type CustomMood } from '../db/rpg';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

// Hue gradient (red → orange → yellow → green → cyan → blue → violet → pink),
// using lighter shades than CategoryGrid's COLOR_PALETTE to keep moods visually distinct.
const PALETTE_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#FACC15',
  '#A3E635', '#4ADE80', '#34D399', '#2DD4BF',
  '#22D3EE', '#38BDF8', '#818CF8', '#A78BFA',
  '#C084FC', '#F472B6', '#FB7185', '#94A3B8',
];

type Props = {
  visible: boolean;
  currentMood: string;
  onClose: () => void;
};

export function MoodSettingsSheet({ visible, currentMood, onClose }: Props) {
  const [name,     setName]     = React.useState('');
  const [color,    setColor]    = React.useState('#34D399');
  const [effect,   setEffect]   = React.useState('');
  const [xpChange, setXpChange] = React.useState('0');
  const [xpSign,   setXpSign]   = React.useState<'+' | '-'>('+');
  const [mpRate,   setMpRate]   = React.useState('0');
  const [mpSign,   setMpSign]   = React.useState<'+' | '-'>('+');
  const [moods,    setMoods]    = React.useState<CustomMood[]>([]);

  const [editingMoodName, setEditingMoodName] = React.useState<string | null>(null);
  const [editName,     setEditName]     = React.useState('');
  const [editColor,    setEditColor]    = React.useState('#34D399');
  const [editEffect,   setEditEffect]   = React.useState('');
  const [editXpChange, setEditXpChange] = React.useState('0');
  const [editXpSign,   setEditXpSign]   = React.useState<'+' | '-'>('+');
  const [editMpRate,   setEditMpRate]   = React.useState('0');
  const [editMpSign,   setEditMpSign]   = React.useState<'+' | '-'>('+');

  function refreshMoods() { setMoods(getCustomMoods()); }

  React.useEffect(() => {
    if (!visible) return;
    try {
      const row = db.getFirstSync<{ color: string; passive_effect: string | null; mp_rate: number; xp_change: number }>(
        `SELECT color, passive_effect, mp_rate, xp_change FROM custom_moods WHERE name = ?`, currentMood,
      );
      setName(currentMood);
      setColor(row?.color ?? MOOD_FALLBACK_COLORS[currentMood] ?? '#34D399');
      setEffect(row?.passive_effect ?? '');
      const mpVal = row?.mp_rate ?? 0;
      setMpSign(mpVal < 0 ? '-' : '+');
      setMpRate(String(Math.abs(mpVal)));
      const xpVal = row?.xp_change ?? 0;
      setXpSign(xpVal < 0 ? '-' : '+');
      setXpChange(String(Math.abs(xpVal)));
    } catch {}
    refreshMoods();
  }, [visible, currentMood]);

  function save() {
    try {
      const xpMag = Math.max(0, parseInt(xpChange, 10) || 0);
      if (xpMag > 10) {
        Alert.alert('XP change too large', 'XP change must be between 0% and ±10%.');
        return;
      }
      const xpFinal = xpSign === '-' ? -xpMag : xpMag;
      const mpMag = Math.max(0, parseInt(mpRate, 10) || 0);
      if (mpMag > 50) {
        Alert.alert('MP rate too large', 'MP rate must be between 0 and ±50 per day.');
        return;
      }
      const mpFinal = mpSign === '-' ? -mpMag : mpMag;
      db.runSync(
        `INSERT INTO custom_moods (name, color, passive_effect, mp_rate, xp_change) VALUES (?,?,?,?,?)
         ON CONFLICT(name) DO UPDATE SET color=excluded.color, passive_effect=excluded.passive_effect, mp_rate=excluded.mp_rate, xp_change=excluded.xp_change`,
        name.trim() || currentMood, color, effect.trim() || null, mpFinal, xpFinal,
      );
    } catch {}
    onClose();
  }

  function handleDelete(mood: CustomMood) {
    const usedHint = mood.used === 1
      ? ` It's been used before, so it'll move to Past History — viewable, but can't be selected again.`
      : '';
    Alert.alert('Delete mood?', `Remove "${mood.name}" from your mood list.${usedHint}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteCustomMood(mood.name);
        refreshMoods();
      }},
    ]);
  }

  function toggleEditMood(m: CustomMood) {
    if (editingMoodName === m.name) {
      commitRenameMood(m);
      setEditingMoodName(null);
      return;
    }
    setEditName(m.name);
    setEditColor(m.color);
    setEditEffect(m.passive_effect ?? '');
    const xpVal = m.xp_change ?? 0;
    setEditXpSign(xpVal < 0 ? '-' : '+');
    setEditXpChange(String(Math.abs(xpVal)));
    const mpVal = m.mp_rate ?? 0;
    setEditMpSign(mpVal < 0 ? '-' : '+');
    setEditMpRate(String(Math.abs(mpVal)));
    setEditingMoodName(m.name);
  }

  function commitRenameMood(m: CustomMood) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === m.name) { setEditName(m.name); return; }
    const result = renameCustomMood(m.name, trimmed);
    if (result === 'duplicate') {
      Alert.alert('Name already used', `A mood named "${trimmed}" already exists.`);
      setEditName(m.name);
      return;
    }
    refreshMoods();
  }

  function commitEditColor(m: CustomMood, c: string) {
    updateCustomMood(m.name, { color: c });
    setEditColor(c);
    refreshMoods();
  }

  function commitEditEffect(m: CustomMood) {
    updateCustomMood(m.name, { passive_effect: editEffect.trim() || null });
    refreshMoods();
  }

  function commitEditXp(m: CustomMood) {
    const mag = Math.max(0, parseInt(editXpChange, 10) || 0);
    if (mag > 10) {
      Alert.alert('XP change too large', 'XP change must be between 0% and ±10%.');
      setEditXpChange(String(Math.abs(m.xp_change ?? 0)));
      return;
    }
    updateCustomMood(m.name, { xp_change: editXpSign === '-' ? -mag : mag });
    refreshMoods();
  }

  function commitEditMp(m: CustomMood) {
    const mag = Math.max(0, parseInt(editMpRate, 10) || 0);
    if (mag > 50) {
      Alert.alert('MP rate too large', 'MP rate must be between 0 and ±50 per day.');
      setEditMpRate(String(Math.abs(m.mp_rate ?? 0)));
      return;
    }
    updateCustomMood(m.name, { mp_rate: editMpSign === '-' ? -mag : mag });
    refreshMoods();
  }

  function toggleEditSign(m: CustomMood, kind: 'xp' | 'mp') {
    if (kind === 'xp') {
      const next = editXpSign === '+' ? '-' : '+';
      setEditXpSign(next);
      const mag = Math.max(0, parseInt(editXpChange, 10) || 0);
      updateCustomMood(m.name, { xp_change: next === '-' ? -mag : mag });
    } else {
      const next = editMpSign === '+' ? '-' : '+';
      setEditMpSign(next);
      const mag = Math.max(0, parseInt(editMpRate, 10) || 0);
      updateCustomMood(m.name, { mp_rate: next === '-' ? -mag : mag });
    }
    refreshMoods();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Mood Settings — {currentMood}</Text>
          <View style={s.divider} />

          <Text style={s.label}>Your Moods</Text>
          <View style={s.moodList}>
            {moods.map(m => (
              <View key={m.name}>
                <View style={s.moodRow}>
                  <View style={[s.moodDot, { backgroundColor: m.color }]} />
                  <Text style={s.moodRowName} numberOfLines={1}>{m.name}</Text>
                  {m.used === 1 && <Text style={s.usedBadge}>used</Text>}
                  <Pressable onPress={() => toggleEditMood(m)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={s.editBtn}>
                    <Feather name="edit-2" size={14} color={editingMoodName === m.name ? m.color : colors.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(m)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={s.deleteBtn}>
                    <Feather name="trash-2" size={14} color={colors.danger} />
                  </Pressable>
                </View>
                {editingMoodName === m.name && (
                  <View style={s.moodEditPanel}>
                    <TextInput
                      style={s.input}
                      placeholder="Name"
                      placeholderTextColor={colors.textMuted}
                      value={editName}
                      onChangeText={setEditName}
                      onBlur={() => commitRenameMood(m)}
                      onSubmitEditing={() => commitRenameMood(m)}
                    />
                    <View style={s.palette}>
                      {PALETTE_COLORS.map(c => (
                        <Pressable key={c} onPress={() => commitEditColor(m, c)}
                          style={[s.swatch, { backgroundColor: c }, editColor === c && s.swatchActive]} />
                      ))}
                    </View>
                    <TextInput
                      style={s.input}
                      value={editEffect}
                      onChangeText={setEditEffect}
                      onBlur={() => commitEditEffect(m)}
                      onSubmitEditing={() => commitEditEffect(m)}
                      placeholder="Passive effect, e.g. +10% XP gain"
                      placeholderTextColor={colors.textMuted}
                    />
                    <View style={s.signRow}>
                      <Pressable onPress={() => toggleEditSign(m, 'xp')}
                        style={[s.signBtn, { borderColor: editXpSign === '+' ? colors.success : colors.danger }]}>
                        <Text style={[s.signTxt, { color: editXpSign === '+' ? colors.success : colors.danger }]}>{editXpSign}</Text>
                      </Pressable>
                      <TextInput style={[s.input, { flex: 1 }]} value={editXpChange} onChangeText={setEditXpChange}
                        onBlur={() => commitEditXp(m)} onSubmitEditing={() => commitEditXp(m)}
                        keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                      <Text style={s.unitTxt}>% XP</Text>
                    </View>
                    <View style={s.signRow}>
                      <Pressable onPress={() => toggleEditSign(m, 'mp')}
                        style={[s.signBtn, { borderColor: editMpSign === '+' ? colors.success : colors.danger }]}>
                        <Text style={[s.signTxt, { color: editMpSign === '+' ? colors.success : colors.danger }]}>{editMpSign}</Text>
                      </Pressable>
                      <TextInput style={[s.input, { flex: 1 }]} value={editMpRate} onChangeText={setEditMpRate}
                        onBlur={() => commitEditMp(m)} onSubmitEditing={() => commitEditMp(m)}
                        keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                      <Text style={s.unitTxt}>MP/day</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={s.divider} />

          <Text style={s.label}>Mood Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />

          <Text style={s.label}>Colour</Text>
          <View style={s.palette}>
            {PALETTE_COLORS.map(c => (
              <Pressable key={c} onPress={() => setColor(c)}
                style={[s.swatch, { backgroundColor: c }, color === c && s.swatchActive]} />
            ))}
          </View>

          <Text style={s.label}>Passive Effect</Text>
          <TextInput style={s.input} value={effect} onChangeText={setEffect}
            placeholder="e.g. +10% XP gain" placeholderTextColor={colors.textMuted} />

          <Text style={s.label}>XP change (±10%, applied to all XP earned while active)</Text>
          <View style={s.signRow}>
            <Pressable onPress={() => setXpSign(p => p === '+' ? '-' : '+')}
              style={[s.signBtn, { borderColor: xpSign === '+' ? colors.success : colors.danger }]}>
              <Text style={[s.signTxt, { color: xpSign === '+' ? colors.success : colors.danger }]}>{xpSign}</Text>
            </Pressable>
            <TextInput style={[s.input, { flex: 1 }]} value={xpChange} onChangeText={setXpChange}
              keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
            <Text style={s.unitTxt}>%</Text>
          </View>

          <Text style={s.label}>MP Rate (±50, per day)</Text>
          <View style={s.signRow}>
            <Pressable onPress={() => setMpSign(p => p === '+' ? '-' : '+')}
              style={[s.signBtn, { borderColor: mpSign === '+' ? colors.success : colors.danger }]}>
              <Text style={[s.signTxt, { color: mpSign === '+' ? colors.success : colors.danger }]}>{mpSign}</Text>
            </Pressable>
            <TextInput style={[s.input, { flex: 1 }]} value={mpRate} onChangeText={setMpRate}
              keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
          </View>

          <Pressable onPress={save} style={s.saveBtn}>
            <Text style={s.saveTxt}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex: 1 },
  sheet:       { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  handle:      { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  title:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  divider:     { height: 1, backgroundColor: colors.border },
  label:       { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  input:       { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg },
  signRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  signBtn:     { width: 36, height: 36, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  signTxt:     { fontFamily: fonts.mono.bold, fontSize: fontSize.md },
  unitTxt:     { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  palette:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch:      { width: 28, height: 28, borderRadius: 14 },
  swatchActive:{ borderWidth: 3, borderColor: colors.textPrimary },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveTxt:     { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
  moodList:    { gap: spacing.xs },
  moodRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  moodDot:     { width: 10, height: 10, borderRadius: 5 },
  moodRowName: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  usedBadge:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  editBtn:     { padding: 4 },
  deleteBtn:   { padding: 4 },
  moodEditPanel: { paddingLeft: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
});
