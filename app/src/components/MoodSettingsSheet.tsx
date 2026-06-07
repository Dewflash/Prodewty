import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { db } from '../db/schema';
import { MOOD_FALLBACK_COLORS, getCustomMoods, deleteCustomMood, type CustomMood } from '../db/rpg';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const PALETTE_COLORS = [
  '#34D399','#EF4444','#F87171','#A855F7','#38BDF8',
  '#F97316','#FBBF24','#EC4899','#64748B','#10B981',
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
      const xpMag = Math.min(10, Math.max(0, parseInt(xpChange, 10) || 0));
      const xpFinal = xpSign === '-' ? -xpMag : xpMag;
      const mpMag = Math.min(50, Math.max(0, parseInt(mpRate, 10) || 0));
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
              <View key={m.name} style={s.moodRow}>
                <View style={[s.moodDot, { backgroundColor: m.color }]} />
                <Text style={s.moodRowName} numberOfLines={1}>{m.name}</Text>
                {m.used === 1 && <Text style={s.usedBadge}>used</Text>}
                <Pressable onPress={() => handleDelete(m)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={s.deleteBtn}>
                  <Feather name="trash-2" size={14} color={colors.danger} />
                </Pressable>
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
  deleteBtn:   { padding: 4 },
});
