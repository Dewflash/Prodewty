import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { handleDeath, type DeathCause } from '../db/game';

type Props = {
  cause: DeathCause;
  onRise: () => void;
};

const CAUSE_TEXT: Record<NonNullable<DeathCause>, string> = {
  hp:        'Your HP reached zero.',
  emotional: 'Emotional exhaustion consumed you.',
  physical:  'Physical depletion brought you down.',
  mental:    'Mental fatigue shattered your will.',
};

export function DeathScreen({ cause, onRise }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cause) {
      handleDeath(cause);
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  }, [cause]);

  if (!cause) return null;

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[s.overlay, { opacity }]}>
        <View style={s.content}>
          <Text style={s.youHave}>YOU HAVE</Text>
          <Text style={s.died}>DIED</Text>
          <View style={s.divider} />
          <Text style={s.cause}>{CAUSE_TEXT[cause]}</Text>
          <Text style={s.penalty}>HP restored to 50. Rise and try again.</Text>
          <Pressable style={s.riseBtn} onPress={onRise}>
            <Text style={s.riseTxt}>RISE AGAIN</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.97)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { alignItems: 'center', gap: spacing.lg, padding: spacing.xxl },
  youHave: {
    fontFamily: fonts.mono.regular, fontSize: fontSize.md,
    color: '#EF4444', letterSpacing: 6,
  },
  died: {
    fontFamily: fonts.mono.bold, fontSize: 72,
    color: '#EF4444', letterSpacing: 8,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 20,
  },
  divider: { width: 120, height: 1, backgroundColor: '#EF4444', opacity: 0.4 },
  cause: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.base,
    color: colors.textMuted, textAlign: 'center', lineHeight: 22,
  },
  penalty: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.sm,
    color: colors.textMuted, textAlign: 'center',
  },
  riseBtn: {
    borderWidth: 1, borderColor: '#EF4444', borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  riseTxt: {
    fontFamily: fonts.mono.bold, fontSize: fontSize.base,
    color: '#EF4444', letterSpacing: 4,
  },
});
