import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { XPBar } from '../../src/components/XPBar';
import { CategoryGrid } from '../../src/components/CategoryGrid';
import { MoodSelector } from '../../src/components/MoodSelector';
import { useAppStore } from '../../src/store/useAppStore';
import { createLog } from '../../src/db/logs';
import { getRPGState } from '../../src/db/rpg';

export default function HomeScreen() {
  const { rpgState, setRPGState } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const xpPopupOpacity = useRef(new Animated.Value(0)).current;
  const xpPopupY = useRef(new Animated.Value(0)).current;
  const [lastXP, setLastXP] = useState<number | null>(null);

  useEffect(() => {
    setRPGState(getRPGState());
  }, []);

  function showXPPopup(xp: number) {
    setLastXP(xp);
    xpPopupY.setValue(0);
    xpPopupOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(xpPopupY, { toValue: -40, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(xpPopupOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function handleSubmit() {
    if (!selectedCategory || mood === null || submitting) return;
    setSubmitting(true);
    const result = createLog({
      category: selectedCategory,
      mood_rating: mood,
      description: note || undefined,
      duration_mins: duration ? parseInt(duration, 10) : undefined,
    });
    showXPPopup(result.xp_awarded);
    setRPGState(getRPGState());
    setSelectedCategory(null);
    setMood(null);
    setNote('');
    setDuration('');
    setSubmitting(false);
  }

  const canSubmit = selectedCategory !== null && mood !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.xpSection}>
            {rpgState && (
              <XPBar
                level={rpgState.current_level}
                totalXP={rpgState.total_xp}
                xpToNext={rpgState.xp_to_next_level}
                title={rpgState.title}
                streakDays={rpgState.streak_days}
              />
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Activity</Text>
            <CategoryGrid selected={selectedCategory} onSelect={setSelectedCategory} />
          </View>

          <View style={styles.section}>
            <MoodSelector value={mood} onChange={setMood} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration (min)</Text>
            <TextInput
              style={styles.durationInput}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          <View style={styles.submitWrapper}>
            <Animated.Text
              style={[styles.xpPopup, { opacity: xpPopupOpacity, transform: [{ translateY: xpPopupY }] }]}
            >
              +{lastXP} XP
            </Animated.Text>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            >
              <Text style={styles.submitText}>Log Activity</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  xpSection: { paddingTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    width: 120,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitWrapper: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  xpPopup: {
    fontFamily: fonts.mono.bold,
    fontSize: fontSize.lg,
    color: colors.success,
    position: 'absolute',
    top: -spacing.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  submitBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0 },
  submitText: {
    fontFamily: fonts.ui.semibold,
    fontSize: fontSize.base,
    color: colors.bg,
  },
});
