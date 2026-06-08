import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getRPGState, purchaseStreakFreeze, type RPGState } from '../src/db/rpg';
import {
  purchaseHPBoost, purchaseCosmetic, getDungeonUnlockInfo,
  purchaseDungeonRight, purchaseDungeonKey, getDungeonKeyPrice, dungeonKeyDescription,
} from '../src/db/game';
import { triggerCurrencyRefresh } from '../src/db/currencySignal';
import { db } from '../src/db/schema';
import { playSound, switchBGM } from '../src/services/audio';
import { RANK_COLOR } from '../src/components/game/DungeonCard';

const DUNGEON_RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Legend'];

function purchaseMPBoost(): 'ok' | 'insufficient_coins' {
  try {
    const rpg = db.getFirstSync<{ coins: number; mp: number; hp_max: number }>('SELECT coins, mp, hp_max FROM rpg_state WHERE id=1')!;
    if ((rpg.coins ?? 0) < 75) return 'insufficient_coins';
    db.runSync(`UPDATE rpg_state SET mp = MIN(100, mp + 25), coins = coins - 75 WHERE id = 1`);
    return 'ok';
  } catch { return 'insufficient_coins'; }
}

function purchaseRevivalPotion(): 'ok' | 'insufficient_coins' {
  try {
    const rpg = db.getFirstSync<{ coins: number }>('SELECT coins FROM rpg_state WHERE id=1')!;
    if ((rpg.coins ?? 0) < 150) return 'insufficient_coins';
    db.runSync(`UPDATE rpg_state SET coins = coins - 150, revival_count = revival_count + 1 WHERE id = 1`);
    db.runSync(`INSERT OR IGNORE INTO inventory (item_name, category, item_type, description) VALUES ('Revival Potion','global','consumable','Consumed on purchase — revival counted.')`) ;
    return 'ok';
  } catch { return 'insufficient_coins'; }
}

type StoreSection = 'non-game-global' | 'game';

export default function StoreScreen() {
  const [rpg, setRpg] = useState<RPGState | null>(null);
  const [section, setSection] = useState<StoreSection>('non-game-global');

  useFocusEffect(useCallback(() => { void switchBGM('store'); }, []));
  useFocusEffect(useCallback(() => { setRpg(getRPGState()); }, []));

  const coins = rpg?.coins ?? 0;
  const hp    = rpg?.hp ?? 100;

  function reload() { setRpg(getRPGState()); }

  function handleBuyRight(rank: string) {
    const info = getDungeonUnlockInfo(rank);
    if (info.rightCost === null) return;
    Alert.alert(
      `Buy ${rank}-Tier Dungeon Right?`,
      `Spend ${info.rightCost} Spendable XP for a permanent writ of passage — ${rank}-rank gates become accessible now, ahead of the natural Level ${info.naturalLevel} unlock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy', onPress: () => {
          const result = purchaseDungeonRight(rank);
          if (result === 'insufficient_xp') { Alert.alert('Not enough Spendable XP', `Need ${info.rightCost} spendable XP.`); return; }
          if (result === 'already_owned') { Alert.alert('Already owned'); return; }
          if (result === 'ok') { playSound('purchaseinstore'); reload(); Alert.alert('Right Granted', `${rank}-rank gates are now permanently accessible.`); }
        }},
      ],
    );
  }

  function handleBuyKey(rank: string) {
    const cost = getDungeonKeyPrice(rank);
    if (cost === null) return;
    Alert.alert(
      `Buy ${rank}-Tier Dungeon Key?`,
      `Spend ${cost} Spendable XP. ${dungeonKeyDescription(rank)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy', onPress: () => {
          const result = purchaseDungeonKey(rank);
          if (result === 'insufficient_xp') { Alert.alert('Not enough Spendable XP', `Need ${cost} spendable XP.`); return; }
          if (result === 'ok') { playSound('purchaseinstore'); reload(); Alert.alert('Purchased', `${rank}-Tier Dungeon Key added to your inventory.`); }
        }},
      ],
    );
  }

  function buy(cost: number, action: () => 'ok' | 'insufficient_coins' | 'hp_not_critical', label: string) {
    if (coins < cost) { Alert.alert('Not enough coins', `Need ${cost} coins.`); return; }
    Alert.alert(`Buy ${label}?`, `Spend ${cost} coins.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: () => {
        const r = action();
        if (r === 'hp_not_critical') { Alert.alert('HP not critical', 'Only usable when HP ≤ 30.'); return; }
        if (r === 'insufficient_coins') { Alert.alert('Not enough coins'); return; }
        playSound('purchaseinstore');
        reload();
        triggerCurrencyRefresh();
        Alert.alert('Purchased', `${label} applied.`);
      }},
    ]);
  }

  type Item = { key: string; icon: React.ComponentProps<typeof Feather>['name']; name: string; desc: string; cost: number; owned?: string; dimmed?: boolean; onBuy: () => void };

  const nonGameItems: Item[] = [
    {
      key: 'freeze', icon: 'shield', name: 'Streak Freeze', cost: 50,
      desc: 'Protect your streak for one missed day. Auto-activates.',
      owned: (rpg?.streak_freezes ?? 0) > 0 ? `${rpg!.streak_freezes} owned` : undefined,
      onBuy: () => buy(50, purchaseStreakFreeze, 'Streak Freeze'),
    },
    {
      key: 'mp', icon: 'zap', name: 'MP Boost', cost: 75,
      desc: 'Instantly restores +25 MP.',
      onBuy: () => buy(75, purchaseMPBoost, 'MP Boost'),
    },
    {
      key: 'cosmetic-standard', icon: 'star', name: 'Standard Cosmetic', cost: 5_000,
      desc: 'Redeemable token for a standard cosmetic — content coming soon.',
      onBuy: () => buy(5_000, () => purchaseCosmetic('standard'), 'Standard Cosmetic'),
    },
    {
      key: 'cosmetic-premium', icon: 'award', name: 'Premium Cosmetic', cost: 10_000,
      desc: 'Redeemable token for a premium cosmetic — content coming soon.',
      onBuy: () => buy(10_000, () => purchaseCosmetic('premium'), 'Premium Cosmetic'),
    },
  ];

  const gameItems: Item[] = [
    {
      key: 'hp', icon: 'heart', name: 'Critical HP Boost', cost: 100,
      desc: 'Restore +30 HP. Only usable when HP ≤ 30.',
      dimmed: hp > 30,
      onBuy: () => buy(100, purchaseHPBoost, 'Critical HP Boost'),
    },
    {
      key: 'revival', icon: 'refresh-cw', name: 'Revival Potion', cost: 150,
      desc: 'Counts as one revival — increases your Toll without requiring a revival quest.',
      onBuy: () => buy(150, purchaseRevivalPotion, 'Revival Potion'),
    },
  ];

  const items = section === 'non-game-global' ? nonGameItems : gameItems;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Store</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Section tabs */}
      <View style={s.tabs}>
        {(['non-game-global', 'game'] as StoreSection[]).map(t => (
          <Pressable key={t} onPress={() => setSection(t)} style={[s.tabBtn, section === t && s.tabBtnActive]}>
            <Text style={[s.tabTxt, section === t && s.tabTxtActive]}>{t === 'non-game-global' ? 'GLOBAL' : 'GAME'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {items.map(item => (
          <View key={item.key} style={[s.itemCard, item.dimmed && s.itemCardDim]}>
            <View style={s.itemIcon}>
              <Feather name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={s.itemInfo}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemDesc}>{item.desc}</Text>
              {item.owned && <Text style={s.ownedBadge}>{item.owned}</Text>}
            </View>
            <View style={s.itemRight}>
              <Text style={[s.itemCost, coins < item.cost && s.itemCostDim]}>{item.cost}</Text>
              <Text style={s.itemCostLabel}>coins</Text>
              <Pressable onPress={item.onBuy} style={[s.buyBtn, (coins < item.cost || item.dimmed) && s.buyBtnDisabled]}>
                <Text style={s.buyBtnText}>Buy</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {section === 'game' && (
          <View style={s.unlockSection}>
            <Text style={s.unlockTitle}>DUNGEON RIGHTS</Text>
            <Text style={s.unlockHint}>A Right is a permanent writ of passage — gates open naturally as you level up, or buy a rank's Right early, permanently, with Spendable XP.</Text>
            {DUNGEON_RANKS.map(rank => {
              const info = getDungeonUnlockInfo(rank);
              if (info.unlocked) return null;
              return (
                <View key={rank} style={s.unlockRow}>
                  <Text style={[s.unlockRank, { color: RANK_COLOR[rank] ?? colors.textMuted }]}>{rank}</Text>
                  <Text style={s.unlockStatus}>Lv {info.naturalLevel} · or {info.rightCost} spendable XP</Text>
                  <Pressable style={s.unlockBtn} onPress={() => handleBuyRight(rank)}>
                    <Text style={s.unlockBtnTxt}>Buy Right</Text>
                  </Pressable>
                </View>
              );
            })}
            {DUNGEON_RANKS.every(rank => getDungeonUnlockInfo(rank).unlocked) && (
              <Text style={s.unlockStatusOk}>All ranks unlocked.</Text>
            )}
          </View>
        )}

        {section === 'game' && (
          <View style={s.unlockSection}>
            <Text style={s.unlockTitle}>DUNGEON KEYS</Text>
            <Text style={s.unlockHint}>Consumable. Generates an extra gate of that rank with a random expiry window — drops from gate clears too.</Text>
            {DUNGEON_RANKS.filter(rank => getDungeonKeyPrice(rank) !== null).map(rank => {
              const cost = getDungeonKeyPrice(rank);
              return (
                <View key={rank} style={s.unlockRow}>
                  <Text style={[s.unlockRank, { color: RANK_COLOR[rank] ?? colors.textMuted }]}>{rank}</Text>
                  <Text style={s.unlockStatus}>{cost} spendable XP</Text>
                  <Pressable style={s.unlockBtn} onPress={() => handleBuyKey(rank)}>
                    <Text style={s.unlockBtnTxt}>Buy Key</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.moreText}>More items coming once the Game is built.</Text>
      </ScrollView>
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
  tabs:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn:      { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  tabBtnActive:{ borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:      { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  tabTxtActive:{ color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  itemCardDim:  { opacity: 0.5 },
  itemIcon:     { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(56,189,248,0.08)', alignItems: 'center', justifyContent: 'center' },
  itemInfo:     { flex: 1, gap: 3 },
  itemName:     { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  itemDesc:     { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs,   color: colors.textMuted },
  ownedBadge:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.success },
  itemRight:    { alignItems: 'center', gap: 2 },
  itemCost:     { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.success },
  itemCostDim:  { color: colors.textMuted },
  itemCostLabel:{ fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  buyBtn:       { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 4 },
  buyBtnDisabled:{ backgroundColor: colors.border },
  buyBtnText:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs, color: colors.bg },
  moreText:     { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingTop: spacing.md },

  unlockSection:  { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4 },
  unlockTitle:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  unlockHint:     { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  unlockRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  unlockRank:     { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, width: 48 },
  unlockStatus:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  unlockStatusOk: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.success, flex: 1 },
  unlockBtn:      { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  unlockBtnTxt:   { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.primary, letterSpacing: 1 },
});
