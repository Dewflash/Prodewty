import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import { getPlaceableItem, getRpgItem, SHOP_CATALOG } from './RpgObjectCatalog';

type InventoryItem = {
  item_id: string;
  quantity: number;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseRequest: (itemId: string, price: number) => void;
  onSelectInventoryItem: (itemId: string) => void;
}

export function SanctuaryShop({ isOpen, onClose, onPurchaseRequest, onSelectInventoryItem }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop'>('inventory');

  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? 0 : 400, { damping: 20, stiffness: 200 });

    if (isOpen) {
      try {
        const data = db.getAllSync<InventoryItem>('SELECT * FROM user_inventory WHERE quantity > 0');
        setInventory(data);
      } catch (e) {
        console.warn("Failed to load inventory:", e);
      }
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setActiveTab('inventory')} style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>Inventory</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('shop')} style={[styles.tab, activeTab === 'shop' && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>Shop</Text>
          </Pressable>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'inventory' ? (
          inventory.map((item) => {
            const catalogItem = getRpgItem(item.item_id);
            const placeableItem = getPlaceableItem(item.item_id);
            const itemName = catalogItem?.name ?? item.item_id;

            return (
              <Animated.View key={item.item_id} style={styles.itemCard}>
                  {catalogItem?.source ? (
                    <Image source={catalogItem.source} style={styles.itemImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Feather name="box" size={26} color="#fff" />
                    </View>
                  )}
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName}>{itemName}</Text>
                  {placeableItem && (
                    <Pressable
                      style={styles.useBtn}
                      onPress={() => onSelectInventoryItem(item.item_id)}
                    >
                      <Feather name="plus-square" size={14} color="#fff" />
                      <Text style={styles.useBtnText}>Use</Text>
                    </Pressable>
                  )}
              </Animated.View>
            );
          })
        ) : (
          Object.entries(SHOP_CATALOG).map(([id, item]) => (
            <Pressable key={id} onPress={() => onPurchaseRequest(id, item.price)}>
              <Animated.View style={styles.itemCard}>
                <Image source={item.source} style={styles.itemImage} resizeMode="contain" />
                <View style={styles.priceTag}>
                  <Feather name="circle" size={12} color="#f1c40f" />
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
              </Animated.View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: 'rgba(20, 20, 25, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    zIndex: 1000,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.ui.bold,
  },
  activeTabText: {
    color: '#fff',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingRight: 40,
  },
  itemCard: {
    width: 120,
    height: 164,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },
  itemImage: {
    width: 72,
    height: 72,
  },
  itemImageFallback: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  itemName: {
    color: '#fff',
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  useBtn: {
    marginTop: 8,
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3498db',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    color: '#f1c40f',
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginLeft: 4,
  },
});
