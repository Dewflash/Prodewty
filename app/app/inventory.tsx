import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { db } from '../src/db/schema';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { playSound } from '../src/services/audio';
import { RANK_COLOR } from '../src/components/game/DungeonCard';
import { useDungeonKey } from '../src/db/game';
import { useStreakFreeze } from '../src/db/rpg';

type InventoryItem = {
  id: number;
  item_name: string;
  item_type: string;
  quantity: number;
  description: string | null;
  category: string;
  source: string | null;
  acquired_at: string;
};

function getInventory(): InventoryItem[] {
  try {
    return db.getAllSync<InventoryItem>(
      `SELECT id, item_name, item_type, quantity, description,
              COALESCE(category,'game') as category,
              source, acquired_at
       FROM inventory ORDER BY category, acquired_at DESC`,
    );
  } catch { return []; }
}

const TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  equipment: 'shield',
  consumable: 'package',
  key: 'key',
  dungeon_right: 'unlock',
  dungeon_key: 'key',
};

// Rights/Keys are named "{RANK}-Tier Dungeon Right"/"Key" — parse the rank back out for tier coloring.
function dungeonRankFromItemName(name: string): string | null {
  return name.match(/^(.+?)-Tier Dungeon (?:Right|Key)$/)?.[1] ?? null;
}

function ItemCard({ item, onUse }: { item: InventoryItem; onUse?: (item: InventoryItem) => void }) {
  const rank = (item.item_type === 'dungeon_right' || item.item_type === 'dungeon_key')
    ? dungeonRankFromItemName(item.item_name) : null;
  const accent = rank ? (RANK_COLOR[rank] ?? colors.accent) : (item.category === 'global' ? colors.primary : colors.accent);
  const usable = !!onUse && ((item.item_type === 'dungeon_key' && !!rank) || item.item_name === 'Streak Freeze');
  return (
    <View style={[s.itemCard, rank && { borderColor: accent }]}>
      <View style={[s.itemIcon, item.category === 'global' && s.itemIconGlobal, rank && { backgroundColor: `${accent}1A` }]}>
        <Feather name={TYPE_ICON[item.item_type] ?? 'box'} size={18} color={accent} />
      </View>
      <View style={s.itemInfo}>
        <View style={s.itemRow}>
          <Text style={[s.itemName, rank && { color: accent }]}>{item.item_name}</Text>
          {item.quantity > 0 && (
            <View style={s.qtyBadge}>
              <Text style={s.qtyTxt}>×{item.quantity}</Text>
            </View>
          )}
        </View>
        {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
        {usable && (
          <Pressable onPress={() => onUse(item)} style={[s.useBtn, { borderColor: accent }]}>
            <Text style={[s.useBtnTxt, { color: accent }]}>USE</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

type InventorySection = 'global' | 'game';

export default function InventoryScreen() {
  const [section, setSection] = useState<InventorySection>('global');
  const [globalItems, setGlobalItems] = useState<InventoryItem[]>([]);
  const [gameItems, setGameItems] = useState<InventoryItem[]>([]);

  const reload = useCallback(() => {
    const all = getInventory();
    setGlobalItems(all.filter(i => i.category === 'global'));
    setGameItems(all.filter(i => i.category === 'game' && (i.item_type === 'dungeon_right' || i.item_type === 'dungeon_key')));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function handleUseKey(item: InventoryItem, rank: string) {
    const result = useDungeonKey(rank);
    if (result === 'ok') {
      playSound('consumableuse');
      reload();
      Alert.alert('Gate Generated', `A new ${rank}-rank gate has appeared under Extra Gates in the Game tab.`);
    } else if (result === 'right_required') {
      Alert.alert('Right Required', `You need the ${rank}-Tier Dungeon Right before this Key can be used.`);
    } else {
      Alert.alert('Cannot use', 'This Key could not be found in your inventory.');
    }
  }

  function handleUseStreakFreeze() {
    const result = useStreakFreeze();
    if (result === 'ok') {
      playSound('consumableuse');
      reload();
      Alert.alert('Streak Freeze Armed', 'It will automatically protect your streak the next time you miss a day.');
    } else {
      Alert.alert('Cannot use', 'No Streak Freeze in your inventory.');
    }
  }

  function handleUse(item: InventoryItem) {
    if (item.item_type === 'dungeon_key') {
      const rank = dungeonRankFromItemName(item.item_name);
      if (rank) handleUseKey(item, rank);
      return;
    }
    if (item.item_name === 'Streak Freeze') handleUseStreakFreeze();
  }

  const items = section === 'global' ? globalItems : gameItems;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => { playSound('globalinventoryback'); router.back(); }} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Inventory</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={s.tabs}>
        {(['global', 'game'] as InventorySection[]).map(t => (
          <Pressable key={t} onPress={() => setSection(t)} style={[s.tabBtn, section === t && s.tabBtnActive]}>
            <Text style={[s.tabTxt, section === t && s.tabTxtActive]}>{t === 'global' ? 'GLOBAL' : 'GAME'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {section === 'global' ? (
          <>
            <Text style={s.sectionSub}>Streak Freeze, treats, and other cross-system items</Text>
            <Text style={[s.sectionSub, { marginTop: 2, color: colors.border }]}>Game equipment is managed in Game → Inventory tab.</Text>
          </>
        ) : (
          <Text style={s.sectionSub}>Dungeon Rights and Keys — Equipment, weapons, and consumables are managed in Game → Inventory tab.</Text>
        )}

        {items.length === 0 ? (
          <View style={s.empty}>
            <Feather name="archive" size={32} color={colors.border} />
            <Text style={s.emptyText}>{section === 'global' ? 'No global items yet.' : 'No Rights or Keys yet.'}</Text>
          </View>
        ) : (
          items.map(i => <ItemCard key={i.id} item={i} onUse={handleUse} />)
        )}

        {section === 'global' && <Text style={s.footer}>Bible component · Financial treats — coming soon</Text>}
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
  back: { padding: 4 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },

  tabs:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn:      { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  tabBtnActive:{ borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:      { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  tabTxtActive:{ color: colors.primary },

  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionSub: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.xs },

  itemCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  itemIcon:       { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(168,85,247,0.08)', alignItems: 'center', justifyContent: 'center' },
  itemIconGlobal: { backgroundColor: 'rgba(56,189,248,0.08)' },
  itemInfo:  { flex: 1, gap: 3 },
  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName:  { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
  qtyBadge:  { backgroundColor: 'rgba(56,189,248,0.12)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  qtyTxt:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary },
  itemDesc:  { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  useBtn:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  useBtnTxt: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 1.5 },

  empty:     { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  footer:    { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border, textAlign: 'center', paddingTop: spacing.md },
});
