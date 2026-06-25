import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import { RPG_UI_FRAMES, SHOP_CATALOG } from './RpgObjectCatalog';
import { RpgSpriteFrameView } from './RpgItemIcon';

type OwnedRow = {
  item_id: string;
  quantity: number;
};

interface Props {
  isOpen: boolean;
  coins: number;
  refreshKey: number;
  onClose: () => void;
  onPurchaseRequest: (itemId: string, price: number) => void;
}

const SHOP_SLOT_POSITIONS = [
  { x: 22, y: 18 },
  { x: 54, y: 18 },
  { x: 86, y: 18 },
  { x: 22, y: 72 },
  { x: 54, y: 72 },
  { x: 86, y: 72 },
];
const BUY_BUTTON_POSITIONS = [
  { x: 22, y: 48 },
  { x: 54, y: 48 },
  { x: 86, y: 48 },
  { x: 22, y: 102 },
  { x: 54, y: 102 },
  { x: 86, y: 102 },
];
const SHOP_PANEL_CAPACITY = SHOP_SLOT_POSITIONS.length;

export function SanctuaryShop({ isOpen, coins, refreshKey, onClose, onPurchaseRequest }: Props) {
  const { width, height } = useWindowDimensions();
  const [ownedCounts, setOwnedCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shopEntries = useMemo(() => Object.entries(SHOP_CATALOG), []);
  const visibleShopEntries = useMemo(() => shopEntries.slice(0, SHOP_PANEL_CAPACITY), [shopEntries]);
  const selectedEntry = visibleShopEntries.find(([id]) => id === selectedId) ?? visibleShopEntries[0] ?? null;
  const selectedName = selectedEntry?.[1].name ?? 'Shop';
  const selectedPrice = selectedEntry?.[1].price ?? 0;
  const selectedOwned = selectedEntry ? ownedCounts[selectedEntry[0]] ?? 0 : 0;
  const selectedShortfall = Math.max(0, selectedPrice - coins);
  const scale = Math.max(
    2.1,
    Math.min(3, (width - 28) / RPG_UI_FRAMES.shopPanel.width, (height - 160) / RPG_UI_FRAMES.shopPanel.height),
  );
  const panelWidth = RPG_UI_FRAMES.shopPanel.width * scale;
  const panelHeight = RPG_UI_FRAMES.shopPanel.height * scale;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(current => (
      visibleShopEntries.some(([id]) => id === current)
        ? current
        : visibleShopEntries[0]?.[0] ?? null
    ));
    try {
      const rows = db.getAllSync<OwnedRow>('SELECT item_id, quantity FROM user_inventory WHERE quantity > 0');
      setOwnedCounts(Object.fromEntries(rows.map(row => [row.item_id, row.quantity])));
    } catch (e) {
      console.warn('Failed to load shop owned counts', e);
      setOwnedCounts({});
    }
  }, [isOpen, refreshKey, visibleShopEntries]);

  if (!isOpen) return null;

  const tryPurchase = (itemId: string, price: number) => {
    setSelectedId(itemId);
    if (coins < price) return;
    onPurchaseRequest(itemId, price);
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.shopStack, { width: panelWidth }]}>
        <View style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
          <RpgSpriteFrameView frame={RPG_UI_FRAMES.shopPanel} scale={scale} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close shop"
            onPress={onClose}
            style={[
              styles.closeHitbox,
              {
                left: 119 * scale,
                top: 2 * scale,
                width: 8 * scale,
                height: 8 * scale,
              },
            ]}
          />

          {visibleShopEntries.map(([id, item], index) => {
            const slot = SHOP_SLOT_POSITIONS[index];
            const buy = BUY_BUTTON_POSITIONS[index];
            const owned = ownedCounts[id] ?? 0;
            const canBuy = coins >= item.price;
            const isSelected = id === selectedId;
            return (
              <View key={id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, owned ${owned}`}
                  onPress={() => setSelectedId(id)}
                  style={[
                    styles.itemHitbox,
                    isSelected && styles.selectedItem,
                    {
                      left: slot.x * scale,
                      top: slot.y * scale,
                      width: 24 * scale,
                      height: 24 * scale,
                    },
                  ]}
                >
                  <Image source={item.source} style={{ width: 23 * scale, height: 23 * scale }} resizeMode="contain" />
                  {owned > 0 && (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>{owned}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canBuy ? `Buy ${item.name}` : `Cannot afford ${item.name}`}
                  onPress={() => tryPurchase(id, item.price)}
                  style={[
                    styles.buyHitbox,
                    !canBuy && styles.buyDisabled,
                    {
                      left: buy.x * scale,
                      top: buy.y * scale,
                      width: 27 * scale,
                      height: 13 * scale,
                    },
                  ]}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.buyPrice}>{item.price}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.detailBar}>
          <View style={styles.detailTextBlock}>
            <Text numberOfLines={1} style={styles.itemName}>{selectedName}</Text>
            <Text numberOfLines={1} style={styles.itemMeta}>
              Owned {selectedOwned}  Price {selectedPrice}
            </Text>
          </View>
          <View style={[styles.coinState, selectedShortfall > 0 && styles.coinStateWarn]}>
            <Feather name="circle" size={12} color={selectedShortfall > 0 ? '#ffb0a8' : '#f1c40f'} />
            <Text style={[styles.coinStateText, selectedShortfall > 0 && styles.coinStateWarnText]}>
              {selectedShortfall > 0 ? `Need ${selectedShortfall}` : `${coins}`}
            </Text>
          </View>
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
    alignItems: 'center',
  },
  panel: {
    position: 'relative',
    overflow: 'hidden',
  },
  closeHitbox: {
    position: 'absolute',
  },
  itemHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#fff2bb',
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  buyHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyDisabled: {
    opacity: 0.45,
  },
  buyPrice: {
    color: '#13351f',
    fontFamily: fonts.ui.bold,
    fontSize: 9,
  },
  detailBar: {
    width: '100%',
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(32,22,17,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(247,230,165,0.26)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  itemMeta: {
    color: 'rgba(247,230,165,0.72)',
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    marginTop: 2,
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
});
