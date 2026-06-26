import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import { getRpgDiscoveries, type RpgDiscoveryRow } from '../db/rpgDiscovery';
import {
  getRpgArchiveEntries,
  SHOP_CATALOG,
  type RpgArchiveCategory,
  type RpgArchiveEntry,
  type RpgItemRarity,
} from './RpgObjectCatalog';
import { getRpgAsset, RPG_ARCHIVE_FRAMES, type RpgAssetDefinition } from './RpgAssetRegistry';
import { RpgSpriteFrameView } from './RpgItemIcon';

type CountRow = {
  item_id: string;
  quantity: number;
};

type ArchiveFilter = 'all' | RpgArchiveCategory;
type ArchiveScope = 'all' | 'discovered' | 'known' | 'locked';
type ArchiveSort = 'name' | 'rarity' | 'status';
type ArchiveSource = 'all' | 'forest' | 'crystal' | 'bush' | 'cave';

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
const ARCHIVE_SOURCE_FILTERS: { id: ArchiveSource; label: string; sourceLabel?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'forest', label: 'Forest', sourceLabel: 'Forest Archive' },
  { id: 'crystal', label: 'Crystal', sourceLabel: 'Crystal Archive' },
  { id: 'bush', label: 'Bush', sourceLabel: 'Bush Archive' },
  { id: 'cave', label: 'Cave', sourceLabel: 'Cave Archive' },
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
  { x: 38, y: 102 },
  { x: 38, y: 140 },
  { x: 38, y: 178 },
  { x: 150, y: 102 },
  { x: 150, y: 140 },
  { x: 150, y: 178 },
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
  if (entry.discovered) {
    if (entry.quantity > 0 && entry.placed > 0) return `Own ${entry.quantity} / Map ${entry.placed}`;
    if (entry.quantity > 0) return `Owned ${entry.quantity}`;
    if (entry.placed > 0) return `Placed ${entry.placed}`;
    return 'Discovered';
  }
  if (entry.known) return 'Known';
  return 'Locked';
}

function archiveScopeMatches(entry: ArchiveEntryState, scope: ArchiveScope) {
  if (scope === 'all') return true;
  if (scope === 'discovered') return entry.discovered;
  if (scope === 'known') return !entry.discovered && entry.known;
  return !entry.discovered && !entry.known;
}

function archiveSourceMatches(entry: ArchiveEntryState, source: ArchiveSource) {
  if (source === 'all') return true;
  const sourceFilter = ARCHIVE_SOURCE_FILTERS.find(item => item.id === source);
  return !!sourceFilter?.sourceLabel && entry.sourceLabel === sourceFilter.sourceLabel;
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
  if (entry.discovered) return 0;
  if (entry.known) return 1;
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

function ArchiveItemArt({ asset, discovered, known }: {
  asset: RpgAssetDefinition | null;
  discovered: boolean;
  known: boolean;
}) {
  const opacity = discovered ? 1 : known ? 0.52 : 0.26;

  if (asset?.frame) {
    return (
      <View style={{ opacity }}>
        <RpgSpriteFrameView frame={asset.frame} size={24} />
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
  const [source, setSource] = useState<ArchiveSource>('all');
  const [scope, setScope] = useState<ArchiveScope>('all');
  const [sort, setSort] = useState<ArchiveSort>('name');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<ArchiveEntryState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scale = Math.max(
    1.05,
    Math.min(1.55, (width - 24) / RPG_ARCHIVE_FRAMES.openBook.width, (height - 336) / RPG_ARCHIVE_FRAMES.openBook.height),
  );
  const bookWidth = RPG_ARCHIVE_FRAMES.openBook.width * scale;
  const bookHeight = RPG_ARCHIVE_FRAMES.openBook.height * scale;

  useEffect(() => {
    if (!isOpen) return;
    try {
      const counts = loadCounts();
      const knownShopItems = new Set(Object.keys(SHOP_CATALOG));
      const nextEntries = getRpgArchiveEntries().map(entry => {
        const quantity = counts.inventory[entry.itemId] ?? 0;
        const placed = counts.placed[entry.itemId] ?? 0;
        const discovery = counts.discoveries[entry.itemId] ?? null;
        const known = knownShopItems.has(entry.itemId);
        return {
          ...entry,
          quantity,
          placed,
          known,
          discovered: !!discovery || quantity > 0 || placed > 0,
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
    [entries, filter, query, scope, sort, source],
  );
  const archiveCounts = useMemo(() => ({
    total: entries.length,
    discovered: entries.filter(entry => entry.discovered).length,
    known: entries.filter(entry => !entry.discovered && entry.known).length,
    locked: entries.filter(entry => !entry.discovered && !entry.known).length,
  }), [entries]);
  const maxPage = Math.max(0, Math.ceil(filteredEntries.length / PAGE_SIZE) - 1);
  const pageEntries = filteredEntries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = filteredEntries.find(entry => entry.itemId === selectedId) ?? pageEntries[0] ?? null;

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setSelectedId(current => (
      current && filteredEntries.some(entry => entry.itemId === current)
        ? current
        : filteredEntries[0]?.itemId ?? null
    ));
  }, [filter, filteredEntries, isOpen, query, scope, sort, source]);

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
          {ARCHIVE_SOURCE_FILTERS.map(item => {
            const active = source === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} archive source`}
                onPress={() => setSource(item.id)}
                style={[styles.sourceButton, active && styles.sourceButtonActive]}
              >
                <Text style={[styles.sourceText, active && styles.sourceTextActive]}>{item.label}</Text>
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
                accessibilityLabel={`${entry.name}, ${archiveStatusLabel(entry)}`}
                onPress={() => setSelectedId(entry.itemId)}
                style={[
                  styles.entrySlot,
                  selectedEntry && styles.entrySlotSelected,
                  {
                    left: slot.x * scale,
                    top: slot.y * scale,
                    width: 84 * scale,
                    height: 30 * scale,
                  },
                ]}
              >
                <ArchiveItemArt asset={entry.asset} discovered={entry.discovered} known={entry.known} />
                <View style={styles.entryTextBlock}>
                  <Text numberOfLines={1} style={styles.entryName}>{entry.name}</Text>
                  <Text numberOfLines={1} style={styles.entryStatus}>{archiveStatusLabel(entry)}</Text>
                </View>
              </Pressable>
            );
          })}

          {pageEntries.length === 0 && (
            <View style={[styles.emptyBookState, { left: 50 * scale, top: 132 * scale, width: 172 * scale }]}>
              <Feather name="search" size={15} color="#6a4328" />
              <Text style={styles.emptyBookText}>No entries here</Text>
            </View>
          )}

          {maxPage > 0 && (
            <View style={[styles.pageControls, { left: 95 * scale, bottom: 38 * scale }]}>
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
            <Text numberOfLines={1} style={styles.detailTitle}>{selected?.name ?? 'Archive'}</Text>
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
          {selected && (selected.discovered || selected.known) && selected.facts.length > 0 && (
            <View style={styles.factGrid}>
              {selected.facts.slice(0, 4).map(fact => (
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
    width: 25,
    height: 25,
  },
  lockIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
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
    marginLeft: 4,
  },
  entryName: {
    color: '#3f2619',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  entryStatus: {
    color: '#775338',
    fontFamily: fonts.ui.regular,
    fontSize: 7,
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
    minHeight: 96,
    marginTop: -6,
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
