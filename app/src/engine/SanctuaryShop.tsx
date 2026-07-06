import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import {
  countSanctuaryLayoutSets,
  countRpgSourcePacks,
  getPlaceableItem,
  getSanctuaryDesignRole,
  getSanctuaryLayoutFitLabels,
  itemMatchesSanctuaryLayoutSet,
  RPG_SOURCE_PACK_FILTERS,
  SANCTUARY_LAYOUT_SET_FILTERS,
  SHOP_CATALOG,
  type RpgItemRarity,
  type RpgSourcePackId,
  type SanctuaryLayoutSetId,
  type ShopCatalogItem,
} from './RpgObjectCatalog';
import { RpgItemIcon } from './RpgItemIcon';
import { SanctuaryFootprintPreview } from './SanctuaryFootprintPreview';
import { SanctuaryTerrainPaintPreview } from './SanctuaryTerrainPaintPreview';
import { getDecodedBlueprintIds, STATION_BLUEPRINT } from '../db/research';

type OwnedRow = {
  item_id: string;
  quantity: number;
};

type ShopFilter = 'all' | 'tree' | 'mushroom' | 'structure' | 'crystal' | 'bush' | 'cactus' | 'cave' | 'mechanism' | 'animal' | 'building' | 'material';
type ShopSort = 'name' | 'rarity' | 'price';

interface Props {
  isOpen: boolean;
  coins: number;
  refreshKey: number;
  canPlace?: boolean;
  onClose: () => void;
  onPurchaseRequest: (itemId: string, price: number) => ShopPurchaseResult;
  onPurchaseAndPlaceRequest?: (itemId: string, price: number) => ShopPurchaseResult;
}

export type ShopPurchaseResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const SHOP_PANEL_CAPACITY = 4;
const SHOP_FILTERS: { id: ShopFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tree', label: 'Trees' },
  { id: 'mushroom', label: 'Mushrooms' },
  { id: 'structure', label: 'Relics' },
  { id: 'crystal', label: 'Crystals' },
  { id: 'bush', label: 'Bushes' },
  { id: 'cactus', label: 'Cacti' },
  { id: 'cave', label: 'Cave' },
  { id: 'mechanism', label: 'Mechanisms' },
  { id: 'animal', label: 'Animals' },
  { id: 'building', label: 'Buildings' },
  { id: 'material', label: 'Materials' },
];
const SHOP_SORTS: { id: ShopSort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'price', label: 'Price' },
];
function matchesShopFilter(tags: string[] | undefined, filter: ShopFilter) {
  if (filter === 'all') return true;
  if (filter === 'structure') {
    return !!tags?.some(tag => tag === 'structure' || tag === 'idol' || tag === 'ent');
  }
  if (filter === 'mechanism') {
    return !!tags?.some(tag => ['mechanism', 'lever', 'gate', 'trap', 'hazard'].includes(tag));
  }
  if (filter === 'building') {
    return !!tags?.some(tag => tag === 'building' || tag === 'station');
  }
  return !!tags?.includes(filter);
}

function mechanismRank(tags: string[] | undefined) {
  if (tags?.includes('lever')) return 0;
  if (tags?.includes('gate')) return 1;
  if (tags?.some(tag => tag === 'trap' || tag === 'hazard')) return 2;
  if (tags?.includes('mechanism')) return 3;
  return 9;
}

function mechanismHint(item: ShopCatalogItem | undefined) {
  const tags = item?.tags ?? [];
  if (tags.includes('lever')) return 'Mechanism: toggles nearest gate/trap';
  if (tags.includes('gate')) return 'Mechanism: blocks movement until opened';
  if (tags.some(tag => tag === 'trap' || tag === 'hazard')) return 'Mechanism: can be disarmed';
  if (tags.includes('mechanism')) return 'Mechanism: links with nearby objects';
  return null;
}

function matchesShopSource(item: ShopCatalogItem, source: RpgSourcePackId) {
  if (source === 'all') return true;
  const sourceFilter = RPG_SOURCE_PACK_FILTERS.find(filter => filter.id === source);
  return !!sourceFilter?.sourceLabel && item.sourceLabel === sourceFilter.sourceLabel;
}

function shopEntryMatchesQuery(id: string, item: ShopCatalogItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    id,
    item.name,
    item.description,
    item.rarity,
    item.sourceLabel,
    ...(item.tags ?? []),
  ].some(value => value?.toLowerCase().includes(normalized));
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

export function SanctuaryShop({ isOpen, coins, refreshKey, canPlace = false, onClose, onPurchaseRequest, onPurchaseAndPlaceRequest }: Props) {
  const { width, height } = useWindowDimensions();
  const [ownedCounts, setOwnedCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<ShopFilter>('all');
  const [sort, setSort] = useState<ShopSort>('name');
  const [source, setSource] = useState<RpgSourcePackId>('all');
  const [layoutSet, setLayoutSet] = useState<SanctuaryLayoutSetId>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<ShopPurchaseResult | null>(null);

  // Blueprint-gated stations (fertiliser_mixer/irrigation_bench/vendor_stall)
  // only appear once their blueprint is decoded at the Library (lattice D7).
  // Recomputed on open/refresh so a fresh decode surfaces the station.
  const decodedStations = useMemo(() => getDecodedBlueprintIds(), [isOpen, refreshKey]);
  const shopEntries = useMemo(
    () => Object.entries(SHOP_CATALOG).filter(([id]) => {
      const blueprintId = STATION_BLUEPRINT[id];
      return !blueprintId || decodedStations.has(blueprintId);
    }),
    [decodedStations],
  );
  const sourceCounts = useMemo(
    () => countRpgSourcePacks(shopEntries, ([, item]) => item.sourceLabel),
    [shopEntries],
  );
  const layoutSetCounts = useMemo(
    () => countSanctuaryLayoutSets(shopEntries, ([, item]) => item),
    [shopEntries],
  );
  const filteredShopEntries = useMemo(
    () => shopEntries
      .filter(([id, item]) => (
        matchesShopFilter(item.tags, filter) &&
        matchesShopSource(item, source) &&
        itemMatchesSanctuaryLayoutSet(item, layoutSet) &&
        shopEntryMatchesQuery(id, item, query)
      ))
      .sort(([, a], [, b]) => {
        if (filter === 'mechanism') {
          return mechanismRank(a.tags) - mechanismRank(b.tags) || a.name.localeCompare(b.name);
        }
        if (sort === 'rarity') {
          return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name);
        }
        if (sort === 'price') {
          return a.price - b.price || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      }),
    [filter, layoutSet, query, shopEntries, sort, source],
  );
  const maxPage = Math.max(0, Math.ceil(filteredShopEntries.length / SHOP_PANEL_CAPACITY) - 1);
  const visibleShopEntries = useMemo(
    () => filteredShopEntries.slice(page * SHOP_PANEL_CAPACITY, page * SHOP_PANEL_CAPACITY + SHOP_PANEL_CAPACITY),
    [filteredShopEntries, page],
  );
  const selectedEntry = visibleShopEntries.find(([id]) => id === selectedId) ?? visibleShopEntries[0] ?? null;
  const selectedName = selectedEntry?.[1].name ?? 'Shop';
  const selectedPrice = selectedEntry?.[1].price ?? 0;
  const selectedOwned = selectedEntry ? ownedCounts[selectedEntry[0]] ?? 0 : 0;
  const selectedShortfall = Math.max(0, selectedPrice - coins);
  const panelWidth = Math.min(width - 24, 430);
  const panelMaxHeight = Math.min(height - 60, 710);
  const selectedCanBuy = !!selectedEntry && selectedShortfall === 0;
  const selectedMechanismHint = mechanismHint(selectedEntry?.[1]);
  const selectedDesignRole = getSanctuaryDesignRole(selectedEntry?.[1]);
  const selectedLayoutFits = getSanctuaryLayoutFitLabels(selectedEntry?.[1]);
  const selectedDirectPlaceable = selectedEntry ? getPlaceableItem(selectedEntry[0]) : null;
  const selectedCanBuyAndPlace = selectedCanBuy && canPlace && !!selectedDirectPlaceable && !!onPurchaseAndPlaceRequest;

  const loadOwnedCounts = useCallback(() => {
    try {
      const rows = db.getAllSync<OwnedRow>('SELECT item_id, quantity FROM user_inventory WHERE quantity > 0');
      setOwnedCounts(Object.fromEntries(rows.map(row => [row.item_id, row.quantity])));
    } catch (e) {
      console.warn('Failed to load shop owned counts', e);
      setOwnedCounts({});
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(current => (
      filteredShopEntries.some(([id]) => id === current)
        ? current
        : filteredShopEntries[0]?.[0] ?? null
    ));
    loadOwnedCounts();
  }, [filteredShopEntries, isOpen, loadOwnedCounts, refreshKey]);

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setNotice(null);
  }, [filter, isOpen, layoutSet, query, sort, source]);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(current => (
      visibleShopEntries.some(([id]) => id === current)
        ? current
        : visibleShopEntries[0]?.[0] ?? null
    ));
  }, [isOpen, visibleShopEntries]);

  if (!isOpen) return null;

  const tryPurchase = (itemId: string, price: number) => {
    setSelectedId(itemId);
    const result = onPurchaseRequest(itemId, price);
    setNotice(result);
    if (result.ok) {
      setOwnedCounts(current => ({
        ...current,
        [itemId]: (current[itemId] ?? 0) + 1,
      }));
      loadOwnedCounts();
    }
  };

  const tryPurchaseAndPlace = (itemId: string, price: number) => {
    if (!onPurchaseAndPlaceRequest) return;
    setSelectedId(itemId);
    const result = onPurchaseAndPlaceRequest(itemId, price);
    setNotice(result);
    if (result.ok) {
      setOwnedCounts(current => ({
        ...current,
        [itemId]: (current[itemId] ?? 0) + 1,
      }));
      loadOwnedCounts();
    }
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.shopStack, { width: panelWidth, maxHeight: panelMaxHeight }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Shop</Text>
            <Text style={styles.subtitle}>Showing {filteredShopEntries.length} of {shopEntries.length} items</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close shop" onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color="#fff2bb" />
          </Pressable>
        </View>

        <View style={styles.filterBar}>
          {SHOP_FILTERS.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} shop filter`}
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
                accessibilityLabel={`${item.label} shop source`}
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
                accessibilityLabel={`${item.label} layout filter`}
                onPress={() => setLayoutSet(item.id)}
                style={[styles.layoutButton, active && styles.layoutButtonActive]}
              >
                <Text style={[styles.layoutText, active && styles.layoutTextActive]}>{item.label}</Text>
                <Text style={[styles.layoutCount, active && styles.layoutTextActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={13} color="rgba(255,242,187,0.72)" />
          <TextInput
            accessibilityLabel="Search shop"
            value={query}
            onChangeText={setQuery}
            placeholder="Search shop"
            placeholderTextColor="rgba(255,242,187,0.44)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear shop search" onPress={() => setQuery('')} style={styles.clearSearchButton}>
              <Feather name="x" size={13} color="#fff2bb" />
            </Pressable>
          )}
        </View>

        <View style={styles.sortBar}>
          {SHOP_SORTS.map(item => {
            const active = sort === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Sort shop by ${item.label}`}
                onPress={() => setSort(item.id)}
                style={[styles.sortButton, active && styles.sortButtonActive]}
              >
                <Text style={[styles.sortText, active && styles.sortTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.grid}>
          {visibleShopEntries.length === 0 ? (
            <View style={styles.emptyShop}>
              <Feather name="search" size={18} color="rgba(255,242,187,0.7)" />
              <Text style={styles.emptyShopText}>No matches</Text>
            </View>
          ) : visibleShopEntries.map(([id, item]) => {
            const owned = ownedCounts[id] ?? 0;
            const isSelected = id === selectedId;
            const cardDesignRole = getSanctuaryDesignRole(item);
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}, owned ${owned}, price ${item.price}`}
                onPress={() => {
                  setSelectedId(id);
                  setNotice(null);
                }}
                style={[
                  styles.itemCard,
                  { borderColor: rarityColor(item.rarity) },
                  isSelected && styles.selectedItem,
                ]}
              >
                <View style={styles.itemArtBox}>
                  <RpgItemIcon item={item} itemId={id} size={82} fallbackLabel={id} />
                  {owned > 0 && (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>{owned}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.cardName}>{item.name}</Text>
                <Text numberOfLines={1} style={[styles.rarityText, { color: rarityColor(item.rarity) }]}>
                  {item.rarity ?? 'common'}
                </Text>
                {cardDesignRole && (
                  <View style={[
                    styles.cardRolePill,
                    cardDesignRole.tone === 'nature' && styles.cardRoleNature,
                    cardDesignRole.tone === 'farm' && styles.cardRoleFarm,
                    cardDesignRole.tone === 'ruin' && styles.cardRoleRuin,
                    cardDesignRole.tone === 'utility' && styles.cardRoleUtility,
                    cardDesignRole.tone === 'livestock' && styles.cardRoleLivestock,
                    cardDesignRole.tone === 'resource' && styles.cardRoleResource,
                  ]}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.cardRoleText}>{cardDesignRole.label}</Text>
                  </View>
                )}
                <View style={styles.pricePill}>
                  <Feather name="circle" size={9} color="#f1c40f" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.priceText}>{item.price}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {maxPage > 0 && (
          <View style={styles.pageControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous shop page"
              disabled={page === 0}
              onPress={() => setPage(current => Math.max(0, current - 1))}
              style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
            >
              <Feather name="chevron-left" size={18} color="#fff2bb" />
            </Pressable>
            <Text style={styles.pageText}>{page + 1}/{maxPage + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next shop page"
              disabled={page >= maxPage}
              onPress={() => setPage(current => Math.min(maxPage, current + 1))}
              style={[styles.pageButton, page >= maxPage && styles.pageButtonDisabled]}
            >
              <Feather name="chevron-right" size={18} color="#fff2bb" />
            </Pressable>
          </View>
        )}

        <View style={styles.detailBar}>
          <View style={styles.detailTopRow}>
            <View style={styles.detailTextBlock}>
              <Text numberOfLines={1} style={styles.itemName}>{selectedName}</Text>
              <Text numberOfLines={1} style={styles.itemMeta}>
                Owned {selectedOwned}  Price {selectedPrice}  {selectedEntry?.[1].sourceLabel ?? 'Sanctuary'}
              </Text>
              {selectedMechanismHint && (
                <Text numberOfLines={1} style={styles.mechanismHint}>{selectedMechanismHint}</Text>
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
              {selectedEntry && (
                <SanctuaryFootprintPreview
                  colWidth={selectedEntry[1].colWidth}
                  colHeight={selectedEntry[1].colHeight}
                />
              )}
              {selectedEntry && <SanctuaryTerrainPaintPreview itemId={selectedEntry[0]} />}
            </View>
            {selectedEntry && (
              <View style={[styles.rarityBadge, { borderColor: rarityColor(selectedEntry[1].rarity) }]}>
                <Text style={[styles.rarityBadgeText, { color: rarityColor(selectedEntry[1].rarity) }]}>
                  {selectedEntry[1].rarity ?? 'common'}
                </Text>
              </View>
            )}
            <View style={[styles.coinState, selectedShortfall > 0 && styles.coinStateWarn]}>
              <Feather name="circle" size={12} color={selectedShortfall > 0 ? '#ffb0a8' : '#f1c40f'} />
              <Text style={[styles.coinStateText, selectedShortfall > 0 && styles.coinStateWarnText]}>
                {selectedShortfall > 0 ? `Need ${selectedShortfall}` : `${coins}`}
              </Text>
            </View>
          </View>
          <View style={styles.buyButtonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selectedEntry ? `Buy ${selectedName}` : 'No shop item selected'}
              disabled={!selectedEntry}
              onPress={() => selectedEntry && tryPurchase(selectedEntry[0], selectedEntry[1].price)}
              style={[
                styles.buyButton,
                !selectedEntry && styles.buyDisabled,
                selectedEntry && !selectedCanBuy && styles.buyWarn,
                selectedCanBuyAndPlace && styles.buyButtonSplit,
              ]}
            >
              <Feather name="shopping-bag" size={15} color={selectedCanBuy ? '#13351f' : '#fff2bb'} />
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.buyPrice, !selectedCanBuy && styles.buyPriceWarn]}>
                {selectedCanBuy ? `Buy ${selectedPrice}` : selectedEntry ? `Need ${selectedShortfall}` : 'No item'}
              </Text>
            </Pressable>
            {selectedDirectPlaceable && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selectedEntry ? `Buy and place ${selectedName}` : 'No shop item selected'}
                disabled={!selectedCanBuyAndPlace || !selectedEntry}
                onPress={() => selectedEntry && tryPurchaseAndPlace(selectedEntry[0], selectedEntry[1].price)}
                style={[
                  styles.buyButton,
                  styles.buyPlaceButton,
                  !selectedCanBuyAndPlace && styles.buyDisabled,
                  selectedEntry && !selectedCanBuy && styles.buyWarn,
                ]}
              >
                <Feather name="plus-square" size={15} color={selectedCanBuyAndPlace ? '#fff2bb' : 'rgba(255,242,187,0.62)'} />
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.buyPlaceText, !selectedCanBuyAndPlace && styles.buyPriceWarn]}>
                  {canPlace ? 'Buy & place' : 'Sanctuary only'}
                </Text>
              </Pressable>
            )}
          </View>
          {notice && (
            <Text numberOfLines={2} style={[styles.noticeText, notice.ok ? styles.noticeSuccess : styles.noticeWarn]}>
              {notice.message}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  shopStack: {
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
    minHeight: 34,
    marginBottom: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(32,22,17,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.26)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  filterButton: {
    minWidth: 58,
    flexGrow: 1,
    minHeight: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(247,230,165,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.42)',
  },
  filterText: {
    color: 'rgba(247,230,165,0.72)',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  filterTextActive: {
    color: '#fff2bb',
  },
  sourceBar: {
    width: '100%',
    minHeight: 30,
    marginBottom: 8,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.12)',
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
    backgroundColor: 'rgba(247,230,165,0.22)',
  },
  sourceText: {
    color: 'rgba(247,230,165,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  sourceTextActive: {
    color: '#fff2bb',
  },
  sourceCount: {
    marginTop: 1,
    color: 'rgba(247,230,165,0.56)',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  layoutBar: {
    width: '100%',
    minHeight: 28,
    marginBottom: 8,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(126,217,87,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(126,217,87,0.18)',
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
    backgroundColor: 'rgba(126,217,87,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(126,217,87,0.38)',
  },
  layoutText: {
    color: 'rgba(205,232,194,0.7)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  layoutTextActive: {
    color: '#d9ffd0',
  },
  layoutCount: {
    marginTop: 1,
    color: 'rgba(205,232,194,0.54)',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
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
    width: '100%',
    minHeight: 30,
    marginBottom: 8,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.12)',
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
    backgroundColor: 'rgba(247,230,165,0.22)',
  },
  sortText: {
    color: 'rgba(247,230,165,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  sortTextActive: {
    color: '#fff2bb',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyShop: {
    width: '100%',
    minHeight: 152,
    borderRadius: 8,
    backgroundColor: 'rgba(247,230,165,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyShopText: {
    marginTop: 6,
    color: 'rgba(255,242,187,0.76)',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  itemCard: {
    width: '48.7%',
    minHeight: 168,
    borderRadius: 8,
    padding: 9,
    backgroundColor: 'rgba(247,230,165,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.24)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemArtBox: {
    width: 96,
    height: 90,
    borderRadius: 8,
    backgroundColor: 'rgba(255,242,187,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#fff2bb',
    backgroundColor: 'rgba(247,230,165,0.2)',
  },
  cardName: {
    width: '100%',
    minHeight: 24,
    marginTop: 6,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    lineHeight: 12,
    textAlign: 'center',
  },
  rarityText: {
    width: '100%',
    marginTop: 1,
    fontFamily: fonts.ui.bold,
    fontSize: 7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cardRolePill: {
    maxWidth: '100%',
    minHeight: 17,
    marginTop: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(158,230,168,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(158,230,168,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRoleNature: {
    backgroundColor: 'rgba(126,217,87,0.16)',
    borderColor: 'rgba(126,217,87,0.38)',
  },
  cardRoleFarm: {
    backgroundColor: 'rgba(241,196,15,0.15)',
    borderColor: 'rgba(241,196,15,0.36)',
  },
  cardRoleRuin: {
    backgroundColor: 'rgba(183,153,255,0.15)',
    borderColor: 'rgba(183,153,255,0.36)',
  },
  cardRoleUtility: {
    backgroundColor: 'rgba(112,214,255,0.14)',
    borderColor: 'rgba(112,214,255,0.34)',
  },
  cardRoleLivestock: {
    backgroundColor: 'rgba(255,176,168,0.15)',
    borderColor: 'rgba(255,176,168,0.34)',
  },
  cardRoleResource: {
    backgroundColor: 'rgba(205,232,194,0.13)',
    borderColor: 'rgba(205,232,194,0.32)',
  },
  cardRoleText: {
    color: '#d5f5c7',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  ownedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
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
  ownedText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  pricePill: {
    minHeight: 22,
    marginTop: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  priceText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
  },
  buyButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 7,
    backgroundColor: '#e0c85f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buyButtonRow: {
    width: '100%',
    minHeight: 36,
    marginTop: 9,
    flexDirection: 'row',
    gap: 7,
  },
  buyButtonSplit: {
    flex: 0.82,
  },
  buyPlaceButton: {
    flex: 1.18,
    backgroundColor: 'rgba(32,78,46,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(158,230,168,0.42)',
  },
  buyWarn: {
    backgroundColor: 'rgba(255,176,168,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,168,0.42)',
  },
  buyDisabled: {
    opacity: 0.45,
  },
  buyPrice: {
    color: '#13351f',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  buyPriceWarn: {
    color: '#fff2bb',
  },
  buyPlaceText: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
  },
  pageControls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  pageButtonDisabled: {
    opacity: 0.36,
  },
  pageText: {
    minWidth: 38,
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    textAlign: 'center',
  },
  detailBar: {
    width: '100%',
    minHeight: 104,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(32,22,17,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.26)',
  },
  detailTopRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rarityBadge: {
    minHeight: 22,
    marginLeft: 6,
    marginRight: 6,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadgeText: {
    fontFamily: fonts.ui.bold,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  itemName: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 13,
  },
  itemMeta: {
    color: 'rgba(247,230,165,0.72)',
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    marginTop: 2,
  },
  mechanismHint: {
    color: '#9ee6a8',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
    marginTop: 2,
  },
  designRoleRow: {
    minHeight: 20,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  designRolePill: {
    minHeight: 18,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
  },
  designRoleNature: {
    backgroundColor: 'rgba(126,217,87,0.18)',
    borderColor: 'rgba(126,217,87,0.48)',
  },
  designRoleFarm: {
    backgroundColor: 'rgba(241,196,15,0.16)',
    borderColor: 'rgba(241,196,15,0.45)',
  },
  designRoleRuin: {
    backgroundColor: 'rgba(183,153,255,0.16)',
    borderColor: 'rgba(183,153,255,0.45)',
  },
  designRoleUtility: {
    backgroundColor: 'rgba(112,214,255,0.15)',
    borderColor: 'rgba(112,214,255,0.42)',
  },
  designRoleLivestock: {
    backgroundColor: 'rgba(255,176,168,0.16)',
    borderColor: 'rgba(255,176,168,0.42)',
  },
  designRoleResource: {
    backgroundColor: 'rgba(205,232,194,0.12)',
    borderColor: 'rgba(205,232,194,0.38)',
  },
  designRoleText: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  designRoleHint: {
    flex: 1,
    minWidth: 0,
    marginLeft: 6,
    color: 'rgba(255,242,187,0.68)',
    fontFamily: fonts.ui.regular,
    fontSize: 8,
  },
  layoutFitRow: {
    minHeight: 19,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  coinState: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinStateWarn: {
    borderColor: 'rgba(255,176,168,0.42)',
  },
  coinStateText: {
    color: '#f7e6a5',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginLeft: 5,
  },
  coinStateWarnText: {
    color: '#ffb0a8',
  },
  noticeText: {
    marginTop: 5,
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    textAlign: 'center',
  },
  noticeSuccess: {
    color: '#9ee6a8',
  },
  noticeWarn: {
    color: '#ffb0a8',
  },
});
