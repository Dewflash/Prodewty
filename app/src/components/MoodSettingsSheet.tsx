import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { db } from '../db/schema';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const PALETTE_COLORS = [
  '#34D399','#EF4444','#F87171','#A855F7','#38BDF8',
  '#F97316','#FBBF24','#EC4899','#64748B','#10B981',
];

// Base colors for known moods (fallback if not in DB)
const MOOD_DEFAULTS: Record<string, string> = {
  driven:        '#34D399',
  burnout:       '#EF4444',
  reminiscing:   '#A855F7',
  lonely:        '#64748B',
  overstimulated:'#F97316',
  relapsed:      '#EF4444',
};

type Props = {
  visible: boolean;
  currentMood: string;
  onClose: () => void;
};

export function MoodSettingsSheet({ visible, currentMood, onClose }: Props) {
  const [name,   setName]   = React.useState('');
  const [color,  setColor]  = React.useState('#34D399');
  const [effect, setEffect] = React.useState('');
  const [mpRate, setMpRate] = React.useState('0');

  React.useEffect(() => {
    if (!visible) return;
    try {
      const row = db.getFirstSync<{ color: string; passive_effect: string | null; mp_rate: number }>(
        `SELECT color, passive_effect, mp_rate FROM custom_moods WHERE name = ?`, currentMood,
      );
      setName(currentMood);
      setColor(row?.color ?? MOOD_DEFAULTS[currentMood] ?? '#34D399');
      setEffect(row?.passive_effect ?? '');
      setMpRate(String(row?.mp_rate ?? 0));
    } catch {}
  }, [visible, currentMood]);

  function save() {
    try {
      db.runSync(
        `INSERT INTO custom_moods (name, color, passive_effect, mp_rate) VALUES (?,?,?,?)
         ON CONFLICT(name) DO UPDATE SET color=excluded.color, passive_effect=excluded.passive_effect, mp_rate=excluded.mp_rate`,
        name.trim() || currentMood, color, effect.trim() || null, parseInt(mpRate, 10) || 0,
      );
    } catch {}
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Mood Settings — {currentMood}</Text>
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

          <Text style={s.label}>MP Rate (−100 to 100, per day)</Text>
          <TextInput style={s.input} value={mpRate} onChangeText={setMpRate}
            keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />

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
  palette:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch:      { width: 28, height: 28, borderRadius: 14 },
  swatchActive:{ borderWidth: 3, borderColor: colors.textPrimary },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveTxt:     { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
