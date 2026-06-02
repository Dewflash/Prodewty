import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getRevelations, type Revelation } from '../src/db/logs';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00');
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
}

export default function RevelationsScreen() {
  const [items, setItems] = useState<Revelation[]>([]);
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => { setItems(getRevelations()); }, []));

  const filtered = query.trim()
    ? items.filter(r =>
        r.revelation.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Revelations</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={s.searchRow}>
        <Feather name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search revelations..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Feather name="x" size={15} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Feather name="zap" size={32} color={colors.border} />
          <Text style={s.emptyText}>
            {query ? 'No revelations match.' : 'No revelations yet.\nFill the Revelation field when logging.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.meta}>
                <View style={s.tag}><Text style={s.tagText}>{item.category}</Text></View>
                <Text style={s.date}>{fmtDate(item.log_date)}</Text>
              </View>
              <Text style={s.text}>{item.revelation}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { padding: 4 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  sep: { height: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.textMuted },
  date: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  text: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
