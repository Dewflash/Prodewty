import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import {
  getInventoryBySlot, getInventoryByStat, getEquippedItem, getUnequippedBySlots,
  type InventoryItem,
} from '../../db/game';
import { RARITY_COLOR, RARITY_BG, type Rarity } from '../../constants/rarity';
import { fmtBuff } from '../../utils/format';
import { Surface, muted, dim, flatSurface } from '../Surface';
import { hasCustomWallpaper } from '../../services/wallpaperCustom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvTab = 'equipment' | 'weapons' | 'supplies';

// ─── Constants ────────────────────────────────────────────────────────────────

export const EQUIP_SLOTS: { key: string; label: string }[] = [
  { key: 'top',        label: 'Top'        },
  { key: 'gloves',     label: 'Gloves'     },
  { key: 'pants',      label: 'Pants'      },
  { key: 'shoes',      label: 'Shoes'      },
  { key: 'ring',       label: 'Ring'       },
  { key: 'goblet',     label: 'Goblet'     },
  { key: 'coat',       label: 'Coat'       },
  { key: 'necklace',   label: 'Necklace'   },
  { key: 'bracelet',   label: 'Bracelet'   },
  { key: 'armour_set', label: 'Armour Set' },
];

export const WEAPON_SLOTS: { key: string; label: string }[] = [
  { key: 'dagger',   label: 'Dagger'   },
  { key: 'sword',    label: 'Sword'    },
  { key: 'shield',   label: 'Shield'   },
  { key: 'grimoire', label: 'Grimoire' },
  { key: 'scepter',  label: 'Scepter'  },
];

export const STAT_ABBRS      = ['STR', 'AGI', 'FOC', 'WIS', 'SPR', 'PER', 'STA'];
export const STAT_KEYS_SHORT = ['str', 'agi', 'foc', 'wis', 'spr', 'per', 'sta'];

const RARITY_RANK: Record<string, number> = {
  Legendary: 0, SSS: 1, SS: 2, S: 3, A: 4, B: 5, C: 6, D: 7, E: 8,
};

// ─── SlotCard ─────────────────────────────────────────────────────────────────

export function SlotCard({ label, slotKey, onPress, refreshKey }: {
  label: string; slotKey: string; onPress: () => void; refreshKey: number;
}) {
  const [equipped, setEquipped] = React.useState<InventoryItem | null>(null);
  React.useEffect(() => {
    try { setEquipped(getEquippedItem(slotKey)); } catch {}
  }, [slotKey, refreshKey]);

  const borderCol = equipped ? (RARITY_COLOR[equipped.rarity as Rarity] ?? colors.border) : colors.border;
  const buffStr   = equipped?.stat_buff ? fmtBuff(equipped.stat_buff) : null;
  const txtStyle  = [{ color: borderCol }];
  const wallpaperActive = hasCustomWallpaper();
  return (
    <Pressable onPress={onPress} style={[inv.slot, { borderColor: borderCol }, wallpaperActive && flatSurface()]}>
      <View style={inv.slotHeader}>
        <Text style={[inv.slotLabel, { color: muted(wallpaperActive) }]}>{label.toUpperCase()}</Text>
        {equipped && <Text style={[inv.slotRarity, ...txtStyle]}>{equipped.rarity}</Text>}
      </View>
      {equipped ? (
        <>
          <Text style={[inv.slotItem, ...txtStyle]} numberOfLines={1}>{equipped.item_name}</Text>
          {equipped.description && <Text style={[inv.slotDesc, { color: muted(wallpaperActive) }]} numberOfLines={3}>{equipped.description}</Text>}
          {buffStr && (
            <View style={inv.slotFooter}>
              <View style={{ flex: 1 }} />
              <Text style={[inv.slotBuff, ...txtStyle]}>{buffStr}</Text>
            </View>
          )}
        </>
      ) : (
        <Text style={[inv.slotEmpty, { color: dim(wallpaperActive) }]}>— empty —</Text>
      )}
    </Pressable>
  );
}

// ─── StatSlotCard (Catalysts — same layout as SlotCard) ───────────────────────

export function StatSlotCard({ abbr, statKey, onPress, refreshKey }: {
  abbr: string; statKey: string; onPress: () => void; refreshKey: number;
}) {
  const [item, setItem] = React.useState<InventoryItem | null>(null);
  React.useEffect(() => {
    try { setItem(getEquippedItem(`catalyst_${statKey}`) ?? null); } catch {}
  }, [statKey, refreshKey]);

  const borderCol = item ? (RARITY_COLOR[item.rarity as Rarity] ?? colors.border) : colors.border;
  const buffStr   = item?.stat_buff ? fmtBuff(item.stat_buff) : null;
  const txtStyle  = [{ color: borderCol }];
  const wallpaperActive = hasCustomWallpaper();
  return (
    <Pressable onPress={onPress} style={[inv.slot, { borderColor: borderCol }, wallpaperActive && flatSurface()]}>
      <View style={inv.slotHeader}>
        <Text style={[inv.slotLabel, { color: muted(wallpaperActive) }]}>{abbr}</Text>
        {item && <Text style={[inv.slotRarity, ...txtStyle]}>{item.rarity}</Text>}
      </View>
      {item ? (
        <>
          <Text style={[inv.slotItem, ...txtStyle]} numberOfLines={1}>{item.item_name}</Text>
          {item.description && <Text style={[inv.slotDesc, { color: muted(wallpaperActive) }]} numberOfLines={3}>{item.description}</Text>}
          {buffStr && (
            <View style={inv.slotFooter}>
              <View style={{ flex: 1 }} />
              <Text style={[inv.slotBuff, ...txtStyle]}>{buffStr}</Text>
            </View>
          )}
        </>
      ) : (
        <Text style={[inv.slotEmpty, { color: dim(wallpaperActive) }]}>— empty —</Text>
      )}
    </Pressable>
  );
}

// ─── ConsumableList ───────────────────────────────────────────────────────────

export function ConsumableList({ onUse }: { onUse: (item: InventoryItem) => void }) {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const wallpaperActive = hasCustomWallpaper();

  function loadItems() {
    try {
      const all: InventoryItem[] = [];
      STAT_KEYS_SHORT.forEach(sk => all.push(...getInventoryByStat(sk, 'consumable')));
      all.sort((a, b) => (RARITY_RANK[a.rarity] ?? 9) - (RARITY_RANK[b.rarity] ?? 9));
      setItems(all);
    } catch {}
  }

  React.useEffect(() => { loadItems(); }, []);

  if (items.length === 0) return <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>No consumables acquired yet.</Text></Surface>;

  return (
    <View style={inv.list}>
      {items.map(item => {
        const rarity  = (item.rarity as Rarity) ?? 'E';
        const col     = RARITY_COLOR[rarity];
        const buffStr = item.stat_buff ? fmtBuff(item.stat_buff) : null;
        return (
          <View key={item.id} style={[inv.consumableRow, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
            <View style={[inv.rarityBox, { borderColor: col }]}>
              <Text style={[inv.rarityBoxTxt, { color: col }]}>
                {rarity === 'Legendary' ? '★' : rarity}
              </Text>
            </View>
            <Text style={[inv.consumableName, { color: col }]}>{item.item_name}</Text>
            {buffStr && <Text style={[inv.consumableBuff, { color: col }]}>{buffStr}</Text>}
            {(item.quantity ?? 1) > 1 && <Text style={[inv.consumableQty, { color: col }]}>×{item.quantity}</Text>}
            <Pressable onPress={() => { onUse(item); loadItems(); }}
              style={[inv.useBtn, { borderColor: colors.success }]}>
              <Text style={inv.useTxt}>USE</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ─── UnequippedList ───────────────────────────────────────────────────────────
// Items gained but not currently worn, for a given slot group (equipment/weapon
// grids). Lets users see drops the moment they're earned. Tapping one opens its
// slot's browser so it can be equipped.

export function UnequippedList({ slots, onOpenBrowser, refreshKey }: {
  slots: { key: string; label: string }[];
  onOpenBrowser: (slot: string, title: string, items: InventoryItem[]) => void;
  refreshKey: number;
}) {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const wallpaperActive = hasCustomWallpaper();
  const labelOf = React.useCallback(
    (slotKey: string | null) => slots.find(s => s.key === slotKey)?.label ?? slotKey ?? '',
    [slots],
  );

  React.useEffect(() => {
    try { setItems(getUnequippedBySlots(slots.map(s => s.key))); } catch {}
  }, [refreshKey]);

  if (items.length === 0) {
    return <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>No unequipped items yet — clear dungeons to earn drops.</Text></Surface>;
  }

  return (
    <View style={inv.list}>
      {items.map(item => {
        const rarity  = (item.rarity as Rarity) ?? 'E';
        const col     = RARITY_COLOR[rarity];
        const buffStr = item.stat_buff ? fmtBuff(item.stat_buff) : null;
        return (
          <Pressable key={item.id}
            onPress={() => item.slot_type && onOpenBrowser(item.slot_type, labelOf(item.slot_type), getInventoryBySlot(item.slot_type))}
            style={[inv.consumableRow, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
            <View style={[inv.rarityBox, { borderColor: col }]}>
              <Text style={[inv.rarityBoxTxt, { color: col }]}>
                {rarity === 'Legendary' ? '★' : rarity}
              </Text>
            </View>
            <Text style={[inv.consumableName, { color: col }]} numberOfLines={1}>{item.item_name}</Text>
            <Text style={inv.unequippedSlot}>{labelOf(item.slot_type)}</Text>
            {buffStr && <Text style={[inv.consumableBuff, { color: col }]}>{buffStr}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── UnusedCatalystTile (8th Supplies tile — aggregate "unused catalysts") ────

export function UnusedCatalystTile({ onPress, refreshKey }: { onPress: () => void; refreshKey: number }) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    try { setCount(getUnequippedBySlots(STAT_KEYS_SHORT.map(sk => `catalyst_${sk}`)).length); } catch {}
  }, [refreshKey]);

  const wallpaperActive = hasCustomWallpaper();
  return (
    <Pressable onPress={onPress} style={[inv.slot, { borderColor: colors.border }, wallpaperActive && flatSurface()]}>
      <View style={inv.slotHeader}>
        <Text style={[inv.slotLabel, { color: muted(wallpaperActive) }]}>UNUSED</Text>
        {count > 0 && <Text style={[inv.slotRarity, { color: muted(wallpaperActive) }]}>{count}</Text>}
      </View>
      {count > 0 ? (
        <Text style={inv.slotItem}>{count} catalyst{count === 1 ? '' : 's'} not equipped</Text>
      ) : (
        <Text style={[inv.slotEmpty, { color: dim(wallpaperActive) }]}>— none —</Text>
      )}
    </Pressable>
  );
}

// ─── InventorySection ─────────────────────────────────────────────────────────

export function InventorySection({ invTab, setInvTab, onOpenBrowser, onOpenAggregateBrowser, onUseConsumable, refreshKey }: {
  invTab: InvTab;
  setInvTab: (t: InvTab) => void;
  onOpenBrowser: (slot: string, title: string, items: InventoryItem[]) => void;
  onOpenAggregateBrowser: (slots: string[], title: string) => void;
  onUseConsumable: (item: InventoryItem) => void;
  refreshKey: number;
}) {
  const wallpaperActive = hasCustomWallpaper();
  return (
    <View style={inv.wrap}>
      <View style={inv.tabs}>
        {(['equipment', 'weapons', 'supplies'] as InvTab[]).map(t => (
          <Pressable key={t} onPress={() => setInvTab(t)} style={[inv.tab, invTab === t && inv.tabActive]}>
            <Text style={[inv.tabTxt, invTab === t && inv.tabTxtActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {invTab === 'equipment' && (
        <>
          <View style={inv.grid2}>
            {EQUIP_SLOTS.map(slot => (
              <SlotCard key={slot.key} label={slot.label} slotKey={slot.key} refreshKey={refreshKey}
                onPress={() => onOpenBrowser(slot.key, slot.label, getInventoryBySlot(slot.key))} />
            ))}
          </View>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesSection, { marginTop: spacing.md, color: muted(wallpaperActive) }]}>UNEQUIPPED</Text></Surface>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>Gear you've earned but aren't wearing. Tap one to equip it.</Text></Surface>
          <UnequippedList slots={EQUIP_SLOTS} onOpenBrowser={onOpenBrowser} refreshKey={refreshKey} />
        </>
      )}

      {invTab === 'weapons' && (
        <>
          <View style={inv.grid2}>
            {WEAPON_SLOTS.map(slot => (
              <SlotCard key={slot.key} label={slot.label} slotKey={slot.key} refreshKey={refreshKey}
                onPress={() => onOpenBrowser(slot.key, slot.label, getInventoryBySlot(slot.key))} />
            ))}
          </View>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesSection, { marginTop: spacing.md, color: muted(wallpaperActive) }]}>UNEQUIPPED</Text></Surface>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>Weapons you've earned but aren't wielding. Tap one to equip it.</Text></Surface>
          <UnequippedList slots={WEAPON_SLOTS} onOpenBrowser={onOpenBrowser} refreshKey={refreshKey} />
        </>
      )}

      {invTab === 'supplies' && (
        <View style={inv.suppliesWrap}>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesSection, { color: muted(wallpaperActive) }]}>CATALYSTS</Text></Surface>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>Permanent stat boosters. Tap to view acquired catalysts.</Text></Surface>
          <View style={inv.grid2}>
            {STAT_ABBRS.map((abbr, i) => (
              <StatSlotCard key={abbr} abbr={abbr} statKey={STAT_KEYS_SHORT[i]} refreshKey={refreshKey}
                onPress={() => onOpenBrowser(`catalyst_${STAT_KEYS_SHORT[i]}`, `${abbr} Catalyst`, getInventoryByStat(STAT_KEYS_SHORT[i], 'catalyst'))} />
            ))}
            <UnusedCatalystTile refreshKey={refreshKey}
              onPress={() => onOpenAggregateBrowser(STAT_KEYS_SHORT.map(sk => `catalyst_${sk}`), 'Unused Catalysts')} />
          </View>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesSection, { marginTop: spacing.md, color: muted(wallpaperActive) }]}>CONSUMABLES</Text></Surface>
          <Surface pad={spacing.sm}><Text style={[inv.suppliesHint, { color: dim(wallpaperActive) }]}>Temporary stat potions. Sorted by rarity. Effect lasts 1 hour.</Text></Surface>
          <ConsumableList onUse={onUseConsumable} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export const inv = StyleSheet.create({
  wrap:         { gap: spacing.md },
  tabs:         { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tab:          { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabActive:    { backgroundColor: 'rgba(56,189,248,0.12)' },
  tabTxt:       { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  tabTxtActive: { color: colors.primary },
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list:         { gap: spacing.sm },

  slot:       { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 3, width: '48.5%', minHeight: 90 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  slotLabel:  { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 1 },
  slotRarity: { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },
  slotItem:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.xs },
  slotDesc:   { fontFamily: fonts.ui.regular, fontSize: 9, color: colors.textMuted, lineHeight: 13, marginTop: 1 },
  slotFooter: { flexDirection: 'row', marginTop: 4 },
  slotBuff:   { fontFamily: fonts.mono.bold, fontSize: 9 },
  slotEmpty:  { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },

  suppliesWrap:    { gap: spacing.sm },
  suppliesSection: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  suppliesHint:    { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },

  consumableRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm + 2 },
  rarityBox:      { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, alignItems: 'center', justifyContent: 'center' },
  rarityBoxTxt:   { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 0.5 },
  consumableName: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, flex: 1 },
  consumableBuff: { fontFamily: fonts.mono.regular, fontSize: 9, opacity: 0.8 },
  consumableQty:  { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  unequippedSlot: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  useBtn:         { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  useTxt:         { fontFamily: fonts.mono.bold, fontSize: 9, color: colors.success, letterSpacing: 1 },
});
