import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getRPGState, purchaseStreakFreeze, type RPGState } from '../src/db/rpg';

export default function StoreScreen() {
  const [rpg, setRpg] = useState<RPGState | null>(null);

  useFocusEffect(useCallback(() => { setRpg(getRPGState()); }, []));

  const coins = rpg?.coins ?? 0;
  const freezes = rpg?.streak_freezes ?? 0;
  const FREEZE_COST = 50;

  function handleBuyFreeze() {
    if (coins < FREEZE_COST) {
      Alert.alert('Not enough coins', 'Coins are earned in the Game. Come back once you\'ve played.');
      return;
    }
    Alert.alert(
      'Buy Streak Freeze',
      `Spend ${FREEZE_COST} coins to protect your streak for one missed day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            const result = purchaseStreakFreeze();
            if (result === 'ok') {
              setRpg(getRPGState());
              Alert.alert('Purchased', `Streak Freeze added. You now have ${freezes + 1} freeze(s).`);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Store</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Coin balance */}
      <View style={s.balanceCard}>
        <Feather name="dollar-sign" size={20} color={colors.success} />
        <View>
          <Text style={s.balanceVal}>{coins}</Text>
          <Text style={s.balanceLabel}>Coins · earned in Game</Text>
        </View>
      </View>

      <Text style={s.sectionHead}>Available</Text>

      {/* Streak Freeze */}
      <View style={s.itemCard}>
        <View style={s.itemIcon}>
          <Feather name="shield" size={22} color={colors.primary} />
        </View>
        <View style={s.itemInfo}>
          <Text style={s.itemName}>Streak Freeze</Text>
          <Text style={s.itemDesc}>Protect your streak for one missed day. Auto-activates.</Text>
          {freezes > 0 && (
            <Text style={s.ownedBadge}>You have {freezes} freeze{freezes > 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={s.itemRight}>
          <Text style={s.itemCost}>{FREEZE_COST}</Text>
          <Text style={s.itemCostLabel}>coins</Text>
          <Pressable
            onPress={handleBuyFreeze}
            style={[s.buyBtn, coins < FREEZE_COST && s.buyBtnDisabled]}
          >
            <Text style={s.buyBtnText}>Buy</Text>
          </Pressable>
        </View>
      </View>

      <Text style={s.moreText}>More items coming once the Game is built.</Text>
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
  backBtn: { padding: 4 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    margin: spacing.lg, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
  },
  balanceVal: { fontFamily: fonts.mono.bold, fontSize: fontSize.xl, color: colors.success },
  balanceLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  sectionHead: {
    fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textMuted,
    paddingHorizontal: spacing.lg, letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md,
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: 'rgba(56,189,248,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  itemDesc: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  ownedBadge: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.success },
  itemRight: { alignItems: 'center', gap: 2 },
  itemCost: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.success },
  itemCostLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  buyBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 4,
  },
  buyBtnDisabled: { backgroundColor: colors.border },
  buyBtnText: { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, color: colors.bg },
  moreText: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.xl, padding: spacing.lg,
  },
});
