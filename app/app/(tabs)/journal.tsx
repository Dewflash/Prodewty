import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function JournalScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.heading}>Journal</Text>
        <Text style={styles.sub}>Coming in Phase 4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.lg },
  heading: {
    fontFamily: fonts.ui.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fonts.ui.regular,
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
