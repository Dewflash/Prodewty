import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getGameLogs, type GameLog } from '../src/db/game';

const EVENT_ICON: Record<string, { icon: string; color: string }> = {
  quest_complete: { icon: 'check-circle', color: colors.success },
  dungeon_win:    { icon: 'shield',       color: colors.primary },
  dungeon_fail:   { icon: 'alert-circle', color: '#F97316' },
  death:          { icon: 'x-circle',     color: '#EF4444' },
};

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: string) {
  const dt = new Date(d.replace(' ', 'T'));
  return `${dt.getDate()} ${MONTHS_S[dt.getMonth()]} · ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

export default function GameLogScreen() {
  const [logs, setLogs] = useState<GameLog[]>([]);

  useFocusEffect(useCallback(() => { setLogs(getGameLogs()); }, []));

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Game Log</Text>
        <View style={{ width: 30 }} />
      </View>

      {logs.length === 0 ? (
        <View style={s.empty}>
          <Feather name="activity" size={36} color={colors.border} />
          <Text style={s.emptyText}>No game events yet.{'\n'}Complete quests or enter dungeons.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const meta = EVENT_ICON[item.event_type] ?? { icon: 'circle', color: colors.textMuted };
            return (
              <View style={s.row}>
                <Feather name={meta.icon as any} size={18} color={meta.color} style={s.rowIcon} />
                <View style={s.rowInfo}>
                  <Text style={s.rowDesc}>{item.description}</Text>
                  <Text style={s.rowTime}>{fmtDate(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.sep} />}
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
  list: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowIcon: { marginTop: 2 },
  rowInfo: { flex: 1, gap: 2 },
  rowDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  rowTime: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  sep: { height: 1, backgroundColor: colors.border },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
