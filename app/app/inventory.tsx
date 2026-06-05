import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { db } from '../src/db/schema';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { playSound } from '../src/services/audio';

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
};

function ItemCard({ item }: { item: InventoryItem }) {
  return (
    <View style={s.itemCard}>
      <View style={[s.itemIcon, item.category === 'global' && s.itemIconGlobal]}>
        <Feather name={TYPE_ICON[item.item_type] ?? 'box'} size={18} color={item.category === 'global' ? colors.primary : colors.accent} />
      </View>
      <View style={s.itemInfo}>
        <View style={s.itemRow}>
          <Text style={s.itemName}>{item.item_name}</Text>
          {item.quantity > 0 && (
            <View style={s.qtyBadge}>
              <Text style={s.qtyTxt}>×{item.quantity}</Text>
            </View>
          )}
        </View>
        {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const [globalItems, setGlobalItems] = useState<InventoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const all = getInventory();
      setGlobalItems(all.filter(i => i.category === 'global'));
    }, []),
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => { playSound('globalinventoryback'); router.back(); }} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Inventory</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionSub}>Streak Freeze, treats, and other cross-system items</Text>
        <Text style={[s.sectionSub, { marginTop: 2, color: colors.border }]}>Game equipment is managed in Game → Inventory tab.</Text>

        {globalItems.length === 0 ? (
          <View style={s.empty}>
            <Feather name="archive" size={32} color={colors.border} />
            <Text style={s.emptyText}>No global items yet.</Text>
          </View>
        ) : (
          globalItems.map(i => <ItemCard key={i.id} item={i} />)
        )}

        <Text style={s.footer}>Bible component · Financial treats — coming soon</Text>
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

  empty:     { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  emptyText: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  footer:    { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border, textAlign: 'center', paddingTop: spacing.md },
});
