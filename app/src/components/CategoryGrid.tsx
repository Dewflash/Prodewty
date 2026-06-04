import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Switch, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { addCategory, type DBCategory } from '../db/categories';

type Props = {
  categories: DBCategory[];
  selected: string[];
  onSelect: (names: string[]) => void;
  onAdded: () => void;
};

// Maps to the 7-stat DB columns; shown in the "New Activity" modal as "Attribute (for Game)"
const ATTRIBUTES = ['strength', 'wisdom', 'focus', 'agility', 'resilience', 'per_stat', 'sta_stat'] as const;
const ATTR_LABELS: Record<string, string> = {
  strength: 'STR', wisdom: 'WIS', focus: 'FOC',
  agility: 'AGI', resilience: 'SPR', per_stat: 'PER', sta_stat: 'STA',
};

const COLOR_PALETTE = [
  '#38BDF8', '#34D399', '#A855F7', '#F97316',
  '#FBBF24', '#EC4899', '#EF4444', '#3B82F6',
  '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4',
  '#64748B', '#6366F1', '#14B8A6', '#F43F5E',
];

export function CategoryGrid({ categories, selected, onSelect, onAdded }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(3);
  const [newAttr, setNewAttr] = useState<typeof ATTRIBUTES[number]>('focus');
  const [isPhysical, setIsPhysical] = useState(false);
  const [isRecreational, setIsRecreational] = useState(false);
  const [newColor, setNewColor] = useState('#38BDF8');

  function toggle(name: string) {
    onSelect(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a name for the activity tag.');
      return;
    }
    addCategory(trimmed, newWeight, newAttr, isPhysical, isRecreational, newColor);
    setNewName(''); setNewWeight(3); setIsPhysical(false); setIsRecreational(false); setNewColor('#38BDF8');
    setModalVisible(false);
    onAdded();
  }

  return (
    <>
      <View style={s.grid}>
        {categories.map((cat) => {
          const active = selected.includes(cat.name);
          const catColor = cat.color || colors.primary;
          return (
            <Pressable key={cat.id} onPress={() => toggle(cat.name)}
              style={[s.pill,
                { borderColor: active ? catColor : colors.border },
                active && { shadowColor: catColor, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
              ]}>
              {active && <View style={[s.pillDot, { backgroundColor: catColor }]} />}
              <Text style={[s.pillText, { color: active ? catColor : colors.textMuted }]}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setModalVisible(true)} style={s.addPill}>
          <Text style={s.addText}>+ New</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAvoid}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Activity Tag</Text>

            <TextInput style={s.input} placeholder="Name" placeholderTextColor={colors.textMuted}
              value={newName} onChangeText={setNewName} autoFocus />

            <Text style={s.subLabel}>Colour</Text>
            <View style={s.colorGrid}>
              {COLOR_PALETTE.map(c => (
                <Pressable key={c} onPress={() => setNewColor(c)}
                  style={[s.swatch, { backgroundColor: c }, newColor === c && s.swatchSelected]}>
                  {newColor === c && <Feather name="check" size={10} color={colors.bg} />}
                </Pressable>
              ))}
            </View>

            <Text style={s.subLabel}>Weight (XP impact)</Text>
            <View style={s.weightRow}>
              {[1, 2, 3, 4, 5].map(w => (
                <Pressable key={w} onPress={() => setNewWeight(w)}
                  style={[s.weightBtn, newWeight === w && { borderColor: newColor, backgroundColor: `${newColor}15` }]}>
                  <Text style={[s.weightText, newWeight === w && { color: newColor }]}>{w}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Physical Activity</Text>
                <Text style={s.toggleHint}>+5% Physical health when logged</Text>
              </View>
              <Switch value={isPhysical} onValueChange={setIsPhysical}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.textPrimary} />
            </View>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Recreational</Text>
                <Text style={s.toggleHint}>+5% Mental health when logged</Text>
              </View>
              <Switch value={isRecreational} onValueChange={setIsRecreational}
                trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.textPrimary} />
            </View>

            <Text style={s.subLabel}>Attribute (for Game)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.attrRow}>
                {ATTRIBUTES.map(attr => (
                  <Pressable key={attr} onPress={() => setNewAttr(attr)}
                    style={[s.attrPill, newAttr === attr && { borderColor: newColor }]}>
                    <Text style={[s.attrText, newAttr === attr && { color: newColor }]}>{ATTR_LABELS[attr] ?? attr}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable onPress={handleAdd} style={[s.addBtn, { backgroundColor: newColor }]}>
              <Text style={s.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm },
  addPill: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    borderStyle: 'dashed', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  addText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, paddingBottom: 40,
  },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base,
    color: colors.textPrimary, backgroundColor: colors.bg,
  },
  subLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 2, borderColor: colors.textPrimary },
  weightRow: { flexDirection: 'row', gap: spacing.sm },
  weightBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  weightText: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textMuted },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  toggleHint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  attrRow: { flexDirection: 'row', gap: spacing.sm },
  attrPill: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  attrText: { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted, textTransform: 'capitalize' },
  addBtn: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  addBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
