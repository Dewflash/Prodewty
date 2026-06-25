import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, type SharedValue } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { db } from '../db/schema';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type InventoryItem = {
  item_id: string;
  quantity: number;
};

export const SHOP_CATALOG: Record<string, { name: string, price: number, colWidth: number, colHeight: number, visWidth: number, visHeight: number, source: any }> = {
  'White_tree1': { name: 'White Tree', price: 100, colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/White_tree1.png') },
  'Curved_tree1': { name: 'Curved Tree', price: 150, colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Curved_tree1.png') },
  'Luminous_tree1': { name: 'Luminous Tree', price: 300, colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Luminous_tree1.png') },
  'Living gazebo1': { name: 'Living Gazebo', price: 500, colWidth: 2, colHeight: 2, visWidth: 2, visHeight: 2, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Living gazebo1.png') },
  'Blue-green_balls_tree1': { name: 'Blue-Green Tree', price: 200, colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Blue-green_balls_tree1.png') },
  'Mega_tree1': { name: 'Mega Tree', price: 1000, colWidth: 2, colHeight: 2, visWidth: 4, visHeight: 4, source: require('../../assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/Mega_tree1.png') },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  dragItemId: SharedValue<string | null>;
  dragItemColWidth: SharedValue<number>;
  dragItemColHeight: SharedValue<number>;
  dragItemVisWidth: SharedValue<number>;
  dragItemVisHeight: SharedValue<number>;
  onPurchaseRequest: (itemId: string, price: number) => void;
  onDragStart: (itemId: string) => void;
  onSelectInventoryItem: (itemId: string) => void;
}

export function SanctuaryShop({ isOpen, onClose, dragX, dragY, isDragging, dragItemId, dragItemColWidth, dragItemColHeight, dragItemVisWidth, dragItemVisHeight, onPurchaseRequest, onDragStart, onSelectInventoryItem }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop'>('inventory');

  const translateY = useSharedValue(400);

  // We expose a refetch function so the parent can trigger it after a purchase/placement
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

  const createDragGesture = (itemId: string, colW: number, colH: number, visW: number, visH: number) => {
    return Gesture.Pan()
      .activeOffsetY([-10, 10]) // Activate on vertical pull to escape ScrollView
      .failOffsetX([-10, 10])   // Let ScrollView handle horizontal swipes
      .onStart((e) => {
        isDragging.value = true;
        dragItemId.value = itemId;
        dragItemColWidth.value = colW;
        dragItemColHeight.value = colH;
        dragItemVisWidth.value = visW;
        dragItemVisHeight.value = visH;
        dragX.value = e.absoluteX;
        dragY.value = e.absoluteY;
        if (onDragStart) runOnJS(onDragStart)(itemId);
      })
      .onUpdate((e) => {
        dragX.value = e.absoluteX;
        dragY.value = e.absoluteY;
      })
      .onEnd(() => {
        // The release logic is handled globally in rpg.tsx since it needs access to the collision map
        // We just signal the drag ended.
        isDragging.value = false;
      })
      .onFinalize(() => {
        isDragging.value = false;
      });
  };

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
            const catalogItem = SHOP_CATALOG[item.item_id as keyof typeof SHOP_CATALOG];
            if (!catalogItem) return null;

            return (
              <GestureDetector key={item.item_id} gesture={createDragGesture(item.item_id, catalogItem.colWidth, catalogItem.colHeight, catalogItem.visWidth, catalogItem.visHeight)}>
                <Animated.View style={styles.itemCard}>
                  <Image source={catalogItem.source} style={styles.itemImage} resizeMode="contain" />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName}>{catalogItem.name}</Text>
                  <Pressable
                    style={styles.useBtn}
                    onPress={() => onSelectInventoryItem(item.item_id)}
                  >
                    <Feather name="plus-square" size={14} color="#fff" />
                    <Text style={styles.useBtnText}>Use</Text>
                  </Pressable>
                </Animated.View>
              </GestureDetector>
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
