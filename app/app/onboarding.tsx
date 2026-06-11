// Onboarding question flow — ONBOARDING_QUEST_SPEC.md §3 (question bank) + §5 (transparency copy).
// Universal path for populating ANY fresh account (no special-casing — see project memory).
// Philosophy: never gate. Every question is skippable; the Layer-1 baseline (already
// seeded by schema migrations) guarantees a working app even with zero answers.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Screen } from '../src/components/Screen';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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

type StepId = 'intro' | 'retain_prompt' | 'callout' | 'q1' | 'q1b_intent' | 'q1b_subtopic' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'done';

const QUESTION_LABELS: { key: keyof OnboardingAnswers; label: string }[] = [
  { key: 'q1_fields', label: 'What field you work or study in' },
  { key: 'q2_exercise', label: 'How often you exercise' },
  { key: 'q3_creative', label: 'Music or creative work' },
  { key: 'q4_unwind', label: 'How you usually unwind' },
  { key: 'q5_track', label: 'What else you want to track' },
  { key: 'q6_hours_per_day', label: 'Hours a day you expect to log' },
  { key: 'q7_difficulty_bias', label: 'Gentle vs. push preference' },
  { key: 'q8_personalization', label: 'Personalized suggestions' },
];

function getSkipped(a: OnboardingAnswers): string[] {
  return QUESTION_LABELS.filter(({ key }) => {
    const v = a[key];
    return v === undefined || (Array.isArray(v) && v.length === 0);
  }).map(({ label }) => label);
}

export default function OnboardingScreen() {
  // A reset (settings.tsx → performFullReset) clears completed_at but keeps the raw
  // answers — that's the trigger for the "retain or start fresh" prompt (spec §9).
  // A genuinely fresh install has empty answers, so the prompt never appears for it.
  const [priorRecord] = useState(() => getOnboardingAnswers());
  const hasPriorAnswers = Object.keys(priorRecord.answers).length > 0 && !priorRecord.completed_at;

  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [retainChoice, setRetainChoice] = useState<'retain' | 'fresh' | null>(null);
  const [fillInBlanks, setFillInBlanks] = useState(false);

  // Steps are computed dynamically — Q1b only appears if Q1 was answered with a
  // real domain, and the subtopic follow-up only for "Go deeper" / "A bit of both".
  // The retain/fresh prompt + gap callout only ever appear on a reset re-run.
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ['intro'];
    if (hasPriorAnswers) {
      s.push('retain_prompt');
      if (retainChoice === null) { s.push('done'); return s; }
      if (retainChoice === 'retain' && !fillInBlanks) { s.push('callout', 'done'); return s; }
    }
    s.push('q1');
    const hasRealDomain = (answers.q1_fields ?? []).some(d => d !== Q1_OTHER);
    if (hasRealDomain) {
      s.push('q1b_intent');
      if (answers.q1b_intent === 'deeper' || answers.q1b_intent === 'both') s.push('q1b_subtopic');
    }
    s.push('q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'done');
    return s;
  }, [answers.q1_fields, answers.q1b_intent, hasPriorAnswers, retainChoice, fillInBlanks]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isFirst = stepIndex === 0;
  const isLast = step === 'done';

  function next() { setStepIndex(i => Math.min(i + 1, steps.length - 1)); }
  function back() { setStepIndex(i => Math.max(i - 1, 0)); }

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

  function finish() {
    completeOnboarding(answers);
    router.replace('/(tabs)');
  }

  function chooseRetain() {
    setAnswers(priorRecord.answers);
    setRetainChoice('retain');
    setStepIndex(i => i + 1);
  }

  function chooseFresh() {
    setAnswers({});
    setRetainChoice('fresh');
    setStepIndex(i => i + 1);
  }

  function fillInGaps() {
    // No index change needed — 'callout' and 'q1' both sit at the same index
    // (intro, retain_prompt, [callout|q1], ...), so the step swaps under us.
    setFillInBlanks(true);
  }

  function skipAll() {
    completeOnboarding({});
    router.replace('/(tabs)');
  }

  const cluster = (answers.q1_fields ?? []).map(d => DOMAIN_TO_CLUSTER[d]).find(Boolean);

  return (
    <Screen style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={back} style={[s.headerBtn, { opacity: isFirst ? 0 : 1 }]} disabled={isFirst}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={s.dots}>
          {steps.slice(1, -1).map((_, i) => (
            <View key={i} style={[s.dot, i === stepIndex - 1 && s.dotActive]} />
          ))}
        </View>
        {!isLast ? (
          <Pressable onPress={skipAll} style={s.headerBtn}>
            <Text style={s.skipAllTxt}>Skip</Text>
          </Pressable>
        ) : <View style={s.headerBtn} />}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {step === 'intro' && (
          <View style={s.block}>
            <Text style={s.heading}>Let's set up your world</Text>
            <Text style={s.body}>
              A few quick questions help shape your starting categories, restoratives, and the
              quests you'll get drawn from your own logged activity over time.
            </Text>
            <Text style={s.body}>
              Nothing here is permanent — skip anything you'd rather not answer, and you can
              change your mind later. Your account works fine either way.
            </Text>
            <View style={s.privacyCard}>
              <Feather name="shield" size={16} color={colors.success} />
              <Text style={s.privacyTxt}>
                Everything happens on your device. We don't have a server — your answers never leave your phone.
              </Text>
            </View>
          </View>
        )}

        {step === 'retain_prompt' && (
          <View style={s.block}>
            <Text style={s.heading}>Welcome back</Text>
            <Text style={s.body}>
              You've answered these questions before. Want to keep what you said last time,
              or start over with a clean slate?
            </Text>
            <OptionRow
              label="Retain my previous answers"
              hint="Re-derives your categories and restoratives from what you told us before"
              selected={false}
              onPress={chooseRetain}
            />
            <OptionRow
              label="Start fresh"
              hint="Discards the old answers and walks through every question again"
              selected={false}
              onPress={chooseFresh}
            />
          </View>
        )}

        {step === 'callout' && (() => {
          const skipped = getSkipped(answers);
          return (
            <View style={s.block}>
              <Text style={s.heading}>Your answers are back</Text>
              <Text style={s.body}>
                We've re-derived your categories and restoratives from what you told us before.
              </Text>
              {skipped.length > 0 && (
                <View style={s.privacyCard}>
                  <Feather name="info" size={16} color={colors.primary} />
                  <Text style={s.privacyTxt}>
                    Last time you skipped: {skipped.join(', ')}. Want to fill any of these in now?
                  </Text>
                </View>
              )}
              {skipped.length > 0 && (
                <Pressable style={s.linkBtn} onPress={fillInGaps}>
                  <Text style={s.linkBtnTxt}>Fill in the gaps</Text>
                  <Feather name="arrow-right" size={14} color={colors.primary} />
                </Pressable>
              )}
            </View>
          );
        })()}

        {step === 'q1' && (
          <View style={s.block}>
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
          </View>
        )}

        {step === 'q1b_intent' && (
          <View style={s.block}>
            <Text style={s.question}>Within your field, are you looking to...?</Text>
            {INTENT_OPTIONS.map(opt => (
              <OptionRow
                key={opt.key}
                label={opt.label}
                hint={opt.hint}
                selected={answers.q1b_intent === opt.key}
                onPress={() => set('q1b_intent', opt.key)}
              />
            ))}
          </View>
        )}

        {step === 'q1b_subtopic' && cluster && (
          <View style={s.block}>
            <Text style={s.question}>Which side of it interests you most?</Text>
            <View style={qs.chipWrap}>
              {(Q1B_SUBTOPICS[cluster] ?? []).map(t => (
                <Chip key={t} label={t} selected={answers.q1b_subtopic === t} onPress={() => set('q1b_subtopic', t)} />
              ))}
            </View>
          </View>
        )}

        {step === 'q2' && (
          <View style={s.block}>
            <Text style={s.question}>How often do you exercise?</Text>
            {Q2_OPTIONS.map(opt => (
              <OptionRow key={opt.key} label={opt.label} selected={answers.q2_exercise === opt.key} onPress={() => set('q2_exercise', opt.key)} />
            ))}
          </View>
        )}

        {step === 'q3' && (
          <View style={s.block}>
            <Text style={s.question}>Do you play music or do creative work?</Text>
            <Text style={s.hint}>Pick one, or skip if it's not your thing.</Text>
            <View style={qs.chipWrap}>
              {Q3_OPTIONS.map(opt => (
                <Chip key={opt} label={opt} selected={answers.q3_creative === opt} onPress={() => set('q3_creative', opt)} />
              ))}
            </View>
          </View>
        )}

        {step === 'q4' && (
          <View style={s.block}>
            <Text style={s.question}>How do you usually unwind?</Text>
            <Text style={s.hint}>Pick as many as fit.</Text>
            <View style={qs.chipWrap}>
              {Q4_OPTIONS.map(opt => (
                <Chip key={opt} label={opt} selected={(answers.q4_unwind ?? []).includes(opt)} onPress={() => toggleMulti('q4_unwind', opt)} />
              ))}
            </View>
          </View>
        )}

        {step === 'q5' && (
          <View style={s.block}>
            <Text style={s.question}>What else do you want to track?</Text>
            <Text style={s.hint}>Pick up to {Q5_CAP} — {(answers.q5_track ?? []).length}/{Q5_CAP} selected.</Text>
            <View style={qs.chipWrap}>
              {Q5_OPTIONS.map(opt => (
                <Chip key={opt} label={opt} selected={(answers.q5_track ?? []).includes(opt)} onPress={() => toggleMulti('q5_track', opt, Q5_CAP)} />
              ))}
            </View>
          </View>
        )}

        {step === 'q6' && (
          <View style={s.block}>
            <Text style={s.question}>About how many hours a day do you expect to log activity?</Text>
            <Text style={s.hint}>This shapes how XP per activity is calibrated for you — fewer logs means each is worth more.</Text>
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
          </View>
        )}

        {step === 'q7' && (
          <View style={s.block}>
            <Text style={s.question}>When you fall short of a goal, what helps more?</Text>
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
          </View>
        )}

        {step === 'q8' && (
          <View style={s.block}>
            <Text style={s.question}>Want personalized quest suggestions based on your patterns over time?</Text>
            <Text style={s.hint}>
              This just means the app quietly notices things like "you've logged Guitar 6 times
              this month" and offers to track it properly. You can turn this off anytime in Settings.
            </Text>
            <OptionRow label="Yes, suggest things to me" selected={answers.q8_personalization === true} onPress={() => set('q8_personalization', true)} />
            <OptionRow label="No thanks" selected={answers.q8_personalization === false} onPress={() => set('q8_personalization', false)} />
          </View>
        )}

        {step === 'done' && (
          <View style={s.block}>
            <Text style={s.heading}>You're all set</Text>
            <Text style={s.body}>
              Your starting categories and restoratives are ready. As you log activity, your
              quests will keep adapting to what you actually do — no further setup needed.
            </Text>
          </View>
        )}
      </ScrollView>

      {step !== 'retain_prompt' && (
        <View style={s.footer}>
          {!isLast ? (
            <Pressable style={s.nextBtn} onPress={next}>
              <Text style={s.nextBtnTxt}>{step === 'intro' ? "Let's go" : 'Next'}</Text>
              <Feather name="arrow-right" size={16} color={colors.bg} />
            </Pressable>
          ) : (
            <Pressable style={s.nextBtn} onPress={finish}>
              <Text style={s.nextBtnTxt}>Enter the world</Text>
              <Feather name="arrow-right" size={16} color={colors.bg} />
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerBtn: { width: 56, paddingVertical: 6 },
  skipAllTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'right' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },

  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  block: { gap: spacing.sm },

  heading: { fontFamily: fonts.ui.bold, fontSize: fontSize.xl, color: colors.textPrimary },
  body: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  question: { fontFamily: fonts.ui.semibold, fontSize: fontSize.lg, color: colors.textPrimary, lineHeight: 26 },
  hint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },

  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm,
  },
  privacyTxt: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textPrimary, lineHeight: 17 },

  clusterGroup: { gap: spacing.xs, marginTop: spacing.xs },
  clusterLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1.5 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.xs },
  linkBtnTxt: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.primary },

  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  nextBtnTxt: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.bg },
});
