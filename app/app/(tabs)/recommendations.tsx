import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Screen } from '../../src/components/Screen';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import {
  type InsightSuggestion, type SuggestionKind,
  getPendingSuggestions, getResolvedSuggestions, isPersonalizationEnabled,
  generateInsightSuggestions, acceptSuggestion, dismissSuggestion,
} from '../../src/db/insights';

const KIND_ICON: Record<SuggestionKind, React.ComponentProps<typeof Feather>['name']> = {
  new_category: 'tag',
  tier_ready: 'trending-up',
  mood_trend: 'activity',
};

function fmtDate(iso: string) {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function RecommendationsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [pending, setPending] = useState<InsightSuggestion[]>([]);
  const [resolved, setResolved] = useState<InsightSuggestion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [nameModal, setNameModal] = useState<InsightSuggestion | null>(null);
  const [nameInput, setNameInput] = useState('');

  const reload = useCallback(() => {
    const on = isPersonalizationEnabled();
    setEnabled(on);
    if (on) {
      generateInsightSuggestions();
      setPending(getPendingSuggestions());
      setResolved(getResolvedSuggestions());
    } else {
      setPending([]);
      setResolved([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function handleAccept(item: InsightSuggestion) {
    if (item.kind === 'new_category') {
      setNameInput('');
      setNameModal(item);
      return;
    }
    acceptSuggestion(item.id);
    reload();
  }

  function handleDismiss(item: InsightSuggestion) {
    dismissSuggestion(item.id);
    reload();
  }

  function confirmNameModal() {
    if (!nameModal) return;
    const name = nameInput.trim();
    if (!name) return;
    acceptSuggestion(nameModal.id, { categoryName: name });
    setNameModal(null);
    setNameInput('');
    reload();
  }

  if (!enabled) {
    return (
      <Screen style={s.safe}>
        <View style={s.content}>
          <Text style={s.heading}>Insights</Text>
          <View style={s.empty}>
            <Feather name="eye-off" size={40} color={colors.border} />
            <Text style={s.emptyTitle}>Personalized suggestions are off</Text>
            <Text style={s.emptyText}>
              Turn this on in Settings if you'd like the app to gently notice patterns in your logs and suggest tweaks. Nothing changes unless you say yes.
            </Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push('/settings')}>
              <Text style={s.emptyBtnText}>Open Settings</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={s.safe}>
      <View style={s.content}>
        <Text style={s.heading}>Insights</Text>
        <Text style={s.sub}>Quiet observations about your patterns — accept what's useful, dismiss the rest.</Text>

        {pending.length === 0 ? (
          <View style={s.empty}>
            <Feather name="eye" size={40} color={colors.border} />
            <Text style={s.emptyTitle}>Nothing to surface yet</Text>
            <Text style={s.emptyText}>Keep logging — once your patterns settle in, suggestions will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={pending}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.iconBadge}>
                    <Feather name={KIND_ICON[item.kind]} size={14} color={colors.primary} />
                  </View>
                  <Text style={s.cardTitle}>{item.title}</Text>
                </View>
                <Text style={s.cardDesc}>{item.description}</Text>
                <View style={s.cardActions}>
                  <Pressable style={s.dismissBtn} onPress={() => handleDismiss(item)}>
                    <Text style={s.dismissBtnText}>Dismiss</Text>
                  </Pressable>
                  <Pressable style={s.acceptBtn} onPress={() => handleAccept(item)}>
                    <Text style={s.acceptBtnText}>
                      {item.kind === 'new_category' ? 'Name it' : 'Acknowledge'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        {resolved.length > 0 && (
          <Pressable style={s.historyToggle} onPress={() => setShowHistory(v => !v)}>
            <Text style={s.historyToggleText}>{showHistory ? 'Hide' : 'Show'} past suggestions</Text>
            <Feather name={showHistory ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          </Pressable>
        )}

        {showHistory && (
          <FlatList
            data={resolved}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
            renderItem={({ item }) => (
              <View style={s.historyRow}>
                <Feather name={KIND_ICON[item.kind]} size={12} color={colors.textMuted} />
                <Text style={s.historyTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={[s.historyStatus, item.status === 'accepted' && s.historyStatusAccepted]}>
                  {item.status}
                </Text>
                <Text style={s.historyDate}>{fmtDate(item.resolved_at ?? item.generated_at)}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Name-entry modal for new_category suggestions */}
      <Modal visible={!!nameModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAvoid}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNameModal(null)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>What should we call it?</Text>
            <Text style={s.sheetHint}>
              It'll keep the same stat focus and styling as "{nameModal?.payload.source_category}" — you're just giving it its own name.
            </Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Morning Run"
              placeholderTextColor={colors.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={confirmNameModal}
            />
            <Pressable onPress={confirmNameModal} style={[s.saveBtn, !nameInput.trim() && s.saveBtnDisabled]} disabled={!nameInput.trim()}>
              <Text style={s.saveBtnText}>Create category</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  heading: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  sub: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },

  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },

  card: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  cardTitle: { flex: 1, fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  cardDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: 2 },
  dismissBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  dismissBtnText: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  acceptBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, color: colors.bg },

  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  historyToggleText: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  historyTitle: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  historyStatus: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' },
  historyStatusAccepted: { color: colors.success },
  historyDate: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, minWidth: 52, textAlign: 'right' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  emptyBtnText: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.primary },

  kbAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  sheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  sheetHint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});
