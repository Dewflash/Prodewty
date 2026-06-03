import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';

// ─── Rarity System ────────────────────────────────────────────────────────────

export type Rarity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Chromatic';

export const RARITY_COLOR: Record<Rarity, string> = {
  E:         '#64748B', // grey
  D:         '#CD7F32', // bronze
  C:         '#B0C4DE', // light steel (distinguishable from grey)
  B:         '#22C55E', // green (Brawl Stars rare)
  A:         '#3B82F6', // blue (Brawl Stars super rare)
  S:         '#A855F7', // purple (Brawl Stars epic)
  SS:        '#EF4444', // red (Brawl Stars mythic)
  SSS:       '#EAB308', // gold/yellow (Brawl Stars legendary)
  Chromatic: '#D4AF37', // deep bold gold (Legendary)
};

export const RARITY_BG: Record<Rarity, string> = {
  E:         'rgba(100,116,139,0.08)',
  D:         'rgba(205,127,50,0.08)',
  C:         'rgba(176,196,222,0.08)',
  B:         'rgba(34,197,94,0.08)',
  A:         'rgba(59,130,246,0.08)',
  S:         'rgba(168,85,247,0.08)',
  SS:        'rgba(239,68,68,0.08)',
  SSS:       'rgba(234,179,8,0.10)',
  Chromatic: 'rgba(212,175,55,0.10)',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Item = {
  name: string;
  rarity: Rarity;
  description: string;
  stats?: string; // e.g. "+2 STR"
  quantity?: number;
};

type Slot = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  equipped: Item | null;
};

// ─── Dummy data ───────────────────────────────────────────────────────────────

const EQUIPMENT_SLOTS: Slot[] = [
  { key: 'top',        label: 'Top',        icon: 'square',       equipped: { name: 'Shadow Monarch Robe', rarity: 'S',  description: 'Woven from shadow essence. +4 SPR.' } },
  { key: 'gloves',     label: 'Gloves',     icon: 'square',       equipped: null },
  { key: 'pants',      label: 'Pants',      icon: 'square',       equipped: { name: 'Obsidian Greaves',    rarity: 'E',  description: 'Basic shadow-iron pants. +1 STR.' } },
  { key: 'shoes',      label: 'Shoes',      icon: 'square',       equipped: null },
  { key: 'ring',       label: 'Ring',       icon: 'circle',       equipped: { name: 'Ring of Sovereignty', rarity: 'SSS',description: 'Worn by rulers. +10 to all stats.', stats: '+10 ALL' } },
  { key: 'goblet',     label: 'Goblet',     icon: 'square',       equipped: null },
  { key: 'coat',       label: 'Coat',       icon: 'square',       equipped: { name: "Hunter's Coat",       rarity: 'A',  description: 'Standard S-rank hunter coat. +3 AGI.' } },
  { key: 'necklace',   label: 'Necklace',   icon: 'circle',       equipped: null },
  { key: 'bracelet',   label: 'Bracelet',   icon: 'circle',       equipped: null },
  { key: 'armour_set', label: 'Armour Set', icon: 'shield',       equipped: null },
];

const WEAPON_SLOTS: Slot[] = [
  { key: 'dagger',   label: 'Dagger',   icon: 'triangle', equipped: { name: 'Shadow Dagger',     rarity: 'B',        description: 'Fast and silent. +2 AGI, +1 PER.' } },
  { key: 'sword',    label: 'Sword',    icon: 'triangle', equipped: null },
  { key: 'shield',   label: 'Shield',   icon: 'shield',   equipped: null },
  { key: 'grimoire', label: 'Grimoire', icon: 'book-open',equipped: { name: 'Tome of the Fallen', rarity: 'Chromatic',description: 'Ancient knowledge sealed within.', stats: '+8 WIS' } },
  { key: 'scepter',  label: 'Scepter',  icon: 'triangle', equipped: null },
];

type PotionSlot = {
  stat: string;
  statKey: string;
  item: Item | null;
};

const POTION_SLOTS: PotionSlot[] = [
  { stat: 'STR', statKey: 'str', item: { name: 'Strength Draft',  rarity: 'D', description: '+5 STR for 1 hour.', stats: '+5 STR', quantity: 2 } },
  { stat: 'AGI', statKey: 'agi', item: null },
  { stat: 'FOC', statKey: 'foc', item: { name: 'Focus Elixir',    rarity: 'C', description: '+5 FOC for 1 hour.', stats: '+5 FOC', quantity: 1 } },
  { stat: 'WIS', statKey: 'wis', item: null },
  { stat: 'SPR', statKey: 'spr', item: null },
  { stat: 'PER', statKey: 'per', item: null },
  { stat: 'STA', statKey: 'sta', item: { name: 'Stamina Vial',    rarity: 'B', description: '+5 STA for 1 hour.', stats: '+5 STA', quantity: 3 } },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

export function rarityLabel(r: Rarity): string {
  return r === 'Chromatic' ? 'Legendary' : r;
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const col = RARITY_COLOR[rarity];
  return (
    <View style={[rb.badge, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
      <Text style={[rb.txt, { color: col }]}>{rarityLabel(rarity)}</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  txt:   { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },
});

function EquipmentCard({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const { equipped } = slot;
  const rarity = equipped?.rarity ?? 'E';
  const borderCol = equipped ? RARITY_COLOR[rarity] : colors.border;
  return (
    <Pressable onPress={onPress} style={[ec.card, { borderColor: borderCol, backgroundColor: equipped ? RARITY_BG[rarity] : colors.card }]}>
      <View style={ec.slotRow}>
        <Feather name={slot.icon} size={11} color={colors.textMuted} />
        <Text style={ec.slotLabel}>{slot.label}</Text>
        {equipped && <RarityBadge rarity={equipped.rarity} />}
      </View>
      {equipped ? (
        <>
          <Text style={[ec.itemName, { color: RARITY_COLOR[equipped.rarity] }]} numberOfLines={1}>{equipped.name}</Text>
          {equipped.stats && <Text style={ec.stats}>{equipped.stats}</Text>}
        </>
      ) : (
        <Text style={ec.empty}>— Empty —</Text>
      )}
    </Pressable>
  );
}
const ec = StyleSheet.create({
  card:      { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2, gap: 3, width: '48.5%' },
  slotRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotLabel: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 1, flex: 1 },
  itemName:  { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs },
  stats:     { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted },
  empty:     { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },
});

function WeaponCard({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const { equipped } = slot;
  const rarity = equipped?.rarity ?? 'E';
  const borderCol = equipped ? RARITY_COLOR[rarity] : colors.border;
  const isLegendary = rarity === 'Chromatic';
  const gold = RARITY_COLOR.Chromatic;
  return (
    <Pressable onPress={onPress} style={[wc.card, { borderColor: borderCol, backgroundColor: equipped ? RARITY_BG[rarity] : colors.card }]}>
      <View style={wc.header}>
        <Text style={[wc.slotLabel, isLegendary && { color: gold, fontFamily: fonts.mono.bold }]}>{slot.label.toUpperCase()}</Text>
        {equipped && <RarityBadge rarity={equipped.rarity} />}
      </View>
      {equipped ? (
        <>
          <Text style={[wc.name, { color: isLegendary ? gold : RARITY_COLOR[equipped.rarity] }]} numberOfLines={1}>{equipped.name}</Text>
          <Text style={[wc.desc, isLegendary && { color: gold, opacity: 0.8 }]} numberOfLines={2}>{equipped.description}</Text>
          {equipped.stats && <Text style={[wc.stats, isLegendary && { color: gold }]}>{equipped.stats}</Text>}
        </>
      ) : (
        <Text style={wc.empty}>— Not equipped —</Text>
      )}
    </Pressable>
  );
}
const wc = StyleSheet.create({
  card:      { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1, flex: 1 },
  name:      { fontFamily: fonts.ui.semibold, fontSize: fontSize.base },
  desc:      { fontFamily: fonts.ui.regular,  fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  stats:     { fontFamily: fonts.mono.bold,   fontSize: fontSize.xs, color: colors.success },
  empty:     { fontFamily: fonts.ui.regular,  fontSize: fontSize.sm, color: colors.border },
});

function PotionCard({ slot, onPress }: { slot: PotionSlot; onPress: () => void }) {
  const { item } = slot;
  const rarity = item?.rarity ?? 'E';
  const borderCol = item ? RARITY_COLOR[rarity] : colors.border;
  return (
    <Pressable onPress={onPress} style={[pc.card, { borderColor: borderCol, backgroundColor: item ? RARITY_BG[rarity] : colors.card }]}>
      <Text style={[pc.stat, { color: item ? RARITY_COLOR[rarity] : colors.textMuted }]}>{slot.stat}</Text>
      {item ? (
        <>
          <RarityBadge rarity={item.rarity} />
          <Text style={pc.name} numberOfLines={1}>{item.name}</Text>
          {item.stats && <Text style={pc.stats}>{item.stats}</Text>}
          {(item.quantity ?? 0) > 1 && (
            <View style={pc.qty}><Text style={pc.qtyTxt}>×{item.quantity}</Text></View>
          )}
        </>
      ) : (
        <Text style={pc.empty}>—</Text>
      )}
    </Pressable>
  );
}
const pc = StyleSheet.create({
  card:   { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 3, alignItems: 'flex-start', position: 'relative', minHeight: 80, width: '31.5%' },
  stat:   { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 1 },
  name:   { fontFamily: fonts.ui.medium, fontSize: 10, color: colors.textPrimary },
  stats:  { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.success },
  empty:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.border, marginTop: 4 },
  qty:    { position: 'absolute', top: 4, right: 4, backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  qtyTxt: { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.textPrimary },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

type SuitSection = 'equipment' | 'weapons' | 'consumables';

export default function SuitUpScreen() {
  const [section, setSection] = useState<SuitSection>('equipment');
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>SUIT UP</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Rarity legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.legendRow}>
        {(Object.entries(RARITY_COLOR) as [Rarity, string][]).map(([r, col]) => (
          <View key={r} style={[s.legendChip, { borderColor: col, backgroundColor: RARITY_BG[r] }]}>
            <Text style={[s.legendTxt, { color: col }]}>{rarityLabel(r)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Section tabs */}
      <View style={s.tabs}>
        {(['equipment', 'weapons', 'consumables'] as SuitSection[]).map(t => (
          <Pressable key={t} onPress={() => setSection(t)} style={[s.tab, section === t && s.tabActive]}>
            <Text style={[s.tabTxt, section === t && s.tabTxtActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── EQUIPMENT ── */}
        {section === 'equipment' && (
          <>
            <Text style={s.sectionNote}>Tap a slot to equip / inspect an item from your inventory.</Text>
            <View style={s.grid2}>
              {EQUIPMENT_SLOTS.map(slot => (
                <EquipmentCard
                  key={slot.key}
                  slot={slot}
                  onPress={() => setSelected(slot.key === selected ? null : slot.key)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── WEAPONS ── */}
        {section === 'weapons' && (
          <>
            <Text style={s.sectionNote}>Equip one weapon from your game inventory.</Text>
            {WEAPON_SLOTS.map(slot => (
              <WeaponCard
                key={slot.key}
                slot={slot}
                onPress={() => setSelected(slot.key === selected ? null : slot.key)}
              />
            ))}
          </>
        )}

        {/* ── CONSUMABLES ── */}
        {section === 'consumables' && (
          <>
            <Text style={s.sectionNote}>One potion per stat. Grants temporary buff for 1 hour when used.</Text>
            <View style={s.grid3}>
              {POTION_SLOTS.map(slot => (
                <PotionCard
                  key={slot.statKey}
                  slot={slot}
                  onPress={() => setSelected(slot.statKey === selected ? null : slot.statKey)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={s.footer}>Items will populate from inventory once acquired in-game.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  back:    { padding: 4 },
  title:   { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.primary, letterSpacing: 3 },

  legendRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  legendChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  legendTxt:  { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },

  tabs:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:        { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:  { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:     { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  tabTxtActive: { color: colors.primary },

  content:     { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  grid2:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grid3:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm - 2 },
  footer:      { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border, textAlign: 'center', marginTop: spacing.sm },
});
