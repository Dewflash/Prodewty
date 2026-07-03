import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import { getRpgDiscoveries, type RpgDiscoveryRow } from '../db/rpgDiscovery';
import {
  countSanctuaryLayoutSets,
  countRpgSourcePacks,
  getPlaceableItem,
  getRpgArchiveEntries,
  getRpgItem,
  getSanctuaryDesignRole,
  getSanctuaryLayoutFitLabels,
  itemMatchesSanctuaryLayoutSet,
  RPG_SOURCE_PACK_FILTERS,
  SANCTUARY_LAYOUT_SET_FILTERS,
  type RpgArchiveCategory,
  type RpgArchiveEntry,
  type RpgItemRarity,
  type RpgSourcePackId,
  type SanctuaryLayoutSetId,
} from './RpgObjectCatalog';
import { getRpgAsset, RPG_ARCHIVE_FRAMES, type RpgAssetDefinition } from './RpgAssetRegistry';
import { RpgSpriteAnimationView, RpgSpriteFrameView } from './RpgItemIcon';
import { SanctuaryFootprintPreview } from './SanctuaryFootprintPreview';
import { getSanctuaryTerrainPaintTarget, SanctuaryTerrainPaintIcon, SanctuaryTerrainPaintPreview } from './SanctuaryTerrainPaintPreview';
import { getMasteryLevel, getMasteryTier } from '../db/skills';

// Discovery/Understanding ladder (RPG_ARCHITECTURE.md): an item's own
// rarity maps to a required Research mastery tier. Reaching the tier
// *before* that unlocks Discovery (shown as "???"); reaching the
// matching tier unlocks Understanding (real name shown).
const RARITY_TIER_RANK: Record<RpgItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
};
const TIER_RANK: Record<string, number> = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };

function getResearchTierRank(): number {
  const level = getMasteryLevel('research');
  return TIER_RANK[getMasteryTier(level)] ?? 0;
}

// `entry.known` already means "Understood" (see Archive section in
// RPG_ARCHITECTURE.md) — redact the name until then. Undiscovered
// entries don't reach this at all (filtered out by scope before render).
function archiveDisplayName(entry: { name: string; known: boolean; discovered: boolean }): string {
  if (!entry.discovered) return '???';
  return entry.known ? entry.name : '???';
}

type CountRow = {
  item_id: string;
  quantity: number;
};

type ArchiveFilter = 'all' | RpgArchiveCategory;
type ArchiveScope = 'all' | 'discovered' | 'known' | 'locked';
type ArchiveSort = 'name' | 'rarity' | 'status';

type ArchiveEntryState = RpgArchiveEntry & {
  quantity: number;
  placed: number;
  known: boolean;
  discovered: boolean;
  discovery: RpgDiscoveryRow | null;
  asset: RpgAssetDefinition | null;
};

type Props = {
  isOpen: boolean;
  refreshKey: number;
  onClose: () => void;
};

const PAGE_SIZE = 6;
const FILTERS: { id: ArchiveFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'object', label: 'Objects' },
  { id: 'seed', label: 'Seeds' },
  { id: 'resource', label: 'Resources' },
];
const SCOPE_FILTERS: { id: ArchiveScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'discovered', label: 'Seen' },
  { id: 'known', label: 'Known' },
  { id: 'locked', label: 'Locked' },
];
const SORTS: { id: ArchiveSort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'status', label: 'Status' },
];
const SLOT_POSITIONS = [
  { x: 36, y: 114 },
  { x: 36, y: 154 },
  { x: 36, y: 194 },
  { x: 148, y: 114 },
  { x: 148, y: 154 },
  { x: 148, y: 194 },
];

function loadCounts() {
  const inventoryRows = db.getAllSync<CountRow>(
    'SELECT item_id, quantity FROM user_inventory WHERE quantity > 0',
  );
  const placedRows = db.getAllSync<CountRow>(
    'SELECT type AS item_id, COUNT(*) AS quantity FROM sanctuary_objects GROUP BY type',
  );
  const discoveryRows = getRpgDiscoveries();
  return {
    inventory: Object.fromEntries(inventoryRows.map(row => [row.item_id, row.quantity])),
    placed: Object.fromEntries(placedRows.map(row => [row.item_id, row.quantity])),
    discoveries: Object.fromEntries(discoveryRows.map(row => [row.item_id, row])),
  };
}

function archiveStatusLabel(entry: ArchiveEntryState) {
  if (!entry.discovered) return 'Locked';
  if (entry.quantity > 0 && entry.placed > 0) return `Own ${entry.quantity} / Map ${entry.placed}`;
  if (entry.quantity > 0) return `Owned ${entry.quantity}`;
  if (entry.placed > 0) return `Placed ${entry.placed}`;
  return entry.known ? 'Known' : 'Seen';
}

// known now implies discovered (Understanding requires Discovery first —
// see RPG_ARCHITECTURE.md), so these are no longer mutually exclusive
// categories the way they were when `known` meant "shop-purchasable."
function archiveScopeMatches(entry: ArchiveEntryState, scope: ArchiveScope) {
  if (scope === 'all') return true;
  if (scope === 'discovered') return entry.discovered;
  if (scope === 'known') return entry.discovered && entry.known;
  return !entry.discovered;
}

function archiveSourceMatches(entry: ArchiveEntryState, source: RpgSourcePackId) {
  if (source === 'all') return true;
  const sourceFilter = RPG_SOURCE_PACK_FILTERS.find(item => item.id === source);
  return !!sourceFilter?.sourceLabel && entry.sourceLabel === sourceFilter.sourceLabel;
}

function archiveLayoutItem(entry: ArchiveEntryState) {
  return {
    kind: entry.category,
    tags: entry.tags,
    sourceLabel: entry.sourceLabel,
  };
}

function rarityColor(rarity: RpgItemRarity | undefined) {
  if (rarity === 'epic') return '#d7b3ff';
  if (rarity === 'rare') return '#8fd7ff';
  if (rarity === 'uncommon') return '#9ee6a8';
  return '#f7e6a5';
}

function rarityRank(rarity: RpgItemRarity | undefined) {
  if (rarity === 'epic') return 0;
  if (rarity === 'rare') return 1;
  if (rarity === 'uncommon') return 2;
  return 3;
}

function statusRank(entry: ArchiveEntryState) {
  if (entry.discovered && entry.known) return 0;
  if (entry.discovered) return 1;
  return 2;
}

function archiveEntryMatchesQuery(entry: ArchiveEntryState, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry.name,
    entry.itemId,
    entry.category,
    entry.rarity,
    entry.sourceLabel,
    entry.description,
    ...entry.tags,
    ...entry.facts,
  ].some(value => value.toLowerCase().includes(normalized));
}

function discoverySourceLabel(source: string) {
  if (source === 'buy') return 'Bought';
  if (source === 'forage') return 'Foraged';
  if (source === 'harvest') return 'Harvested';
  if (source === 'inventory') return 'Earned';
  if (source === 'plant') return 'Planted';
  if (source === 'place') return 'Placed';
  return 'Discovered';
}

function ArchiveItemArt({ itemId, asset, discovered, known }: {
  itemId: string;
  asset: RpgAssetDefinition | null;
  discovered: boolean;
  known: boolean;
}) {
  // known now implies discovered, so this is just a 2-state opacity.
  const opacity = discovered ? 1 : 0.26;

  if (discovered && getSanctuaryTerrainPaintTarget(itemId) !== null) {
    return (
      <View style={{ opacity }}>
        <SanctuaryTerrainPaintIcon itemId={itemId} size={28} />
      </View>
    );
  }

  if (asset?.animation) {
    return (
      <View style={{ opacity }}>
        <RpgSpriteAnimationView animation={asset.animation} size={28} />
      </View>
    );
  }

  if (asset?.frame) {
    return (
      <View style={{ opacity }}>
        <RpgSpriteFrameView frame={asset.frame} size={28} />
      </View>
    );
  }

  if (asset?.source) {
    return <Image source={asset.source} resizeMode="contain" style={[styles.entryImage, { opacity }]} />;
  }

  return (
    <View style={styles.lockIcon}>
      <Feather name="lock" size={14} color="#6a4328" />
    </View>
  );
}

export function RpgArchive({ isOpen, refreshKey, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [source, setSource] = useState<RpgSourcePackId>('all');
  const [layoutSet, setLayoutSet] = useState<SanctuaryLayoutSetId>('all');
  const [scope, setScope] = useState<ArchiveScope>('all');
  const [sort, setSort] = useState<ArchiveSort>('name');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<ArchiveEntryState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scale = Math.max(
    1.05,
    Math.min(1.55, (width - 24) / RPG_ARCHIVE_FRAMES.openBook.width, (height - 360) / RPG_ARCHIVE_FRAMES.openBook.height),
  );
  const bookWidth = RPG_ARCHIVE_FRAMES.openBook.width * scale;
  const bookHeight = RPG_ARCHIVE_FRAMES.openBook.height * scale;

  useEffect(() => {
    if (!isOpen) return;
    try {
      const counts = loadCounts();
      const researchTierRank = getResearchTierRank();
      const nextEntries = getRpgArchiveEntries().map(entry => {
        const quantity = counts.inventory[entry.itemId] ?? 0;
        const placed = counts.placed[entry.itemId] ?? 0;
        const discovery = counts.discoveries[entry.itemId] ?? null;
        const requiredTierRank = RARITY_TIER_RANK[entry.rarity] ?? 0;
        // Discovered = "I've seen it and can own it" — gated by Research
        // mastery one tier below the item's own rarity tier.
        const seenOrOwned = !!discovery || quantity > 0 || placed > 0;
        const discovered = seenOrOwned && researchTierRank + 1 >= requiredTierRank;
        // Known = "Understood" — reached the item's own rarity tier.
        const known = discovered && researchTierRank >= requiredTierRank;
        return {
          ...entry,
          quantity,
          placed,
          known,
          discovered,
          discovery,
          asset: getRpgAsset(entry.iconAssetId ?? entry.assetId),
        };
      });
      setEntries(nextEntries);
      setSelectedId(current => (
        current && nextEntries.some(entry => entry.itemId === current)
          ? current
          : nextEntries[0]?.itemId ?? null
      ));
    } catch (e) {
      console.warn('Failed to load RPG archive', e);
      setEntries([]);
      setSelectedId(null);
    }
  }, [isOpen, refreshKey]);

  const filteredEntries = useMemo(
    () => entries
      .filter(entry => (
        (filter === 'all' || entry.category === filter) &&
        archiveSourceMatches(entry, source) &&
        itemMatchesSanctuaryLayoutSet(archiveLayoutItem(entry), layoutSet) &&
        archiveScopeMatches(entry, scope) &&
        archiveEntryMatchesQuery(entry, query)
      ))
      .sort((a, b) => {
        if (sort === 'rarity') {
          return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name);
        }
        if (sort === 'status') {
          return statusRank(a) - statusRank(b) || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      }),
    [entries, filter, layoutSet, query, scope, sort, source],
  );
  const archiveCounts = useMemo(() => ({
    total: entries.length,
    discovered: entries.filter(entry => entry.discovered).length,
    known: entries.filter(entry => entry.discovered && entry.known).length,
    locked: entries.filter(entry => !entry.discovered && !entry.known).length,
  }), [entries]);
  const sourceCounts = useMemo(
    () => countRpgSourcePacks(entries, entry => entry.sourceLabel),
    [entries],
  );
  const layoutSetCounts = useMemo(
    () => countSanctuaryLayoutSets(entries, archiveLayoutItem),
    [entries],
  );
  const maxPage = Math.max(0, Math.ceil(filteredEntries.length / PAGE_SIZE) - 1);
  const pageEntries = filteredEntries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = filteredEntries.find(entry => entry.itemId === selectedId) ?? pageEntries[0] ?? null;
  const selectedCatalogItem = selected ? getRpgItem(selected.itemId) : null;
  const selectedPlaceable = selected ? getPlaceableItem(selected.itemId) : null;
  const selectedDesignRole = selected && (selected.discovered || selected.known)
    ? getSanctuaryDesignRole(selectedCatalogItem)
    : null;
  const selectedLayoutFits = selected && (selected.discovered || selected.known)
    ? getSanctuaryLayoutFitLabels(selectedCatalogItem)
    : [];
  const selectedCanPreviewFootprint = !!selected && (selected.discovered || selected.known);

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setSelectedId(current => (
      current && filteredEntries.some(entry => entry.itemId === current)
        ? current
        : filteredEntries[0]?.itemId ?? null
    ));
  }, [filter, filteredEntries, isOpen, layoutSet, query, scope, sort, source]);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page]);

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.archiveStack, { width: bookWidth }]}>
        <View style={styles.filterBar}>
          {FILTERS.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} archive filter`}
                onPress={() => setFilter(item.id)}
                style={[styles.filterButton, active && styles.filterButtonActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sourceBar}>
          {RPG_SOURCE_PACK_FILTERS.map(item => {
            const active = source === item.id;
            const count = sourceCounts[item.id];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} archive source`}
                onPress={() => setSource(item.id)}
                style={[styles.sourceButton, active && styles.sourceButtonActive]}
              >
                <Text style={[styles.sourceText, active && styles.sourceTextActive]}>{item.label}</Text>
                <Text style={[styles.sourceCount, active && styles.sourceTextActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.layoutBar}>
          {SANCTUARY_LAYOUT_SET_FILTERS.map(item => {
            const active = layoutSet === item.id;
            const count = layoutSetCounts[item.id];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} archive layout set`}
                onPress={() => setLayoutSet(item.id)}
                style={[styles.layoutButton, active && styles.layoutButtonActive]}
              >
                <Text style={[styles.layoutText, active && styles.layoutTextActive]}>{item.label}</Text>
                <Text style={[styles.layoutCount, active && styles.layoutTextActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.scopeBar}>
          {SCOPE_FILTERS.map(item => {
            const active = scope === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} archive scope`}
                onPress={() => setScope(item.id)}
                style={[styles.scopeButton, active && styles.scopeButtonActive]}
              >
                <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={13} color="rgba(255,242,187,0.72)" />
          <TextInput
            accessibilityLabel="Search archive"
            value={query}
            onChangeText={setQuery}
            placeholder="Search archive"
            placeholderTextColor="rgba(255,242,187,0.44)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear archive search" onPress={() => setQuery('')} style={styles.clearSearchButton}>
              <Feather name="x" size={13} color="#fff2bb" />
            </Pressable>
          )}
        </View>

        <View style={styles.sortBar}>
          {SORTS.map(item => {
            const active = sort === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Sort archive by ${item.label}`}
                onPress={() => setSort(item.id)}
                style={[styles.sortButton, active && styles.sortButtonActive]}
              >
                <Text style={[styles.sortText, active && styles.sortTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text numberOfLines={1} style={styles.summaryText}>
          Seen {archiveCounts.discovered}/{archiveCounts.total}  Known {archiveCounts.known}  Locked {archiveCounts.locked}  Showing {filteredEntries.length}
        </Text>

        <View style={[styles.book, { width: bookWidth, height: bookHeight }]}>
          <RpgSpriteFrameView frame={RPG_ARCHIVE_FRAMES.openBook} scale={scale} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close archive"
            onPress={onClose}
            style={[styles.closeButton, { right: 22 * scale, top: 48 * scale }]}
          >
            <Feather name="x" size={15} color="#6a4328" />
          </Pressable>

          {pageEntries.map((entry, index) => {
            const slot = SLOT_POSITIONS[index];
            const selectedEntry = entry.itemId === selected?.itemId;
            return (
              <Pressable
                key={entry.itemId}
                accessibilityRole="button"
                accessibilityLabel={`${archiveDisplayName(entry)}, ${archiveStatusLabel(entry)}`}
                onPress={() => setSelectedId(entry.itemId)}
                style={[
                  styles.entrySlot,
                  selectedEntry && styles.entrySlotSelected,
                  {
                    left: slot.x * scale,
                    top: slot.y * scale,
                    width: 88 * scale,
                    height: 34 * scale,
                  },
                ]}
              >
                <ArchiveItemArt itemId={entry.itemId} asset={entry.asset} discovered={entry.discovered} known={entry.known} />
                <View style={styles.entryTextBlock}>
                  <Text numberOfLines={1} style={styles.entryName}>{archiveDisplayName(entry)}</Text>
                  <Text numberOfLines={1} style={styles.entryStatus}>{archiveStatusLabel(entry)}</Text>
                </View>
              </Pressable>
            );
          })}

          {pageEntries.length === 0 && (
            <View style={[styles.emptyBookState, { left: 50 * scale, top: 148 * scale, width: 172 * scale }]}>
              <Feather name="search" size={15} color="#6a4328" />
              <Text style={styles.emptyBookText}>No entries here</Text>
            </View>
          )}

          {maxPage > 0 && (
            <View style={[styles.pageControls, { left: 95 * scale, bottom: 26 * scale }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous archive page"
                disabled={page === 0}
                onPress={() => setPage(current => Math.max(0, current - 1))}
                style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
              >
                <Feather name="chevron-left" size={16} color="#6a4328" />
              </Pressable>
              <Text style={styles.pageText}>{page + 1}/{maxPage + 1}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next archive page"
                disabled={page >= maxPage}
                onPress={() => setPage(current => Math.min(maxPage, current + 1))}
                style={[styles.pageButton, page >= maxPage && styles.pageButtonDisabled]}
              >
                <Feather name="chevron-right" size={16} color="#6a4328" />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.detailBar}>
          <View style={styles.detailTitleRow}>
            <Text numberOfLines={1} style={styles.detailTitle}>{selected ? archiveDisplayName(selected) : 'Archive'}</Text>
            {selected && (
              <>
                <Text style={styles.detailBadge}>{selected.category}</Text>
                <Text style={[styles.rarityBadge, { color: rarityColor(selected.rarity), borderColor: rarityColor(selected.rarity) }]}>
                  {selected.rarity}
                </Text>
              </>
            )}
          </View>
          <Text numberOfLines={2} style={styles.detailText}>
            {selected
              ? selected.discovered || selected.known
                ? selected.description
                : selected.unlockHint
              : 'Collected sanctuary items appear here.'}
          </Text>
          {selected?.discovered && (
            <Text numberOfLines={1} style={styles.detailMeta}>
              {selected.discovery
                ? `${discoverySourceLabel(selected.discovery.source)} - Seen ${selected.discovery.seen_count} - ${selected.sourceLabel}`
                : `Discovered - ${selected.sourceLabel}`}
            </Text>
          )}
          {selected && !selected.discovered && (
            <Text numberOfLines={1} style={styles.detailMeta}>{selected.sourceLabel}</Text>
          )}
          {selectedDesignRole && (
            <View style={styles.designRoleRow}>
              <View style={[
                styles.designRolePill,
                selectedDesignRole.tone === 'nature' && styles.designRoleNature,
                selectedDesignRole.tone === 'farm' && styles.designRoleFarm,
                selectedDesignRole.tone === 'ruin' && styles.designRoleRuin,
                selectedDesignRole.tone === 'utility' && styles.designRoleUtility,
                selectedDesignRole.tone === 'livestock' && styles.designRoleLivestock,
                selectedDesignRole.tone === 'resource' && styles.designRoleResource,
              ]}>
                <Text style={styles.designRoleText}>{selectedDesignRole.label}</Text>
              </View>
              <Text numberOfLines={1} style={styles.designRoleHint}>{selectedDesignRole.hint}</Text>
            </View>
          )}
          {selectedLayoutFits.length > 0 && (
            <View style={styles.layoutFitRow}>
              <Text style={styles.layoutFitLead}>Fits</Text>
              {selectedLayoutFits.map(label => (
                <View key={label} style={styles.layoutFitPill}>
                  <Text numberOfLines={1} style={styles.layoutFitText}>{label}</Text>
                </View>
              ))}
            </View>
          )}
          {selectedCanPreviewFootprint && selectedPlaceable ? (
            <SanctuaryFootprintPreview colWidth={selectedPlaceable.colWidth} colHeight={selectedPlaceable.colHeight} />
          ) : selectedCanPreviewFootprint && selectedCatalogItem?.kind === 'seed' ? (
            <SanctuaryFootprintPreview colWidth={1} colHeight={1} label="Planting" />
          ) : null}
          {selectedCanPreviewFootprint && selected && <SanctuaryTerrainPaintPreview itemId={selected.itemId} />}
          {selected && (selected.discovered || selected.known) && selected.facts.length > 0 && (
            <View style={styles.factGrid}>
              {selected.facts.slice(0, 6).map(fact => (
                <View key={fact} style={styles.factPill}>
                  <Text numberOfLines={1} style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  archiveStack: {
    alignItems: 'center',
  },
  filterBar: {
    width: '100%',
    minHeight: 34,
    marginBottom: 6,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(27,18,14,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.28)',
    flexDirection: 'row',
  },
  filterButton: {
    flex: 1,
    minHeight: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(247,230,165,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.45)',
  },
  filterText: {
    color: 'rgba(247,230,165,0.7)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  filterTextActive: {
    color: '#fff2bb',
  },
  scopeBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 4,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.2)',
    flexDirection: 'row',
  },
  scopeButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeButtonActive: {
    backgroundColor: 'rgba(247,230,165,0.22)',
  },
  scopeText: {
    color: 'rgba(247,230,165,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  scopeTextActive: {
    color: '#fff2bb',
  },
  sourceBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 4,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(27,18,14,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.2)',
    flexDirection: 'row',
  },
  sourceButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceButtonActive: {
    backgroundColor: 'rgba(247,230,165,0.18)',
  },
  sourceText: {
    color: 'rgba(247,230,165,0.66)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  sourceTextActive: {
    color: '#fff2bb',
  },
  sourceCount: {
    marginTop: 1,
    color: 'rgba(247,230,165,0.52)',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  layoutBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 4,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(74,91,57,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(190,224,142,0.22)',
    flexDirection: 'row',
  },
  layoutButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutButtonActive: {
    backgroundColor: 'rgba(190,224,142,0.2)',
  },
  layoutText: {
    color: 'rgba(224,240,178,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  layoutTextActive: {
    color: '#fff2bb',
  },
  layoutCount: {
    marginTop: 1,
    color: 'rgba(224,240,178,0.52)',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  searchRow: {
    width: '100%',
    minHeight: 32,
    marginBottom: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(27,18,14,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.26)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 30,
    marginLeft: 7,
    paddingVertical: 0,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 4,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(27,18,14,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.2)',
    flexDirection: 'row',
  },
  sortButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(247,230,165,0.18)',
  },
  sortText: {
    color: 'rgba(247,230,165,0.66)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  sortTextActive: {
    color: '#fff2bb',
  },
  summaryText: {
    width: '100%',
    marginBottom: 4,
    color: 'rgba(255,242,187,0.74)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
    textAlign: 'center',
  },
  book: {
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySlot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRadius: 5,
  },
  entrySlotSelected: {
    backgroundColor: 'rgba(97,60,33,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(106,67,40,0.36)',
  },
  entryImage: {
    width: 29,
    height: 29,
  },
  lockIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(106,67,40,0.12)',
  },
  emptyBookState: {
    position: 'absolute',
    minHeight: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(255,242,187,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(106,67,40,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBookText: {
    marginLeft: 5,
    color: '#6a4328',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  entryTextBlock: {
    flex: 1,
    marginLeft: 5,
  },
  entryName: {
    color: '#3f2619',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  entryStatus: {
    color: '#775338',
    fontFamily: fonts.ui.regular,
    fontSize: 8,
    marginTop: 1,
  },
  pageControls: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageButton: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.35,
  },
  pageText: {
    minWidth: 38,
    textAlign: 'center',
    color: '#6a4328',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  detailBar: {
    width: '100%',
    minHeight: 108,
    marginTop: 2,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(27,18,14,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.3)',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTitle: {
    flex: 1,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 13,
  },
  detailBadge: {
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: '#20130e',
    backgroundColor: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
    textTransform: 'capitalize',
  },
  rarityBadge: {
    overflow: 'hidden',
    marginLeft: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
    textTransform: 'capitalize',
  },
  detailText: {
    marginTop: 5,
    color: 'rgba(255,242,187,0.82)',
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  detailMeta: {
    marginTop: 3,
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  designRoleRow: {
    marginTop: 6,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  designRolePill: {
    maxWidth: 92,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(247,230,165,0.14)',
  },
  designRoleNature: {
    backgroundColor: 'rgba(121,211,143,0.18)',
  },
  designRoleFarm: {
    backgroundColor: 'rgba(237,196,93,0.2)',
  },
  designRoleRuin: {
    backgroundColor: 'rgba(153,189,255,0.18)',
  },
  designRoleUtility: {
    backgroundColor: 'rgba(247,230,165,0.14)',
  },
  designRoleLivestock: {
    backgroundColor: 'rgba(255,177,122,0.18)',
  },
  designRoleResource: {
    backgroundColor: 'rgba(180,220,227,0.16)',
  },
  designRoleText: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  designRoleHint: {
    flex: 1,
    marginLeft: 6,
    color: 'rgba(255,242,187,0.72)',
    fontFamily: fonts.ui.regular,
    fontSize: 9,
  },
  layoutFitRow: {
    minHeight: 19,
    marginTop: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  layoutFitLead: {
    color: 'rgba(255,242,187,0.54)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  layoutFitPill: {
    minHeight: 16,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(190,224,142,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(190,224,142,0.26)',
    justifyContent: 'center',
  },
  layoutFitText: {
    color: '#e0f0b2',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  factGrid: {
    marginTop: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  factPill: {
    maxWidth: '48%',
    minHeight: 20,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(247,230,165,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.24)',
    justifyContent: 'center',
  },
  factText: {
    color: 'rgba(255,242,187,0.84)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
});
