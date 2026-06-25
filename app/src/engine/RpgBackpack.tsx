import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import {
  getPlaceableItem,
  getRpgItem,
  type RpgItemDefinition,
  type RpgSpriteFrame,
} from './RpgObjectCatalog';
import { RpgItemIcon, RpgSpriteFrameView } from './RpgItemIcon';

type InventoryRow = {
  item_id: string;
  quantity: number;
};

type InventorySlot = InventoryRow & {
  item: RpgItemDefinition | null;
};

type Props = {
  isOpen: boolean;
  refreshKey: number;
  canPlace: boolean;
  onClose: () => void;
  onPlaceItem: (itemId: string) => void;
};

const INVENTORY_SHEET = require('../../assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Inventory.png');

const PANEL_FRAME: RpgSpriteFrame = {
  source: INVENTORY_SHEET,
  x: 232,
  y: 0,
  width: 96,
  height: 128,
  sheetWidth: 336,
  sheetHeight: 160,
};

const SLOT_COUNT = 20;
const SLOT_COLS = 5;
const SLOT_SIZE = 14;
const SLOT_GAP = 2;
const SLOT_START_X = 8;
const SLOT_START_Y = 17;

function getKindRank(item: RpgItemDefinition | null) {
  if (!item) return 99;
  if (item.kind === 'object') return 0;
  if (item.kind === 'seed') return 1;
  return 2;
}

export function RpgBackpack({ isOpen, refreshKey, canPlace, onClose, onPlaceItem }: Props) {
  const { width, height } = useWindowDimensions();
  const [inventory, setInventory] = useState<InventorySlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const scale = Math.max(
    2.1,
    Math.min(3.25, (width - 28) / PANEL_FRAME.width, (height - 128) / PANEL_FRAME.height),
  );

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

  useEffect(() => {
    if (!isOpen) return;
    const maxPage = Math.max(0, Math.ceil(inventory.length / SLOT_COUNT) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [inventory.length, isOpen, page]);

  const pageItems = useMemo(
    () => inventory.slice(page * SLOT_COUNT, page * SLOT_COUNT + SLOT_COUNT),
    [inventory, page],
  );

  if (!isOpen) return null;

  const selected = inventory.find(row => row.item_id === selectedId) ?? null;
  const selectedItem = selected?.item ?? null;
  const selectedName = selectedItem?.name ?? selected?.item_id ?? 'Empty';
  const selectedDescription = selectedItem?.description ?? (
    selected ? 'No description yet.' : 'Collected items appear here.'
  );
  const selectedPlaceable = getPlaceableItem(selected?.item_id ?? null);
  const maxPage = Math.max(0, Math.ceil(inventory.length / SLOT_COUNT) - 1);
  const panelWidth = PANEL_FRAME.width * scale;
  const panelHeight = PANEL_FRAME.height * scale;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
        <RpgSpriteFrameView frame={PANEL_FRAME} scale={scale} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close backpack"
          onPress={onClose}
          style={[
            styles.closeHitbox,
            {
              left: 87 * scale,
              top: 1 * scale,
              width: 8 * scale,
              height: 8 * scale,
            },
          ]}
        />

        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const col = index % SLOT_COLS;
          const row = Math.floor(index / SLOT_COLS);
          const slot = pageItems[index] ?? null;
          const isSelected = slot?.item_id === selectedId;
          return (
            <Pressable
              key={`${page}-${index}-${slot?.item_id ?? 'empty'}`}
              accessibilityRole="button"
              accessibilityLabel={slot ? `${slot.item?.name ?? slot.item_id}, ${slot.quantity}` : 'Empty slot'}
              disabled={!slot}
              onPress={() => slot && setSelectedId(slot.item_id)}
              style={[
                styles.slot,
                isSelected && styles.selectedSlot,
                {
                  left: (SLOT_START_X + col * (SLOT_SIZE + SLOT_GAP)) * scale,
                  top: (SLOT_START_Y + row * (SLOT_SIZE + SLOT_GAP)) * scale,
                  width: SLOT_SIZE * scale,
                  height: SLOT_SIZE * scale,
                },
              ]}
            >
              {slot && (
                <>
                  <RpgItemIcon item={slot.item} size={11 * scale} fallbackLabel={slot.item_id} />
                  <View style={styles.quantityPill}>
                    <Text style={styles.quantityText}>{slot.quantity}</Text>
                  </View>
                </>
              )}
            </Pressable>
          );
        })}

        {maxPage > 0 && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous backpack page"
              disabled={page === 0}
              onPress={() => setPage(current => Math.max(0, current - 1))}
              style={[
                styles.pageButton,
                styles.pageLeft,
                page === 0 && styles.pageDisabled,
                { top: 48 * scale, width: 14 * scale, height: 18 * scale },
              ]}
            >
              <Feather name="chevron-left" size={16} color="#f7e6a5" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next backpack page"
              disabled={page >= maxPage}
              onPress={() => setPage(current => Math.min(maxPage, current + 1))}
              style={[
                styles.pageButton,
                styles.pageRight,
                page >= maxPage && styles.pageDisabled,
                { top: 48 * scale, width: 14 * scale, height: 18 * scale },
              ]}
            >
              <Feather name="chevron-right" size={16} color="#f7e6a5" />
            </Pressable>
          </>
        )}

        <View
          style={[
            styles.details,
            {
              left: 8 * scale,
              right: 8 * scale,
              top: 86 * scale,
              minHeight: 34 * scale,
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text numberOfLines={1} style={styles.detailName}>{selectedName}</Text>
            {selected && <Text style={styles.detailCount}>x{selected.quantity}</Text>}
          </View>
          <Text numberOfLines={2} style={styles.detailDescription}>{selectedDescription}</Text>
          {selectedPlaceable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Place ${selectedName}`}
              disabled={!canPlace}
              onPress={() => selected && onPlaceItem(selected.item_id)}
              style={[styles.placeButton, !canPlace && styles.disabledButton]}
            >
              <Feather name="plus-square" size={13} color="#fff" />
              <Text style={styles.placeText}>{canPlace ? 'Place' : 'Sanctuary only'}</Text>
            </Pressable>
          ) : selectedItem?.kind === 'seed' ? (
            <Text style={styles.kindText}>Seed for farming</Text>
          ) : selected ? (
            <Text style={styles.kindText}>Resource</Text>
          ) : (
            <Text style={styles.kindText}>Backpack empty</Text>
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
  panel: {
    position: 'relative',
    overflow: 'hidden',
  },
  closeHitbox: {
    position: 'absolute',
  },
  slot: {
    position: 'absolute',
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,28,19,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.4)',
  },
  pageLeft: {
    left: 0,
  },
  pageRight: {
    right: 0,
  },
  pageDisabled: {
    opacity: 0.35,
  },
  details: {
    position: 'absolute',
    padding: 6,
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
  placeButton: {
    alignSelf: 'flex-start',
    minHeight: 24,
    marginTop: 5,
    paddingHorizontal: 8,
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
