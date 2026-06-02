import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type Props = {
  value: number | null;
  onChange: (value: number) => void;
};

export function MoodSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Mood</Text>
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isSelected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[
                styles.box,
                { backgroundColor: isSelected ? colors.moodActive[n - 1] : colors.mood[n - 1] },
                isSelected && {
                  shadowColor: colors.moodActive[n - 1],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.7,
                  shadowRadius: 6,
                },
              ]}
            >
              <Text style={[styles.num, { color: isSelected ? '#000' : colors.textMuted }]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.xs,
  },
});
