import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Switch, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { addCategory, deleteCategory, getPastHistoryCategories, type DBCategory } from '../db/categories';

type Props = {
  categories: DBCategory[];
  selected: string[];
  onSelect: (names: string[]) => void;
  onAdded: () => void;
};

export type CategoryGridHandle = {
  openPastHistory: () => void;
  showWeightInfo: () => void;
  openManage: () => void;
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

export const CategoryGrid = forwardRef<CategoryGridHandle, Props>(function CategoryGrid({ categories, selected, onSelect, onAdded }, ref) {
  const [modalVisible, setModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [pastHistory, setPastHistory] = useState<DBCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(3);
  const [newAttr, setNewAttr] = useState<typeof ATTRIBUTES[number]>('focus');
  const [isPhysical, setIsPhysical] = useState(false);
  const [isRecreational, setIsRecreational] = useState(false);
  const [isCommunal, setIsCommunal] = useState(false);
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
    addCategory(trimmed, newWeight, newAttr, isPhysical, isRecreational, isCommunal, newColor);
    setNewName(''); setNewWeight(3);
    setIsPhysical(false); setIsRecreational(false); setIsCommunal(false);
    setNewColor('#38BDF8');
    setModalVisible(false);
    onAdded();
  }

  function handleDelete(cat: DBCategory) {
    const usedHint = cat.used === 1
      ? ` It's been logged against before, so it'll move to Past History — viewable, but can't be selected again.`
      : '';
    Alert.alert('Delete activity tag?', `Remove "${cat.name}" from your active tags.${usedHint}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteCategory(cat.name);
        onSelect(selected.filter(n => n !== cat.name));
        onAdded();
      }},
    ]);
  }

  function openPastHistory() {
    setPastHistory(getPastHistoryCategories());
    setHistoryVisible(true);
  }

  function showWeightInfo() {
    Alert.alert(
      'Weight (1–20)',
      'Weight controls how much XP this activity earns. Higher weight → more XP per minute logged.\n\n' +
      'Formula: a = 3.5 + 0.04 × weight\n' +
      '≤ 30 min: XP follows a curve toward a × 10\n' +
      '> 30 min: XP keeps climbing at a flat per-minute rate based on weight\n\n' +
      'Example: weight 18 (Workout) earns noticeably more than weight 5 (Journal) for the same duration.',
    );
  }

  function showAttributeInfo() {
    Alert.alert(
      'Attribute (for Game)',
      'Picks which in-game stat this activity feeds. Every time you log this activity, it grants +1 directly to that stat — on top of any AP you\'ve manually allocated to it.\n\n' +
      'Pick the attribute that best matches what the activity builds (e.g. a workout → Strength, journaling → Wisdom).',
    );
  }

  function openManage() {
    setManageVisible(true);
  }

  useImperativeHandle(ref, () => ({ openPastHistory, showWeightInfo, openManage }));

  return (
    <>
      <View style={s.grid}>
        {categories.map((cat) => {
          const active = selected.includes(cat.name);
          const catColor = cat.color || colors.primary;
          return (
            <Pressable key={cat.id} onPress={() => toggle(cat.name)} onLongPress={() => handleDelete(cat)}
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

            <View style={s.labelRow}>
              <Text style={s.subLabel}>Weight (XP impact) — {newWeight}</Text>
              <Pressable onPress={showWeightInfo} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="info" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={s.sliderRow}>
              <Text style={s.sliderEdge}>1</Text>
              <Slider
                style={{ flex: 1 }}
                minimumValue={1}
                maximumValue={20}
                step={1}
                value={newWeight}
                onValueChange={setNewWeight}
                minimumTrackTintColor={newColor}
                maximumTrackTintColor={colors.border}
                thumbTintColor={newColor}
              />
              <Text style={s.sliderEdge}>20</Text>
            </View>

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Physical Activity</Text>
                <Text style={s.toggleHint}>+5 Physical health when logged</Text>
              </View>
              <Switch value={isPhysical} onValueChange={setIsPhysical}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.textPrimary} />
            </View>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Recreational</Text>
                <Text style={s.toggleHint}>+5 Mental health when logged</Text>
              </View>
              <Switch value={isRecreational} onValueChange={setIsRecreational}
                trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.textPrimary} />
            </View>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Communal Activity</Text>
                <Text style={s.toggleHint}>+5 Emotional health when logged</Text>
              </View>
              <Switch value={isCommunal} onValueChange={setIsCommunal}
                trackColor={{ false: colors.border, true: colors.statEmotional }} thumbColor={colors.textPrimary} />
            </View>

            <View style={s.labelRow}>
              <Text style={s.subLabel}>Attribute (for Game)</Text>
              <Pressable onPress={showAttributeInfo} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="info" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
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

      <Modal visible={historyVisible} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setHistoryVisible(false)} />
        <View style={s.historySheet}>
          <Text style={s.sheetTitle}>Past History</Text>
          <Text style={s.subLabel}>Archived activity tags — viewable, can't be selected again.</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {pastHistory.length === 0 ? (
              <Text style={s.emptyText}>Nothing archived yet.</Text>
            ) : pastHistory.map(cat => (
              <View key={cat.id} style={s.historyRow}>
                <View style={[s.pillDot, { backgroundColor: cat.color || colors.primary }]} />
                <Text style={s.historyName}>{cat.name}</Text>
                <Text style={s.historyMeta}>w{cat.weight} · {ATTR_LABELS[cat.attribute] ?? cat.attribute}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={() => setHistoryVisible(false)} style={s.closeBtn}>
            <Text style={s.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={manageVisible} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setManageVisible(false)} />
        <View style={s.historySheet}>
          <Text style={s.sheetTitle}>Manage Activities</Text>
          <Text style={s.subLabel}>Tap the trash icon to remove a tag. Tags you've logged before move to Past History instead of being erased.</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {categories.map(cat => (
              <View key={cat.id} style={s.historyRow}>
                <View style={[s.pillDot, { backgroundColor: cat.color || colors.primary }]} />
                <Text style={[s.historyName, { flex: 1 }]} numberOfLines={1}>{cat.name}</Text>
                {cat.used === 1 && <Text style={s.historyMeta}>used</Text>}
                <Pressable onPress={() => handleDelete(cat)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={14} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={() => setManageVisible(false)} style={s.closeBtn}>
            <Text style={s.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
});

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sliderEdge: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, width: 18, textAlign: 'center' },
  historySheet: {
    position: 'absolute', top: '20%', left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, paddingVertical: spacing.md, textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  historyName: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  historyMeta: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  closeBtn: { borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  closeBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 2, borderColor: colors.textPrimary },
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
