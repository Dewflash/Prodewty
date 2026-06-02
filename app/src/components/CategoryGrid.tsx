import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { useAppStore, type Category } from '../store/useAppStore';

type Props = {
  selected: string | null;
  onSelect: (id: string) => void;
};

const ATTRIBUTES: Category['attribute'][] = ['strength', 'wisdom', 'focus', 'agility', 'resilience'];

export function CategoryGrid({ selected, onSelect }: Props) {
  const { categories, addCategory } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAttribute, setNewAttribute] = useState<Category['attribute']>('focus');

  function handleAdd() {
    if (!newLabel.trim()) return;
    addCategory({
      id: newLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newLabel.trim(),
      attribute: newAttribute,
    });
    setNewLabel('');
    setModalVisible(false);
  }

  return (
    <>
      <View style={styles.grid}>
        {categories.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onSelect(cat.id)}
              style={[
                styles.pill,
                isSelected && styles.pillSelected,
              ]}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setModalVisible(true)} style={styles.addPill}>
          <Text style={styles.addText}>+ New</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={newLabel}
              onChangeText={setNewLabel}
              autoFocus
            />
            <Text style={styles.attrLabel}>Maps to attribute</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attrRow}>
              {ATTRIBUTES.map((attr) => (
                <Pressable
                  key={attr}
                  onPress={() => setNewAttribute(attr)}
                  style={[styles.attrPill, newAttribute === attr && styles.attrPillSelected]}
                >
                  <Text style={[styles.attrText, newAttribute === attr && styles.attrTextSelected]}>
                    {attr}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={handleAdd} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>Add</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  pillText: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pillTextSelected: {
    color: colors.primary,
  },
  addPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addText: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.ui.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  attrLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  attrRow: {
    flexDirection: 'row',
  },
  attrPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  attrPillSelected: {
    borderColor: colors.accent,
  },
  attrText: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  attrTextSelected: {
    color: colors.accent,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmText: {
    fontFamily: fonts.ui.semibold,
    fontSize: fontSize.base,
    color: colors.bg,
  },
});
