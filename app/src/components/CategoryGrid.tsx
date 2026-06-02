import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
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

const ATTRIBUTES = ['strength', 'wisdom', 'focus', 'agility', 'resilience'] as const;

export function CategoryGrid({ categories, selected, onSelect, onAdded }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(3);
  const [newAttr, setNewAttr] = useState<typeof ATTRIBUTES[number]>('focus');
  const [isPhysical, setIsPhysical] = useState(false);
  const [isRecreational, setIsRecreational] = useState(false);

  function toggle(name: string) {
    onSelect(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }

  function handleAdd() {
    if (!newName.trim()) return;
    addCategory(newName.trim(), newWeight, newAttr, isPhysical, isRecreational);
    setNewName('');
    setNewWeight(3);
    setIsPhysical(false);
    setIsRecreational(false);
    setModalVisible(false);
    onAdded();
  }

  return (
    <>
      <View style={s.grid}>
        {categories.map((cat) => {
          const active = selected.includes(cat.name);
          return (
            <Pressable key={cat.id} onPress={() => toggle(cat.name)}
              style={[s.pill, active && s.pillActive]}>
              <Text style={[s.pillText, active && s.pillTextActive]}>{cat.name}</Text>
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

            <TextInput
              style={s.input}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={s.subLabel}>Weight (XP impact)</Text>
            <View style={s.weightRow}>
              {[1, 2, 3, 4, 5].map(w => (
                <Pressable key={w} onPress={() => setNewWeight(w)}
                  style={[s.weightBtn, newWeight === w && s.weightBtnActive]}>
                  <Text style={[s.weightText, newWeight === w && s.weightTextActive]}>{w}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Physical Activity</Text>
                <Text style={s.toggleHint}>Restores Physical health when logged</Text>
              </View>
              <Switch
                value={isPhysical}
                onValueChange={setIsPhysical}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Recreational</Text>
                <Text style={s.toggleHint}>Restores Mental health when logged</Text>
              </View>
              <Switch
                value={isRecreational}
                onValueChange={setIsRecreational}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <Text style={s.subLabel}>Attribute</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.attrRow}>
                {ATTRIBUTES.map(attr => (
                  <Pressable key={attr} onPress={() => setNewAttr(attr)}
                    style={[s.attrPill, newAttr === attr && s.attrPillActive]}>
                    <Text style={[s.attrText, newAttr === attr && s.attrTextActive]}>{attr}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable onPress={handleAdd} style={s.addBtn}>
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
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  pillActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  pillText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  pillTextActive: { color: colors.primary },
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
  weightRow: { flexDirection: 'row', gap: spacing.sm },
  weightBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  weightBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.08)' },
  weightText: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textMuted },
  weightTextActive: { color: colors.primary },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  toggleHint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  attrRow: { flexDirection: 'row', gap: spacing.sm },
  attrPill: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  attrPillActive: { borderColor: colors.accent },
  attrText: {
    fontFamily: fonts.mono.regular, fontSize: fontSize.sm,
    color: colors.textMuted, textTransform: 'capitalize',
  },
  attrTextActive: { color: colors.accent },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  addBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
