import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { getRPGState, type RPGState } from '../../src/db/rpg';
import {
  getComputedStats, getFatigue, getPendingQuests, getAcceptedQuests, getSkippedQuests,
  getCompletedQuests, reinstateQuest, generateQuests,
  getDungeons, isDungeonOnCooldown, getDungeonCooldownRemaining,
  startDungeon, getActiveDungeonRun, submitDungeonClear, failDungeon, abandonDungeon,
  acceptQuest, completeQuest, deleteQuest, skipQuest,
  allocateStat, getQuestCompletedCount, getDeathCount, getAbandonedCount,
  getInventoryBySlot, getInventoryByStat, getDropRates,
  type GameStats, type Dungeon, type Quest, type DungeonClearResult, type InventoryItem,
} from '../../src/db/game';
import { RARITY_COLOR, RARITY_BG, rarityLabel, type Rarity } from '../suitup';
import { triggerDeathCheck } from '../../src/db/deathCheckSignal';
import { triggerCurrencyRefresh } from '../../src/db/currencySignal';

// ─── Types ────────────────────────────────────────────────────────────────────

type GameSection  = 'stats' | 'inventory' | 'quests' | 'dungeons';
type InvTab       = 'equipment' | 'weapons' | 'supplies';
type SuppliesTab  = 'consumables' | 'catalysts';
type DungeonPhase = 'entry' | 'active' | 'result' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const STAT_KEYS: { key: keyof GameStats; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'agi', label: 'Agility',      abbr: 'AGI' },
  { key: 'foc', label: 'Focus',        abbr: 'FOC' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'spr', label: 'Spirituality', abbr: 'SPR' },
  { key: 'per', label: 'Perception',   abbr: 'PER' },
  { key: 'sta', label: 'Stamina',      abbr: 'STA' },
];

const RANK_COLOR: Record<string, string> = {
  E: '#64748B', D: '#34D399', C: '#38BDF8',
  B: '#A855F7', A: '#F97316', S: '#FBBF24',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Sub-components: Stats section ───────────────────────────────────────────

// Expanded stat rows show full label on tap
const STAT_KEYS_MAP: Record<string, string> = {
  STR: 'Strength', AGI: 'Agility', FOC: 'Focus',
  WIS: 'Wisdom',   SPR: 'Spirituality', PER: 'Perception', STA: 'Stamina',
};

function SystemBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  return (
    <View style={sb.wrap}>
      <View style={sb.header}>
        <Text style={sb.label}>{label}</Text>
        <Text style={[sb.val, { color }]}>{value} / {max}</Text>
      </View>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:   { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  val:    { fontFamily: fonts.mono.bold,    fontSize: fontSize.xs },
  track:  { height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: radius.pill },
});

function StatRow({ stat, value, apPart, autoPart, ap, onAllocate, expanded, onToggle }: {
  stat: typeof STAT_KEYS[number]; value: number; apPart: number; autoPart: number;
  ap: number; onAllocate: (key: string) => void;
  expanded: boolean; onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={st.row}>
      <Text style={[st.abbr, expanded && st.abbrExpanded]}>
        {expanded ? STAT_KEYS_MAP[stat.abbr] ?? stat.abbr : stat.abbr}
      </Text>
      {!expanded && <Text style={st.val}>{value}</Text>}
      {!expanded && <Text style={st.breakdown}>({apPart} AP + {autoPart} auto)</Text>}
      {expanded && (
        <Text style={st.breakdownExpanded}>{value} ({apPart}+{autoPart})</Text>
      )}
      {ap > 0 && (
        <Pressable onPress={() => onAllocate(stat.key as string)} style={st.plus}>
          <Text style={st.plusTxt}>+</Text>
        </Pressable>
      )}
    </Pressable>
  );
}
const st = StyleSheet.create({
  row:              { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  abbr:             { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.primary, width: 40 },
  abbrExpanded:     { color: colors.textPrimary, width: 88, fontSize: fontSize.xs },
  val:              { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.textPrimary, width: 36 },
  breakdown:        { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  breakdownExpanded:{ flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  plus:      { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plusTxt:   { fontFamily: fonts.mono.bold,    fontSize: fontSize.base, color: colors.primary },
});

// ─── Sub-components: Dungeon card ─────────────────────────────────────────────

function DungeonCard({ dungeon, isActiveRun, onTap, onRarityInfo }: {
  dungeon: Dungeon; isActiveRun: boolean;
  onTap: () => void; onRarityInfo: () => void;
}) {
  const onCooldown       = !isActiveRun && isDungeonOnCooldown(dungeon.id, dungeon.cooldown_hours);
  const cooldownRemaining = onCooldown ? getDungeonCooldownRemaining(dungeon.id, dungeon.cooldown_hours) : null;
  const rankColor         = RANK_COLOR[dungeon.rank] ?? colors.textMuted;

  const statusColor = isActiveRun ? colors.primary : onCooldown ? colors.textMuted : colors.success;
  const statusText  = isActiveRun ? 'IN PROGRESS'
    : onCooldown ? `Replayable in: ${cooldownRemaining ?? '—'}`
    : 'Available';

  return (
    <Pressable
      onPress={!onCooldown ? onTap : undefined}
      style={[dc.card, isActiveRun && { borderColor: colors.primary }]}
    >
      <Text style={[dc.rankLabel, { color: rankColor }]}>{dungeon.rank}-RANK GATE</Text>
      <Text style={dc.name}>{dungeon.name}</Text>
      <Text style={dc.statLine}>
        {dungeon.primary_stat.toUpperCase()} + {dungeon.secondary_stat?.toUpperCase() ?? '—'} · {dungeon.duration_mins} min
      </Text>
      {dungeon.flavor_text ? (
        <Text style={dc.flavor} numberOfLines={2}>{dungeon.flavor_text}</Text>
      ) : null}
      <View style={dc.footer}>
        <View style={[dc.statusChip, { borderColor: statusColor }]}>
          <Text style={[dc.statusTxt, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Pressable onPress={onRarityInfo} style={dc.dropBtn}>
          <Text style={dc.dropTxt}>Drop rates</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
const dc = StyleSheet.create({
  card:       { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: 6, borderWidth: 1, borderColor: colors.border },
  rankLabel:  { fontFamily: fonts.mono.regular, fontSize: 10, letterSpacing: 2 },
  name:       { fontFamily: fonts.ui.semibold,  fontSize: fontSize.md,  color: colors.textPrimary },
  statLine:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs,  color: colors.textMuted },
  flavor:     { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm,  color: colors.textMuted, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot:  { width: 5, height: 5, borderRadius: 3 },
  statusTxt:  { fontFamily: fonts.mono.regular, fontSize: 10, letterSpacing: 1 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropBtn:    { paddingHorizontal: 6, paddingVertical: 3 },
  dropTxt:    { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 1 },
});

// ─── Sub-components: Quest card ───────────────────────────────────────────────

function PendingQuestCard({ quest, onAccept, onHide }: {
  quest: Quest; onAccept: () => void; onHide: () => void;
}) {
  return (
    <View style={qc.card}>
      <View style={qc.header}>
        <View style={qc.tag}><Text style={qc.tagTxt}>DAILY QUEST</Text></View>
        <Pressable onPress={onHide}><Feather name="x" size={14} color={colors.textMuted} /></Pressable>
      </View>
      <Text style={qc.title}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
      <View style={qc.footer}>
        <Text style={qc.reward}>+{quest.coin_reward} coins · +30 XP</Text>
        <Pressable onPress={onAccept} style={qc.acceptBtn}>
          <Text style={qc.acceptTxt}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AcceptedQuestCard({ quest, onComplete, onHide }: {
  quest: Quest; onComplete: () => void; onHide: () => void;
}) {
  return (
    <View style={[qc.card, qc.cardActive]}>
      <View style={qc.header}>
        <View style={[qc.tag, { borderColor: colors.success }]}>
          <View style={[dc.statusDot, { backgroundColor: colors.success }]} />
          <Text style={[qc.tagTxt, { color: colors.success }]}>ACTIVE</Text>
        </View>
        <Pressable onPress={onHide}><Feather name="x" size={14} color={colors.textMuted} /></Pressable>
      </View>
      <Text style={qc.title}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
      <View style={qc.footer}>
        <Text style={qc.reward}>+{quest.coin_reward} coins · +30 XP</Text>
        <Pressable onPress={onComplete} style={qc.completeBtn}>
          <Text style={qc.completeTxt}>Complete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HiddenQuestCard({ quest, onReinstate }: { quest: Quest; onReinstate: () => void }) {
  return (
    <View style={qc.hiddenCard}>
      <View style={qc.hiddenRow}>
        <View style={{ flex: 1 }}>
          <Text style={qc.hiddenTitle}>{quest.title}</Text>
          <Text style={qc.hiddenHint}>Hidden today · reappears tomorrow</Text>
        </View>
        <Pressable onPress={onReinstate} style={qc.reinstateBtn}>
          <Text style={qc.reinstateTxt}>Reinstate</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompletedQuestCard({ quest }: { quest: Quest }) {
  return (
    <View style={qc.completedCard}>
      <View style={qc.header}>
        <View style={[qc.tag, { borderColor: colors.textMuted }]}>
          <Text style={[qc.tagTxt, { color: colors.textMuted }]}>COMPLETED</Text>
        </View>
      </View>
      <Text style={qc.completedTitle}>{quest.title}</Text>
      {quest.description ? <Text style={qc.desc}>{quest.description}</Text> : null}
    </View>
  );
}
const qc = StyleSheet.create({
  card:        { backgroundColor: 'rgba(56,189,248,0.04)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', gap: spacing.sm },
  cardActive:  { borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.04)' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  tagTxt:      { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.primary, letterSpacing: 1 },
  title:       { fontFamily: fonts.ui.semibold,  fontSize: fontSize.base, color: colors.textPrimary },
  desc:        { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm,   color: colors.textMuted },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reward:      { fontFamily: fonts.mono.bold,    fontSize: fontSize.xs,   color: colors.success },
  actions:     { flexDirection: 'row', gap: spacing.sm },
  skipBtn:     { paddingHorizontal: spacing.md, paddingVertical: 5 },
  skipTxt:     { fontFamily: fonts.ui.medium,    fontSize: fontSize.xs,   color: colors.textMuted },
  acceptBtn:   { backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 5 },
  acceptTxt:   { fontFamily: fonts.ui.semibold,  fontSize: fontSize.xs,   color: colors.primary },
  completeBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 5 },
  completeTxt: { fontFamily: fonts.ui.semibold,  fontSize: fontSize.xs,   color: colors.bg },
  hiddenCard:  { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm+4, borderWidth: 1, borderColor: colors.border },
  hiddenRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hiddenTitle: { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm,   color: colors.textMuted, opacity: 0.55 },
  hiddenHint:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs,   color: colors.border, opacity: 0.55 },
  reinstateBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  reinstateTxt: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, color: colors.primary },
  completedCard: { backgroundColor: 'rgba(52,211,153,0.03)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(52,211,153,0.12)', gap: 4 },
  completedTitle: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
});

// ─── Inventory Section ────────────────────────────────────────────────────────

const EQUIP_SLOTS: { key: string; label: string }[] = [
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

const WEAPON_SLOTS: { key: string; label: string }[] = [
  { key: 'dagger',   label: 'Dagger'   },
  { key: 'sword',    label: 'Sword'    },
  { key: 'shield',   label: 'Shield'   },
  { key: 'grimoire', label: 'Grimoire' },
  { key: 'scepter',  label: 'Scepter'  },
];

const STAT_ABBRS = ['STR','AGI','FOC','WIS','SPR','PER','STA'];
const STAT_KEYS_SHORT = ['str','agi','foc','wis','spr','per','sta'];

function SlotCard({ label, slotKey, onPress }: {
  label: string; slotKey: string; onPress: () => void;
}) {
  const [topItem, setTopItem] = React.useState<InventoryItem | null>(null);
  React.useEffect(() => {
    try { setTopItem(getInventoryBySlot(slotKey)[0] ?? null); } catch {}
  }, [slotKey]);
  const rarityCol = topItem ? (RARITY_COLOR[topItem.rarity as Rarity] ?? colors.border) : colors.border;
  return (
    <Pressable onPress={onPress} style={[inv.slot, { borderColor: rarityCol }]}>
      <Text style={inv.slotLabel}>{label.toUpperCase()}</Text>
      {topItem ? (
        <Text style={[inv.slotItem, { color: rarityCol }]} numberOfLines={2}>{topItem.item_name}</Text>
      ) : (
        <Text style={inv.slotEmpty}>— empty —</Text>
      )}
    </Pressable>
  );
}

function StatSlotCard({ abbr, statKey, category, onPress }: {
  abbr: string; statKey: string; category: 'consumable' | 'catalyst'; onPress: () => void;
}) {
  const [topItem, setTopItem] = React.useState<InventoryItem | null>(null);
  React.useEffect(() => {
    try { setTopItem(getInventoryByStat(statKey, category)[0] ?? null); } catch {}
  }, [statKey, category]);
  const rarityCol = topItem ? (RARITY_COLOR[topItem.rarity as Rarity] ?? colors.border) : colors.border;
  return (
    <Pressable onPress={onPress} style={[inv.statSlot, { borderColor: rarityCol }]}>
      <Text style={[inv.statAbbr, { color: rarityCol }]}>{abbr}</Text>
      {topItem ? (
        <Text style={inv.statCount}>×{topItem.quantity ?? 1}</Text>
      ) : (
        <Text style={inv.statEmpty}>—</Text>
      )}
    </Pressable>
  );
}

function ConsumableList({ onOpenBrowser }: {
  onOpenBrowser: (slot: string, title: string, items: InventoryItem[]) => void;
}) {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  React.useEffect(() => {
    try {
      const allConsumables: InventoryItem[] = [];
      STAT_KEYS_SHORT.forEach(sk => {
        const found = getInventoryByStat(sk, 'consumable');
        allConsumables.push(...found);
      });
      const RARITY_RANK: Record<string, number> = { Chromatic:0,SSS:1,SS:2,S:3,A:4,B:5,C:6,D:7,E:8 };
      allConsumables.sort((a, b) => (RARITY_RANK[a.rarity]??9) - (RARITY_RANK[b.rarity]??9));
      setItems(allConsumables);
    } catch {}
  }, []);

  if (items.length === 0) {
    return <Text style={inv.suppliesHint}>No consumables acquired yet.</Text>;
  }

  return (
    <View style={inv.list}>
      {items.map(item => {
        const rarity = (item.rarity as Rarity) ?? 'E';
        const col = RARITY_COLOR[rarity];
        return (
          <Pressable key={item.id} onPress={() => onOpenBrowser(`consumable_${item.slot_type?.split('_')[1] ?? ''}`, item.item_name, [item])}
            style={[inv.consumableRow, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
            <View style={[inv.consumableRarityDot, { backgroundColor: col }]} />
            <Text style={[inv.consumableName, { color: col }]}>{item.item_name}</Text>
            {(item.quantity ?? 1) > 1 && <Text style={[inv.consumableQty, { color: col }]}>×{item.quantity}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function InventorySection({ invTab, setInvTab, suppliesTab, setSuppliesTab, onOpenBrowser, onRarityInfo }: {
  invTab: InvTab; setInvTab: (t: InvTab) => void;
  suppliesTab: SuppliesTab; setSuppliesTab: (t: SuppliesTab) => void;
  onOpenBrowser: (slot: string, title: string, items: InventoryItem[]) => void;
  onRarityInfo: (rank: string) => void;
}) {
  return (
    <View style={inv.wrap}>
      {/* Sub-tabs */}
      <View style={inv.tabs}>
        {(['equipment', 'weapons', 'supplies'] as InvTab[]).map(t => (
          <Pressable key={t} onPress={() => setInvTab(t)} style={[inv.tab, invTab === t && inv.tabActive]}>
            <Text style={[inv.tabTxt, invTab === t && inv.tabTxtActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* Equipment */}
      {invTab === 'equipment' && (
        <View style={inv.grid2}>
          {EQUIP_SLOTS.map(slot => (
            <SlotCard
              key={slot.key}
              label={slot.label}
              slotKey={slot.key}
              onPress={() => onOpenBrowser(slot.key, slot.label, getInventoryBySlot(slot.key))}
            />
          ))}
        </View>
      )}

      {/* Weapons */}
      {invTab === 'weapons' && (
        <View style={inv.list}>
          {WEAPON_SLOTS.map(slot => (
            <SlotCard
              key={slot.key}
              label={slot.label}
              slotKey={slot.key}
              onPress={() => onOpenBrowser(slot.key, slot.label, getInventoryBySlot(slot.key))}
            />
          ))}
        </View>
      )}

      {/* Supplies */}
      {invTab === 'supplies' && (
        <View style={inv.suppliesWrap}>
          {/* Catalysts — 7 bigger stat boxes */}
          <Text style={inv.suppliesSection}>CATALYSTS</Text>
          <Text style={inv.suppliesHint}>Permanent stat boosters. Tap a stat box to view acquired catalysts.</Text>
          <View style={[inv.catalystGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }]}>
            {STAT_ABBRS.map((abbr, i) => (
              <StatSlotCard
                key={abbr} abbr={abbr} statKey={STAT_KEYS_SHORT[i]} category="catalyst"
                onPress={() => onOpenBrowser(`catalyst_${STAT_KEYS_SHORT[i]}`, `${abbr} Catalyst`, getInventoryByStat(STAT_KEYS_SHORT[i], 'catalyst'))}
              />
            ))}
          </View>

          {/* Consumables — flat list sorted by rarity */}
          <Text style={[inv.suppliesSection, { marginTop: spacing.md }]}>CONSUMABLES</Text>
          <Text style={inv.suppliesHint}>Temporary stat potions (+5 stat for 1 hour). Sorted by rarity.</Text>
          <ConsumableList onOpenBrowser={onOpenBrowser} />
        </View>
      )}
    </View>
  );
}

const inv = StyleSheet.create({
  wrap:           { gap: spacing.md },
  tabs:           { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tab:            { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabActive:      { backgroundColor: 'rgba(56,189,248,0.12)' },
  tabTxt:         { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  tabTxtActive:   { color: colors.primary },
  grid2:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list:           { gap: spacing.sm },
  slot:           { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2, gap: 4, width: '48.5%' },
  slotLabel:      { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 1 },
  slotItem:       { fontFamily: fonts.ui.medium, fontSize: fontSize.xs },
  slotEmpty:      { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },
  suppliesWrap:   { gap: spacing.sm },
  suppliesSection:{ fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  suppliesHint:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },
  catalystGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statSlot:       { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, width: '13%', minWidth: 46, flex: 1 },
  consumableRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm + 2 },
  consumableRarityDot: { width: 8, height: 8, borderRadius: 4 },
  consumableName: { fontFamily: fonts.ui.medium, fontSize: fontSize.xs, flex: 1 },
  consumableQty:  { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  statAbbr:       { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  statCount:      { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textPrimary },
  statEmpty:      { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const [section, setSection] = useState<GameSection>('stats');
  const [rpg,     setRpg]     = useState<RPGState | null>(null);
  const [stats,   setStats]   = useState<GameStats | null>(null);
  const [fatigue, setFatigue] = useState(false);
  const [dungeons, setDungeons]     = useState<Dungeon[]>([]);
  const [pending,  setPending]      = useState<Quest[]>([]);
  const [accepted, setAccepted]     = useState<Quest[]>([]);
  const [deaths,    setDeaths]      = useState(0);
  const [cleared,   setCleared]     = useState(0);
  const [abandoned, setAbandoned]   = useState(0);
  const [skipped,   setSkipped]     = useState<Quest[]>([]);
  const [completed, setCompleted]   = useState<Quest[]>([]);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // Dungeon run state
  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon | null>(null);
  const [dungeonPhase,    setDungeonPhase]    = useState<DungeonPhase>(null);
  const [activeRunId,     setActiveRunId]     = useState<number | null>(null);
  const [timerSeconds,    setTimerSeconds]    = useState(0);
  const [clearResult,     setClearResult]     = useState<DungeonClearResult | null>(null);

  // Quest completion sheet
  const [completingQuest, setCompletingQuest] = useState<Quest | null>(null);
  const [questNotes,      setQuestNotes]      = useState('');
  const [questPreview,    setQuestPreview]    = useState(false);

  // Inventory section state
  const [invTab,          setInvTab]          = useState<InvTab>('equipment');
  const [suppliesTab,     setSuppliesTab]     = useState<SuppliesTab>('consumables');
  const [itemBrowserSlot, setItemBrowserSlot] = useState<string | null>(null);
  const [itemBrowserTitle,setItemBrowserTitle]= useState('');
  const [browserItems,    setBrowserItems]    = useState<InventoryItem[]>([]);
  const [rarityInfoRank,  setRarityInfoRank]  = useState<string | null>(null);

  function reload() {
    const dList = getDungeons();
    setRpg(getRPGState());
    setStats(getComputedStats());
    setFatigue(getFatigue());
    setDungeons(dList);
    generateQuests();
    setPending(getPendingQuests());
    setAccepted(getAcceptedQuests());
    setDeaths(getDeathCount());
    setCleared(getQuestCompletedCount());
    setAbandoned(getAbandonedCount());
    setSkipped(getSkippedQuests());
    setCompleted(getCompletedQuests());

    // Resume active dungeon if one exists and we don't already have one tracked
    const activeRun = getActiveDungeonRun();
    if (activeRun && activeRunId === null) {
      const dungeon = dList.find(d => d.id === activeRun.dungeon_id) ?? null;
      if (dungeon) {
        const elapsed   = (Date.now() - new Date(activeRun.started_at).getTime()) / 1000;
        const remaining = Math.max(0, dungeon.duration_mins * 60 - Math.floor(elapsed));
        setActiveRunId(activeRun.run_id);
        setSelectedDungeon(dungeon);
        if (remaining > 0) {
          setTimerSeconds(remaining);
          setDungeonPhase('active');
        } else {
          failDungeon(activeRun.run_id, dungeon);
          setClearResult(null);
          setDungeonPhase('result');
        }
      }
    }
  }

  useFocusEffect(useCallback(() => { reload(); }, []));

  // Countdown tick — each second schedules the next
  useEffect(() => {
    if (dungeonPhase !== 'active' || timerSeconds <= 0) return;
    const t = setTimeout(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [dungeonPhase, timerSeconds]);

  // Auto-fail when timer hits 0
  useEffect(() => {
    if (dungeonPhase !== 'active' || timerSeconds !== 0) return;
    if (activeRunId !== null && selectedDungeon) {
      failDungeon(activeRunId, selectedDungeon);
      setClearResult(null);
      setDungeonPhase('result');
      reload();
    }
  }, [timerSeconds, dungeonPhase, activeRunId, selectedDungeon]);

  function closeDungeonFlow() {
    setSelectedDungeon(null);
    setDungeonPhase(null);
    setActiveRunId(null);
    setTimerSeconds(0);
    setClearResult(null);
    reload();
  }

  function handleAllocate(key: string) {
    const res = allocateStat(key);
    if (res === 'no_ap') { Alert.alert('No AP', 'Level up to earn more Ability Points.'); return; }
    reload();
  }

  function handleEnterGate(dungeon: Dungeon) {
    if (activeRunId !== null && selectedDungeon?.id === dungeon.id) {
      setDungeonPhase('active');
      return;
    }
    setSelectedDungeon(dungeon);
    setDungeonPhase('entry');
  }

  function handleStartTimer() {
    if (!selectedDungeon) return;
    const runId = startDungeon(selectedDungeon.id);
    setActiveRunId(runId);
    setTimerSeconds(selectedDungeon.duration_mins * 60);
    setDungeonPhase('active');
  }

  function handleSubmitClear() {
    if (activeRunId === null || !selectedDungeon) return;
    Alert.alert('Gate Cleared?', 'Confirm you completed the objective.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit Clear', onPress: () => {
        const result = submitDungeonClear(activeRunId!, selectedDungeon!);
        setClearResult(result);
        setDungeonPhase('result');
        reload();
        triggerCurrencyRefresh();
      }},
    ]);
  }

  function handleFailDungeon() {
    if (activeRunId === null || !selectedDungeon) return;
    Alert.alert('Fail Dungeon?', 'HP will be deducted by 20.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fail', style: 'destructive', onPress: () => {
        failDungeon(activeRunId!, selectedDungeon!);
        triggerDeathCheck();
        setClearResult(null);
        setDungeonPhase('result');
        reload();
      }},
    ]);
  }

  function handleAbandon() {
    if (activeRunId === null) return;
    Alert.alert('Abandon Dungeon?', 'No penalty, no reward. Timer stops.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: () => {
        abandonDungeon(activeRunId!);
        closeDungeonFlow();
      }},
    ]);
  }

  function openItemBrowser(slotType: string, title: string, items: InventoryItem[]) {
    setItemBrowserSlot(slotType);
    setItemBrowserTitle(title);
    setBrowserItems(items);
  }

  function handleCompleteQuest() {
    if (!completingQuest) return;
    completeQuest(completingQuest.id, questNotes);
    setCompletingQuest(null);
    setQuestNotes('');
    reload();
    triggerCurrencyRefresh();
  }

  const hp    = rpg?.hp    ?? 100;
  const hpMax = rpg?.hp_max ?? 100;
  const ap    = rpg?.ap    ?? 0;
  const coins = rpg?.coins ?? 0;
  const rankColor = selectedDungeon ? (RANK_COLOR[selectedDungeon.rank] ?? colors.textMuted) : colors.textMuted;

  return (
    <SwipeNavWrapper currentIndex={4}>
    <SafeAreaView style={s.safe}>

      {/* Game ribbon — equal left/right groups so title is truly centred */}
      <View style={s.ribbon}>
        <View style={s.ribbonGroup}>
          <Pressable style={s.ribbonIcon} onPress={() => setQuestPreview(true)}>
            <Feather name="scroll" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={s.ribbonTitle}>SOLO LEVELING</Text>
        <View style={s.ribbonGroup}>
          <Pressable style={s.ribbonIcon} onPress={() => router.push('/store')}>
            <Feather name="shopping-bag" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable style={s.ribbonIcon} onPress={() => router.push('/game-log')}>
            <Feather name="terminal" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Section tabs */}
      <View style={s.tabs}>
        {(['stats', 'inventory', 'quests', 'dungeons'] as GameSection[]).map(tab => (
          <Pressable key={tab} onPress={() => setSection(tab)} style={[s.tab, section === tab && s.tabActive]}>
            <Text style={[s.tabTxt, section === tab && s.tabTxtActive]}>{tab.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── STATS ── */}
        {section === 'stats' && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <View style={s.levelBadge}>
                <Text style={s.levelTxt}>LVL {rpg?.current_level ?? 1}</Text>
              </View>
              <View style={s.titleCol}>
                <Text style={s.jobTxt}>JOB: {rpg?.job ?? '—'}</Text>
                <Text style={s.rankTitle}>{rpg?.title ?? 'Unranked'}</Text>
              </View>
              <View style={s.vitalsMini}>
                <Text style={s.vitalsRow}>AP: <Text style={s.vitalsVal}>{ap}</Text></Text>
                <Text style={s.vitalsRow}>Coins: <Text style={s.vitalsVal}>{coins}</Text></Text>
              </View>
            </View>

            <SystemBar label="HP" value={hp} max={hpMax} color="#EF4444" />
            <SystemBar label="MP" value={rpg?.mp ?? 0} max={100} color="#8B5CF6" />

            {fatigue && (
              <View style={s.fatigueBadge}>
                <Text style={s.fatigueTxt}>FATIGUE — Energy consistently low. STA penalised in dungeon combat.</Text>
              </View>
            )}

            <View style={s.divider} />
            <Text style={s.sectionLabel}>STATUS WINDOW</Text>

            {stats && STAT_KEYS.map(stat => (
              <StatRow
                key={stat.key as string}
                stat={stat}
                value={stats[stat.key] as number}
                apPart={stats[`${stat.key}_ap`  as keyof GameStats] as number}
                autoPart={stats[`${stat.key}_auto` as keyof GameStats] as number}
                ap={ap}
                onAllocate={handleAllocate}
                expanded={expandedStat === stat.abbr}
                onToggle={() => setExpandedStat(prev => prev === stat.abbr ? null : stat.abbr)}
              />
            ))}

            <View style={s.divider} />
            <View style={s.weaponRow}>
              <Text style={s.weaponLabel}>WEAPON</Text>
              <Text style={s.weaponVal}>— None equipped —</Text>
            </View>

            <View style={s.divider} />
            <View style={s.statsFooter}>
              <Text style={s.statsFooterItem}>Deaths: <Text style={s.statsFooterVal}>{deaths}</Text></Text>
              <Text style={s.statsFooterItem}>Quests: <Text style={s.statsFooterVal}>{cleared}</Text></Text>
              <Text style={s.statsFooterItem}>Abandoned: <Text style={s.statsFooterVal}>{abandoned}</Text></Text>
            </View>
          </View>
        )}

        {/* ── INVENTORY ── */}
        {section === 'inventory' && (
          <InventorySection
            invTab={invTab}
            setInvTab={setInvTab}
            suppliesTab={suppliesTab}
            setSuppliesTab={setSuppliesTab}
            onOpenBrowser={openItemBrowser}
            onRarityInfo={(rank) => setRarityInfoRank(rank)}
          />
        )}

        {/* ── QUESTS ── */}
        {section === 'quests' && (
          <>
            {accepted.length === 0 && pending.length === 0 && skipped.length === 0 && completed.length === 0 ? (
              <View style={s.empty}>
                <Feather name="inbox" size={32} color={colors.border} />
                <Text style={s.emptyTxt}>No quests available.{'\n'}Keep logging — the system is watching.</Text>
              </View>
            ) : (
              <>
                {accepted.length > 0 && (
                  <>
                    <Text style={s.sectionHeading}>ACTIVE</Text>
                    {accepted.map(q => (
                      <AcceptedQuestCard
                        key={q.id}
                        quest={q}
                        onComplete={() => { setCompletingQuest(q); setQuestNotes(''); }}
                        onHide={() => { skipQuest(q.id); reload(); }}
                      />
                    ))}
                  </>
                )}
                {pending.length > 0 && (
                  <>
                    <Text style={s.sectionHeading}>AVAILABLE</Text>
                    {pending.map(q => (
                      <PendingQuestCard
                        key={q.id}
                        quest={q}
                        onAccept={() => { acceptQuest(q.id); reload(); }}
                        onHide={() => { skipQuest(q.id); reload(); }}
                      />
                    ))}
                  </>
                )}
                {skipped.length > 0 && (
                  <>
                    <Text style={[s.sectionHeading, { color: colors.textMuted }]}>HIDDEN TODAY</Text>
                    {skipped.map(q => (
                      <HiddenQuestCard
                        key={q.id}
                        quest={q}
                        onReinstate={() => { reinstateQuest(q.id); reload(); }}
                      />
                    ))}
                  </>
                )}
                {completed.length > 0 && (
                  <>
                    <Text style={[s.sectionHeading, { color: colors.textMuted, marginTop: spacing.sm }]}>COMPLETED</Text>
                    {completed.map(q => <CompletedQuestCard key={q.id} quest={q} />)}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── DUNGEONS ── */}
        {section === 'dungeons' && (
          <>
            {dungeons.length === 0 ? (
              <View style={s.empty}>
                <Feather name="shield" size={32} color={colors.border} />
                <Text style={s.emptyTxt}>No dungeon gates detected.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionHeading}>E-RANK GATES</Text>
                {dungeons.map(d => (
                  <DungeonCard
                    key={d.id}
                    dungeon={d}
                    isActiveRun={activeRunId !== null && selectedDungeon?.id === d.id}
                    onTap={() => handleEnterGate(d)}
                    onRarityInfo={() => setRarityInfoRank(d.rank)}
                  />
                ))}
              </>
            )}
          </>
        )}

      </ScrollView>

      {/* ── DUNGEON ENTRY OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'entry' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <View style={[ov.rankRow, { borderBottomColor: rankColor }]}>
              <Text style={[ov.rankLabel, { color: rankColor }]}>RANK {selectedDungeon.rank} GATE</Text>
              <Pressable onPress={() => { setSelectedDungeon(null); setDungeonPhase(null); }}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={ov.name}>{selectedDungeon.name}</Text>
            <Text style={ov.statLine}>
              {selectedDungeon.primary_stat.toUpperCase()} + {selectedDungeon.secondary_stat?.toUpperCase() ?? '—'} · {selectedDungeon.duration_mins} min
            </Text>

            <View style={ov.divider} />
            <Text style={ov.fieldLabel}>OBJECTIVE</Text>
            <Text style={ov.fieldVal}>{selectedDungeon.objective_text ?? selectedDungeon.flavor_text}</Text>

            <Text style={ov.fieldLabel}>CLEAR CONDITION</Text>
            <Text style={ov.fieldVal}>Submit clear before the timer runs out.</Text>

            <Text style={ov.fieldLabel}>FAILURE</Text>
            <Text style={[ov.fieldVal, { color: '#EF4444' }]}>HP −20</Text>

            {fatigue && (
              <View style={ov.fatigueWarn}>
                <Text style={ov.fatigueWarnTxt}>FATIGUE ACTIVE — STA and STR are penalised. Recovery recommended.</Text>
              </View>
            )}

            <Text style={ov.fieldLabel}>REWARD</Text>
            <Text style={[ov.fieldVal, { color: colors.success }]}>
              +45 XP · +{selectedDungeon.coin_reward} Coins · Item drop possible (E–C rarity)
            </Text>

            <View style={ov.divider} />
            <Text style={ov.timerStatic}>{fmtTimer(selectedDungeon.duration_mins * 60)}</Text>
            <Text style={ov.timerHint}>Time limit</Text>

            <Pressable onPress={handleStartTimer} style={[ov.primaryBtn, { borderColor: colors.primary }]}>
              <Text style={[ov.primaryBtnTxt, { color: colors.primary }]}>START TIMER</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── DUNGEON ACTIVE TIMER OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'active' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <View style={[ov.rankRow, { borderBottomColor: rankColor }]}>
              <Text style={[ov.rankLabel, { color: rankColor }]}>RANK {selectedDungeon.rank} GATE</Text>
            </View>
            <Text style={ov.name}>{selectedDungeon.name}</Text>

            <View style={ov.divider} />
            <Text style={ov.timerLabel}>TIME REMAINING</Text>
            <Text style={[ov.timerBig, timerSeconds <= 60 && { color: '#EF4444' }]}>
              {fmtTimer(timerSeconds)}
            </Text>

            <Text style={ov.fieldLabel}>OBJECTIVE</Text>
            <Text style={ov.fieldVal}>{selectedDungeon.objective_text ?? selectedDungeon.flavor_text}</Text>

            <View style={ov.divider} />

            <Pressable onPress={handleSubmitClear} style={[ov.primaryBtn, { borderColor: colors.success }]}>
              <Text style={[ov.primaryBtnTxt, { color: colors.success }]}>SUBMIT CLEAR</Text>
            </Pressable>

            <View style={ov.secondaryRow}>
              <Pressable onPress={handleFailDungeon} style={[ov.secondaryBtn, { borderColor: '#EF4444' }]}>
                <Text style={[ov.secondaryBtnTxt, { color: '#EF4444' }]}>FAIL DUNGEON</Text>
              </Pressable>
              <Pressable onPress={handleAbandon} style={ov.secondaryBtn}>
                <Text style={ov.secondaryBtnTxt}>ABANDON</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── DUNGEON RESULT OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'result' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <Text style={[ov.resultLabel, { color: clearResult ? colors.success : '#EF4444' }]}>
              {clearResult ? 'GATE CLEARED' : 'GATE FAILED'}
            </Text>
            <Text style={ov.name}>{selectedDungeon.name}</Text>
            <View style={ov.divider} />

            {clearResult ? (
              <>
                <Text style={[ov.fieldVal, { color: colors.success }]}>+{clearResult.xpEarned} XP</Text>
                <Text style={[ov.fieldVal, { color: colors.success }]}>+{clearResult.coinsEarned} Coins</Text>
                <View style={ov.divider} />
                <Text style={ov.fieldLabel}>ACTIVITY LOGGED</Text>
                <Text style={ov.fieldVal}>{selectedDungeon.name}</Text>
                <Text style={ov.fieldLabel}>ITEM FOUND</Text>
                {clearResult.itemDropped ? (
                  <Text style={[ov.fieldVal, { color: RARITY_COLOR[(clearResult.itemRarity as Rarity) ?? 'E'] }]}>
                    {clearResult.itemDropped}
                    {clearResult.itemRarity ? `  [${clearResult.itemRarity}]` : ''}
                  </Text>
                ) : (
                  <Text style={ov.fieldVal}>None</Text>
                )}
              </>
            ) : (
              <>
                <Text style={[ov.fieldVal, { color: '#EF4444' }]}>HP −20</Text>
              </>
            )}

            <Pressable
              onPress={closeDungeonFlow}
              style={[ov.primaryBtn, { borderColor: clearResult ? colors.success : '#EF4444', marginTop: spacing.lg }]}
            >
              <Text style={[ov.primaryBtnTxt, { color: clearResult ? colors.success : '#EF4444' }]}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── ITEM BROWSER (80% modal) ── */}
      <Modal visible={itemBrowserSlot !== null} transparent animationType="slide">
        <View style={bm.overlay}>
          <View style={bm.sheet}>
            <View style={bm.header}>
              <Text style={bm.title}>{itemBrowserTitle}</Text>
              <Pressable onPress={() => { setItemBrowserSlot(null); }} style={bm.closeBtn}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={bm.divider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {browserItems.length === 0 ? (
                <View style={bm.empty}>
                  <Text style={bm.emptyTxt}>No items acquired yet for this slot.</Text>
                  <Text style={bm.emptyHint}>Clear dungeons to earn drops.</Text>
                </View>
              ) : (
                browserItems.map(item => {
                  const rarity = (item.rarity as Rarity) ?? 'E';
                  const col = RARITY_COLOR[rarity];
                  const isLegendary = rarity === 'Chromatic';
                  return (
                    <View key={item.id} style={[bm.itemCard, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
                      <View style={bm.itemRow}>
                        <View style={[bm.rarityBadge, { borderColor: col }]}>
                          <Text style={[bm.rarityTxt, { color: col }]}>{rarityLabel(rarity)}</Text>
                        </View>
                        <Text style={[bm.itemName, { color: col, fontFamily: isLegendary ? fonts.ui.semibold : fonts.ui.regular }]}>{item.item_name}</Text>
                        {(item.quantity ?? 1) > 1 && <Text style={[bm.qty, isLegendary && { color: col }]}>×{item.quantity}</Text>}
                      </View>
                      {item.description ? (
                        <Text style={[bm.itemDesc, isLegendary && { color: col, opacity: 0.85 }]}>{item.description}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── RARITY DROP INFO ── */}
      <Modal visible={rarityInfoRank !== null} transparent animationType="fade">
        <Pressable style={bm.overlay} onPress={() => setRarityInfoRank(null)}>
          <Pressable style={bm.raritySheet} onPress={() => {}}>
            <Text style={bm.raritySheetTitle}>Drop Rates — {rarityInfoRank}-rank Dungeon</Text>
            <View style={bm.divider} />
            {rarityInfoRank && getDropRates(rarityInfoRank).map(({ rarity, chance }) => (
              <View key={rarity} style={bm.rateRow}>
                <View style={[bm.rateDot, { backgroundColor: RARITY_COLOR[rarity as Rarity] ?? colors.border }]} />
                <Text style={[bm.rateLabel, { color: RARITY_COLOR[rarity as Rarity] ?? colors.textMuted }]}>{rarity}</Text>
                <Text style={bm.rateVal}>{(chance * 100).toFixed(0)}%</Text>
              </View>
            ))}
            <Text style={bm.rateNote}>Remaining probability = no drop this run.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── QUEST PREVIEW SHEET ── */}
      <Modal visible={questPreview} transparent animationType="slide">
        <Pressable style={qm.sheetOverlay} onPress={() => setQuestPreview(false)}>
          <Pressable style={qm.sheet} onPress={() => {}}>
            <View style={qm.handle} />
            <Text style={qm.sheetTitle}>Quest Overview</Text>
            <Text style={qm.sheetSub}>
              {accepted.length + pending.length === 0
                ? 'No active quests. Keep logging — the system is watching.'
                : `${accepted.length} active · ${pending.length} available · ${completed.length} completed`}
            </Text>
            <View style={qm.divider} />
            {accepted.map(q => (
              <View key={q.id} style={qpv.row}>
                <View style={[qpv.dot, { backgroundColor: colors.success }]} />
                <Text style={qpv.text}>{q.title}</Text>
                <Text style={qpv.badge}>ACTIVE</Text>
              </View>
            ))}
            {pending.slice(0, 4).map(q => (
              <View key={q.id} style={qpv.row}>
                <View style={[qpv.dot, { backgroundColor: colors.border }]} />
                <Text style={[qpv.text, { color: colors.textMuted }]}>{q.title}</Text>
              </View>
            ))}
            {skipped.length > 0 && (
              <Text style={[qpv.hint, { marginTop: 2 }]}>{skipped.length} hidden today</Text>
            )}
            <View style={qm.divider} />
            <Text style={qpv.hint}>Quests surface habits logged ≥2× in the past 28 days but absent in the last 7.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── QUEST COMPLETE SHEET ── */}
      <Modal visible={completingQuest !== null} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setCompletingQuest(null)} />
          <View style={qm.sheet}>
            <View style={qm.handle} />
            <Text style={qm.sheetTitle}>Complete Quest</Text>
            <Text style={qm.sheetSub}>{completingQuest?.title}</Text>
            <View style={qm.divider} />
            <Text style={qm.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={qm.input}
              placeholder="Any notes about this session..."
              placeholderTextColor={colors.textMuted}
              value={questNotes}
              onChangeText={setQuestNotes}
              multiline
              numberOfLines={3}
            />
            <Pressable onPress={handleCompleteQuest} style={qm.confirmBtn}>
              <Text style={qm.confirmTxt}>Confirm Completion</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },

  ribbon:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  ribbonGroup: { flexDirection: 'row', minWidth: 64, justifyContent: 'flex-end' },
  ribbonIcon:  { padding: 6 },
  ribbonTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.primary, letterSpacing: 3 },

  tabs:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:        { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:  { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:     { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  tabTxtActive: { color: colors.primary },

  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  panel:       { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  levelBadge:  { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 },
  levelTxt:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1 },
  titleCol:    { flex: 1, gap: 2 },
  jobTxt:      { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  rankTitle:   { fontFamily: fonts.ui.semibold,  fontSize: fontSize.base, color: colors.textPrimary },
  vitalsMini:  { alignItems: 'flex-end', gap: 2 },
  vitalsRow:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  vitalsVal:   { color: colors.textPrimary },

  fatigueBadge: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: spacing.sm },
  fatigueTxt:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: '#EF4444' },

  divider:     { height: 1, backgroundColor: colors.border },
  sectionLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },

  weaponRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weaponLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  weaponVal:   { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm, color: colors.textMuted },

  statsFooter:     { flexDirection: 'row', gap: spacing.lg },
  statsFooterItem: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  statsFooterVal:  { color: colors.textPrimary },

  sectionHeading: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 2 },

  empty:    { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  emptyTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

const ov = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)', padding: spacing.lg, justifyContent: 'center', zIndex: 100 },
  panel:   { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },

  rankRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: spacing.sm },
  rankLabel:  { fontFamily: fonts.mono.bold,    fontSize: fontSize.xs,  letterSpacing: 2 },
  name:       { fontFamily: fonts.ui.semibold,  fontSize: fontSize.xl,  color: colors.textPrimary },
  statLine:   { fontFamily: fonts.mono.regular, fontSize: fontSize.sm,  color: colors.textMuted },
  divider:    { height: 1, backgroundColor: colors.border },

  fieldLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs,   color: colors.textMuted, letterSpacing: 1 },
  fieldVal:   { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm,   color: colors.textPrimary, lineHeight: 20 },

  timerStatic:  { fontFamily: fonts.mono.bold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 4 },
  timerHint:    { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', letterSpacing: 1 },
  timerLabel:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, textAlign: 'center' },
  timerBig:     { fontFamily: fonts.mono.bold, fontSize: 64, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },

  resultLabel: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, letterSpacing: 2 },

  primaryBtn:    { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  primaryBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },

  secondaryRow:    { flexDirection: 'row', gap: spacing.md },
  secondaryBtn:    { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  secondaryBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },

  fatigueWarn:    { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: radius.sm, padding: spacing.sm },
  fatigueWarnTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: '#EF4444' },
});

const qpv = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  badge: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.success, letterSpacing: 1 },
  hint:  { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
});

const qm = StyleSheet.create({
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  handle:       { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetTitle:   { fontFamily: fonts.ui.semibold,  fontSize: fontSize.lg,  color: colors.textPrimary },
  sheetSub:     { fontFamily: fonts.mono.regular, fontSize: fontSize.xs,  color: colors.textMuted },
  divider:      { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  inputLabel:   { fontFamily: fonts.ui.medium,    fontSize: fontSize.sm,  color: colors.textMuted },
  input:        { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg, minHeight: 80, textAlignVertical: 'top' },
  confirmBtn:   { backgroundColor: colors.success, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  confirmTxt:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});

const bm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { height: '80%', backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  header:     { flexDirection: 'row', alignItems: 'center' },
  title:      { fontFamily: fonts.ui.semibold, fontSize: fontSize.lg, color: colors.textPrimary, flex: 1 },
  closeBtn:   { padding: 4 },
  divider:    { height: 1, backgroundColor: colors.border },
  empty:      { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyTxt:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textMuted },
  emptyHint:  { fontFamily: fonts.ui.regular,  fontSize: fontSize.sm,   color: colors.border },
  itemCard:   { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rarityBadge:{ borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  rarityTxt:  { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },
  itemName:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, flex: 1 },
  qty:        { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary },
  itemDesc:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  raritySheet: { backgroundColor: colors.card, borderRadius: radius.lg, margin: spacing.xl, padding: spacing.lg, gap: spacing.sm },
  raritySheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  rateRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  rateDot:    { width: 8, height: 8, borderRadius: 4 },
  rateLabel:  { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, width: 60 },
  rateVal:    { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  rateNote:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
