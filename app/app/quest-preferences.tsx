// Quest Preferences — living, editable Q1-Q8 settings page (ONBOARDING_QUEST_SPEC.md §10).
// Replaces the old "Redo onboarding button" idea: instead of a one-shot redo, the same
// answers that drove onboarding stay always-accessible and editable here. Saving re-derives
// categories/custom_moods/restorative_activities through the same pathway as "retain on reset"
// (completeOnboarding → deriveAndApplyAnswers) — one source of truth, one regeneration path.
//
// Gated behind biometrics, mirroring the Delete & Reset pattern at settings.tsx:69 — this
// reshapes the player's experience the same way data destruction does, so it gets the same gate.

import React, { useEffect, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import Slider from '@react-native-community/slider';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { completeOnboarding, getOnboardingAnswers, OnboardingAnswers } from '../src/db/onboarding';
import { Chip, OptionRow, s as qs } from '../src/components/onboarding/QuestionPickers';
import {
  Q1_CLUSTERS, Q1_OTHER, Q1_CAP, DOMAIN_TO_CLUSTER, Q1B_SUBTOPICS, INTENT_OPTIONS,
  Q2_OPTIONS, Q3_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, Q5_CAP, Q7_LABELS,
} from '../src/components/onboarding/questionBank';

export default function QuestPreferencesScreen() {
  const [unlocked, setUnlocked] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});

  useEffect(() => {
    (async () => {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Quest Preferences',
          fallbackLabel: 'Use passcode',
          disableDeviceFallback: false,
        });
        if (result.success) {
          setAnswers(getOnboardingAnswers().answers);
          setUnlocked(true);
        } else {
          setAuthFailed(true);
        }
      } catch {
        setAuthFailed(true);
      }
    })();
  }, []);

  function set<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: 'q4_unwind' | 'q5_track', value: string, cap?: number) {
    setAnswers(prev => {
      const arr = prev[key] ?? [];
      const has = arr.includes(value);
      let nextArr: string[];
      if (has) nextArr = arr.filter(v => v !== value);
      else if (cap && arr.length >= cap) return prev;
      else nextArr = [...arr, value];
      return { ...prev, [key]: nextArr };
    });
  }

  function toggleQ1(domain: string) {
    setAnswers(prev => {
      const arr = prev.q1_fields ?? [];
      if (domain === Q1_OTHER) {
        return { ...prev, q1_fields: arr.includes(Q1_OTHER) ? [] : [Q1_OTHER], q1b_intent: undefined, q1b_subtopic: undefined };
      }
      const withoutOther = arr.filter(d => d !== Q1_OTHER);
      const has = withoutOther.includes(domain);
      let nextArr: string[];
      if (has) nextArr = withoutOther.filter(d => d !== domain);
      else if (withoutOther.length >= Q1_CAP) return prev;
      else nextArr = [...withoutOther, domain];
      return { ...prev, q1_fields: nextArr };
    });
  }

  function save() {
    Alert.alert(
      'Save changes?',
      'This re-derives your categories, moods, and restoratives from these answers. Anything already in your grid stays — this only adds what changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            completeOnboarding(answers);
            Alert.alert('Saved', 'Your quest preferences have been updated.');
          },
        },
      ],
    );
  }

  const cluster = (answers.q1_fields ?? []).map(d => DOMAIN_TO_CLUSTER[d]).find(Boolean);
  const showQ1b = (answers.q1_fields ?? []).some(d => d !== Q1_OTHER);
  const showQ1bSubtopic = showQ1b && (answers.q1b_intent === 'deeper' || answers.q1b_intent === 'both') && !!cluster;

  if (!unlocked) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.lockedWrap}>
          <Feather name="lock" size={28} color={colors.textMuted} />
          <Text style={s.lockedTxt}>{authFailed ? 'Authentication failed.' : 'Authenticating…'}</Text>
          {authFailed && (
            <Pressable style={s.retryBtn} onPress={() => router.back()}>
              <Text style={s.retryBtnTxt}>Go back</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Quest Preferences</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.warningCard}>
          <Feather name="alert-triangle" size={15} color={colors.accent} />
          <Text style={s.warningTxt}>Changing these may affect the quests and recommendations you receive.</Text>
        </View>

        {/* Q1 */}
        <Text style={s.question}>What field do you work or study in?</Text>
        <Text style={s.hint}>Pick up to {Q1_CAP}.</Text>
        {Q1_CLUSTERS.map(({ cluster: name, domains }) => (
          <View key={name} style={s.clusterGroup}>
            <Text style={s.clusterLabel}>{name.toUpperCase()}</Text>
            <View style={qs.chipWrap}>
              {domains.map(d => (
                <Chip key={d} label={d} selected={(answers.q1_fields ?? []).includes(d)} onPress={() => toggleQ1(d)} />
              ))}
            </View>
          </View>
        ))}
        <View style={qs.chipWrap}>
          <Chip label={Q1_OTHER} selected={(answers.q1_fields ?? []).includes(Q1_OTHER)} onPress={() => toggleQ1(Q1_OTHER)} />
        </View>

        {/* Q1b */}
        {showQ1b && (
          <>
            <Text style={[s.question, s.spaced]}>Within your field, are you looking to...?</Text>
            {INTENT_OPTIONS.map(opt => (
              <OptionRow key={opt.key} label={opt.label} hint={opt.hint} selected={answers.q1b_intent === opt.key} onPress={() => set('q1b_intent', opt.key)} />
            ))}
          </>
        )}
        {showQ1bSubtopic && (
          <>
            <Text style={[s.question, s.spaced]}>Which side of it interests you most?</Text>
            <View style={qs.chipWrap}>
              {(Q1B_SUBTOPICS[cluster!] ?? []).map(t => (
                <Chip key={t} label={t} selected={answers.q1b_subtopic === t} onPress={() => set('q1b_subtopic', t)} />
              ))}
            </View>
          </>
        )}

        {/* Q2 */}
        <Text style={[s.question, s.spaced]}>How often do you exercise?</Text>
        {Q2_OPTIONS.map(opt => (
          <OptionRow key={opt.key} label={opt.label} selected={answers.q2_exercise === opt.key} onPress={() => set('q2_exercise', opt.key)} />
        ))}

        {/* Q3 */}
        <Text style={[s.question, s.spaced]}>Do you play music or do creative work?</Text>
        <View style={qs.chipWrap}>
          {Q3_OPTIONS.map(opt => (
            <Chip key={opt} label={opt} selected={answers.q3_creative === opt} onPress={() => set('q3_creative', answers.q3_creative === opt ? null : opt)} />
          ))}
        </View>

        {/* Q4 */}
        <Text style={[s.question, s.spaced]}>How do you usually unwind?</Text>
        <Text style={s.hint}>Pick as many as fit.</Text>
        <View style={qs.chipWrap}>
          {Q4_OPTIONS.map(opt => (
            <Chip key={opt} label={opt} selected={(answers.q4_unwind ?? []).includes(opt)} onPress={() => toggleMulti('q4_unwind', opt)} />
          ))}
        </View>

        {/* Q5 */}
        <Text style={[s.question, s.spaced]}>What else do you want to track?</Text>
        <Text style={s.hint}>Pick up to {Q5_CAP} — {(answers.q5_track ?? []).length}/{Q5_CAP} selected.</Text>
        <View style={qs.chipWrap}>
          {Q5_OPTIONS.map(opt => (
            <Chip key={opt} label={opt} selected={(answers.q5_track ?? []).includes(opt)} onPress={() => toggleMulti('q5_track', opt, Q5_CAP)} />
          ))}
        </View>

        {/* Q6 */}
        <Text style={[s.question, s.spaced]}>About how many hours a day do you expect to log activity?</Text>
        <View style={qs.sliderBlock}>
          <Text style={qs.sliderValue}>{(answers.q6_hours_per_day ?? 2).toFixed(1)} hrs/day</Text>
          <View style={qs.sliderRow}>
            <Text style={qs.sliderEdge}>0.5</Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0.5}
              maximumValue={6}
              step={0.5}
              value={answers.q6_hours_per_day ?? 2}
              onValueChange={v => set('q6_hours_per_day', v)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={qs.sliderEdge}>6+</Text>
          </View>
        </View>

        {/* Q7 */}
        <Text style={[s.question, s.spaced]}>When you fall short of a goal, what helps more?</Text>
        <View style={qs.sliderBlock}>
          <Text style={qs.sliderValue}>{Q7_LABELS[Math.round(((answers.q7_difficulty_bias ?? 0) + 1) / 2 * (Q7_LABELS.length - 1))]}</Text>
          <View style={qs.sliderRow}>
            <Text style={qs.sliderEdge}>Gentle</Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={-1}
              maximumValue={1}
              step={0.5}
              value={answers.q7_difficulty_bias ?? 0}
              onValueChange={v => set('q7_difficulty_bias', v)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={qs.sliderEdge}>Push</Text>
          </View>
        </View>

        {/* Q8 */}
        <Text style={[s.question, s.spaced]}>Want personalized quest suggestions based on your patterns over time?</Text>
        <OptionRow label="Yes, suggest things to me" selected={answers.q8_personalization === true} onPress={() => set('q8_personalization', true)} />
        <OptionRow label="No thanks" selected={answers.q8_personalization === false} onPress={() => set('q8_personalization', false)} />

        <Pressable style={s.saveBtn} onPress={save}>
          <Feather name="check" size={16} color={colors.bg} />
          <Text style={s.saveBtnTxt}>Save changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { padding: 6 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  scroll: { padding: spacing.md, paddingBottom: 60, gap: spacing.sm },

  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  lockedTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  retryBtn: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryBtnTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },

  warningCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  warningTxt: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary, lineHeight: 17 },

  question: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 22 },
  spaced: { marginTop: spacing.md },
  hint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },

  clusterGroup: { gap: spacing.xs, marginTop: spacing.xs },
  clusterLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1.5 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  saveBtnTxt: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.bg },
});
