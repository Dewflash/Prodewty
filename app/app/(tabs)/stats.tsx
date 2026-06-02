import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { getLogs, type ActivityLog } from '../../src/db/logs';
import { useAppStore } from '../../src/store/useAppStore';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function StatsScreen() {
  const { recentLogs, setRecentLogs } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      setRecentLogs(getLogs());
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Activity Log</Text>
        {recentLogs.length === 0 ? (
          <Text style={styles.empty}>No logs yet. Start from Home.</Text>
        ) : (
          recentLogs.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LogRow({ log }: { log: ActivityLog }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.category}>{log.category}</Text>
        {log.description ? <Text style={styles.desc} numberOfLines={1}>{log.description}</Text> : null}
        <Text style={styles.time}>{formatDate(log.created_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.xp}>+{log.xp_awarded}</Text>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  heading: {
    fontFamily: fonts.ui.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: 60,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { flex: 1, gap: 3 },
  category: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  desc: {
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  time: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rowRight: { alignItems: 'flex-end' },
  xp: {
    fontFamily: fonts.mono.bold,
    fontSize: fontSize.md,
    color: colors.success,
  },
  xpLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
