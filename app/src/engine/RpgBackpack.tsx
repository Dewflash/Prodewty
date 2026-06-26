import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import {
  getCropForSeed,
  getPlaceableItem,
  getRpgItem,
  RPG_SOURCE_PACK_FILTERS,
  RPG_UI_FRAMES,
  type RpgDrop,
  type RpgItemDefinition,
  type RpgSourcePackId,
} from './RpgObjectCatalog';
import { RpgItemIcon, RpgSpriteFrameView } from './RpgItemIcon';

type InventoryRow = {
  item_id: string;
  quantity: number;
};

type InventorySlot = InventoryRow & {
  item: RpgItemDefinition | null;
};

type BackpackFilter = 'all' | 'object' | 'seed' | 'resource';
type BackpackSort = 'kind' | 'name' | 'quantity';

type Props = {
  isOpen: boolean;
  refreshKey: number;
  canPlace: boolean;
  onClose: () => void;
  onPlaceItem: (itemId: string) => void;
  onPlantSeed: (itemId: string) => void;
};

const SLOT_COUNT = 12;
const FILTERS: { id: BackpackFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'object', label: 'Objects' },
  { id: 'seed', label: 'Seeds' },
  { id: 'resource', label: 'Resources' },
];
const SORTS: { id: BackpackSort; label: string }[] = [
  { id: 'kind', label: 'Kind' },
  { id: 'name', label: 'Name' },
  { id: 'quantity', label: 'Qty' },
];

function getKindRank(item: RpgItemDefinition | null) {
  if (!item) return 99;
  if (item.kind === 'object') return 0;
  if (item.kind === 'seed') return 1;
  return 2;
}

function formatDrop(drop: RpgDrop) {
  const item = getRpgItem(drop.itemId);
  const amount = drop.min === drop.max ? `x${drop.min}` : `x${drop.min}-${drop.max}`;
  return `${Math.round(drop.chance * 100)}% ${item?.name ?? drop.itemId} ${amount}`;
}

function backpackSlotMatchesQuery(slot: InventorySlot, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const item = slot.item;
  return [
    slot.item_id,
    item?.name,
    item?.kind,
    item?.sourceLabel,
    item?.description,
    item?.rarity,
    ...(item?.tags ?? []),
  ].some(value => value?.toLowerCase().includes(normalized));
}

function backpackSlotMatchesSource(slot: InventorySlot, source: RpgSourcePackId) {
  if (source === 'all') return true;
  const sourceFilter = RPG_SOURCE_PACK_FILTERS.find(item => item.id === source);
  return !!sourceFilter?.sourceLabel && slot.item?.sourceLabel === sourceFilter.sourceLabel;
}

function sortBackpackSlots(a: InventorySlot, b: InventorySlot, sort: BackpackSort) {
  if (sort === 'quantity') {
    return b.quantity - a.quantity || (a.item?.name ?? a.item_id).localeCompare(b.item?.name ?? b.item_id);
  }
  if (sort === 'name') {
    return (a.item?.name ?? a.item_id).localeCompare(b.item?.name ?? b.item_id);
  }
  return (
    getKindRank(a.item) - getKindRank(b.item) ||
    (a.item?.name ?? a.item_id).localeCompare(b.item?.name ?? b.item_id)
  );
}

export function RpgBackpack({ isOpen, refreshKey, canPlace, onClose, onPlaceItem, onPlantSeed }: Props) {
  const { width, height } = useWindowDimensions();
  const [inventory, setInventory] = useState<InventorySlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<BackpackFilter>('all');
  const [source, setSource] = useState<RpgSourcePackId>('all');
  const [sort, setSort] = useState<BackpackSort>('kind');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    try {
      const rows = db.getAllSync<InventoryRow>(
        'SELECT item_id, quantity FROM user_inventory WHERE quantity > 0 ORDER BY item_id ASC',
      );
      const nextInventory = rows
        .map(row => ({ ...row, item: getRpgItem(row.item_id) }))
        .sort((a, b) => (
          getKindRank(a.item) - getKindRank(b.item) ||
          (a.item?.name ?? a.item_id).localeCompare(b.item?.name ?? b.item_id)
        ));
      setInventory(nextInventory);
      setSelectedId(current => (
        current && nextInventory.some(row => row.item_id === current)
          ? current
          : nextInventory[0]?.item_id ?? null
      ));
    } catch (e) {
      console.warn('Failed to load backpack inventory', e);
      setInventory([]);
      setSelectedId(null);
    }
  }, [isOpen, refreshKey]);

  const filteredInventory = useMemo(
    () => inventory
      .filter(slot => (
        (filter === 'all' || slot.item?.kind === filter) &&
        backpackSlotMatchesSource(slot, source) &&
        backpackSlotMatchesQuery(slot, query)
      ))
      .sort((a, b) => sortBackpackSlots(a, b, sort)),
    [filter, inventory, query, sort, source],
  );

  const filterCounts = useMemo(() => ({
    all: inventory.length,
    object: inventory.filter(slot => slot.item?.kind === 'object').length,
    seed: inventory.filter(slot => slot.item?.kind === 'seed').length,
    resource: inventory.filter(slot => slot.item?.kind === 'resource').length,
  }), [inventory]);

  useEffect(() => {
    if (!isOpen) return;
    const maxPage = Math.max(0, Math.ceil(filteredInventory.length / SLOT_COUNT) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredInventory.length, isOpen, page]);

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setSelectedId(current => (
      current && filteredInventory.some(row => row.item_id === current)
        ? current
        : filteredInventory[0]?.item_id ?? null
    ));
  }, [filter, filteredInventory, isOpen, query, sort, source]);

  const pageItems = useMemo(
    () => filteredInventory.slice(page * SLOT_COUNT, page * SLOT_COUNT + SLOT_COUNT),
    [filteredInventory, page],
  );

  if (!isOpen) return null;

  const selected = filteredInventory.find(row => row.item_id === selectedId) ?? null;
  const selectedItem = selected?.item ?? null;
  const hasFilteredItems = filteredInventory.length > 0;
  const selectedName = selectedItem?.name ?? selected?.item_id ?? (hasFilteredItems ? 'Empty' : 'No items');
  const selectedDescription = selectedItem?.description ?? (
    selected ? 'No description yet.' : (
      inventory.length > 0 ? 'Nothing in this category yet.' : 'Collected items appear here.'
    )
  );
  const selectedPlaceable = getPlaceableItem(selected?.item_id ?? null);
  const selectedSeedCrop = selectedItem?.kind === 'seed' ? getCropForSeed(selected?.item_id ?? null) : null;
  const selectedFacts = [
    selectedItem?.sourceLabel ? `Source: ${selectedItem.sourceLabel}` : null,
    selectedPlaceable ? `Price: ${selectedPlaceable.price}` : null,
    selectedPlaceable ? `Footprint: ${selectedPlaceable.colWidth}x${selectedPlaceable.colHeight}` : null,
    selectedPlaceable?.forageDrops?.length ? `Forage: ${selectedPlaceable.forageDrops.map(formatDrop).join(', ')}` : null,
    selectedSeedCrop ? `Harvest: ${selectedSeedCrop.harvest.coins} coins` : null,
    selectedSeedCrop ? `Mature: ${selectedSeedCrop.stageMinutes[2]} min` : null,
    selectedSeedCrop?.harvest.drops.length ? `Yield: ${selectedSeedCrop.harvest.drops.map(formatDrop).join(', ')}` : null,
  ].filter((fact): fact is string => !!fact);
  const maxPage = Math.max(0, Math.ceil(filteredInventory.length / SLOT_COUNT) - 1);
  const panelWidth = Math.min(width - 24, 430);
  const panelMaxHeight = Math.min(height - 60, 720);
  const slotWidthSize = Math.floor((panelWidth - 52) / 4);
  const slotHeightSize = Math.floor((panelMaxHeight - 356) / 3);
  const slotSize = Math.min(70, Math.max(50, Math.min(slotWidthSize, slotHeightSize)));

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.backpackStack, { width: panelWidth, maxHeight: panelMaxHeight }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={styles.headerIcon}>
              <RpgSpriteFrameView frame={RPG_UI_FRAMES.backpack} size={22} />
            </View>
            <View>
              <Text style={styles.title}>Backpack</Text>
              <Text style={styles.subtitle}>Showing {filteredInventory.length} of {inventory.length} stacks</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close backpack" onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color="#fff2bb" />
          </Pressable>
        </View>

        <View style={styles.filterBar}>
          {FILTERS.map(item => {
            const count = filterCounts[item.id];
            const isActive = filter === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} inventory filter`}
                onPress={() => setFilter(item.id)}
                style={[styles.filterButton, isActive && styles.activeFilterButton]}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{item.label}</Text>
                <Text style={[styles.filterCount, isActive && styles.activeFilterText]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sourceBar}>
          {RPG_SOURCE_PACK_FILTERS.map(item => {
            const active = source === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} backpack source`}
                onPress={() => setSource(item.id)}
                style={[styles.sourceButton, active && styles.activeSourceButton]}
              >
                <Text style={[styles.sourceText, active && styles.activeSourceText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={13} color="rgba(255,242,187,0.72)" />
          <TextInput
            accessibilityLabel="Search backpack"
            value={query}
            onChangeText={setQuery}
            placeholder="Search backpack"
            placeholderTextColor="rgba(255,242,187,0.44)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear backpack search" onPress={() => setQuery('')} style={styles.clearSearchButton}>
              <Feather name="x" size={13} color="#fff2bb" />
            </Pressable>
          )}
        </View>

        <View style={styles.sortBar}>
          {SORTS.map(item => {
            const isActive = sort === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Sort backpack by ${item.label}`}
                onPress={() => setSort(item.id)}
                style={[styles.sortButton, isActive && styles.activeSortButton]}
              >
                <Text style={[styles.sortText, isActive && styles.activeSortText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inventoryGrid}>
          {Array.from({ length: SLOT_COUNT }).map((_, index) => {
            const slot = pageItems[index] ?? null;
            const isSelected = slot?.item_id === selectedId;
            return (
              <Pressable
                key={`${filter}-${page}-${index}-${slot?.item_id ?? 'empty'}`}
                accessibilityRole="button"
                accessibilityLabel={slot ? `${slot.item?.name ?? slot.item_id}, ${slot.quantity}` : 'Empty slot'}
                disabled={!slot}
                onPress={() => slot && setSelectedId(slot.item_id)}
                style={[
                  styles.inventorySlot,
                  { width: slotSize, height: slotSize },
                  isSelected && styles.selectedSlot,
                ]}
              >
                {slot && (
                  <>
                    <RpgItemIcon item={slot.item} size={Math.floor(slotSize * 0.72)} fallbackLabel={slot.item_id} />
                    <View style={styles.quantityPill}>
                      <Text style={styles.quantityText}>{slot.quantity}</Text>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {maxPage > 0 && (
          <View style={styles.pageControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous backpack page"
              disabled={page === 0}
              onPress={() => setPage(current => Math.max(0, current - 1))}
              style={[styles.pageButton, page === 0 && styles.pageDisabled]}
            >
              <Feather name="chevron-left" size={18} color="#f7e6a5" />
            </Pressable>
            <Text style={styles.pageText}>{page + 1}/{maxPage + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next backpack page"
              disabled={page >= maxPage}
              onPress={() => setPage(current => Math.min(maxPage, current + 1))}
              style={[styles.pageButton, page >= maxPage && styles.pageDisabled]}
            >
              <Feather name="chevron-right" size={18} color="#f7e6a5" />
            </Pressable>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.detailHeader}>
            <Text numberOfLines={1} style={styles.detailName}>{selectedName}</Text>
            {selected && <Text style={styles.detailCount}>x{selected.quantity}</Text>}
          </View>
          <Text numberOfLines={2} style={styles.detailDescription}>{selectedDescription}</Text>
          {selectedFacts.length > 0 && (
            <View style={styles.factGrid}>
              {selectedFacts.slice(0, 4).map(fact => (
                <View key={fact} style={styles.factPill}>
                  <Text numberOfLines={1} style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </View>
          )}
          {selectedPlaceable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Place ${selectedName}`}
              disabled={!canPlace}
              onPress={() => selected && onPlaceItem(selected.item_id)}
              style={[styles.placeButton, !canPlace && styles.disabledButton]}
            >
              <Feather name="plus-square" size={14} color="#fff" />
              <Text style={styles.placeText}>{canPlace ? 'Place' : 'Sanctuary only'}</Text>
            </Pressable>
          ) : selectedSeedCrop ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Plant ${selectedName}`}
              disabled={!canPlace}
              onPress={() => selected && onPlantSeed(selected.item_id)}
              style={[styles.placeButton, !canPlace && styles.disabledButton]}
            >
              <Feather name="map-pin" size={14} color="#fff" />
              <Text style={styles.placeText}>{canPlace ? 'Plant' : 'Sanctuary only'}</Text>
            </Pressable>
          ) : selectedItem?.kind === 'seed' ? (
            <Text style={styles.kindText}>Seed not plantable yet</Text>
          ) : selected ? (
            <Text style={styles.kindText}>Resource</Text>
          ) : (
            <Text style={styles.kindText}>{inventory.length > 0 ? 'No matches' : 'Backpack empty'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  backpackStack: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(32,22,17,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.34)',
  },
  headerRow: {
    minHeight: 36,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 34,
    height: 34,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 18,
  },
  subtitle: {
    marginTop: 1,
    color: 'rgba(255,242,187,0.64)',
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    width: '100%',
    minHeight: 36,
    marginBottom: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(32,22,17,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.26)',
    flexDirection: 'row',
  },
  filterButton: {
    flex: 1,
    minHeight: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: 'rgba(247,230,165,0.17)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.42)',
  },
  filterText: {
    color: 'rgba(247,230,165,0.7)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  activeFilterText: {
    color: '#fff2bb',
  },
  filterCount: {
    color: 'rgba(247,230,165,0.56)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
    marginTop: 1,
  },
  sourceBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 8,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.18)',
    flexDirection: 'row',
  },
  sourceButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSourceButton: {
    backgroundColor: 'rgba(247,230,165,0.16)',
  },
  sourceText: {
    color: 'rgba(247,230,165,0.64)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  activeSourceText: {
    color: '#fff2bb',
  },
  searchRow: {
    minHeight: 34,
    marginBottom: 8,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.24)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBar: {
    minHeight: 30,
    marginBottom: 8,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.18)',
    flexDirection: 'row',
  },
  sortButton: {
    flex: 1,
    minHeight: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSortButton: {
    backgroundColor: 'rgba(247,230,165,0.16)',
  },
  sortText: {
    color: 'rgba(247,230,165,0.64)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  activeSortText: {
    color: '#fff2bb',
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inventorySlot: {
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSlot: {
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  quantityPill: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(30,19,14,0.92)',
    borderWidth: 1,
    borderColor: '#f7e6a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  pageButton: {
    width: 42,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDisabled: {
    opacity: 0.35,
  },
  pageControls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: {
    minWidth: 42,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    textAlign: 'center',
  },
  details: {
    minHeight: 136,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(38,25,18,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.38)',
  },
  detailHeader: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailName: {
    flex: 1,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  detailCount: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginLeft: 6,
  },
  detailDescription: {
    color: '#eadca8',
    fontFamily: fonts.ui.regular,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
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
    borderColor: 'rgba(247,230,165,0.25)',
    justifyContent: 'center',
  },
  factText: {
    color: 'rgba(255,242,187,0.82)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  placeButton: {
    width: '100%',
    minHeight: 34,
    marginTop: 8,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: '#3b8d43',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.45,
  },
  placeText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  kindText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginTop: 5,
  },
});
