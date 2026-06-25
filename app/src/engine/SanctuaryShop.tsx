import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import { SHOP_CATALOG } from './RpgObjectCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseRequest: (itemId: string, price: number) => void;
}

export function SanctuaryShop({ isOpen, onClose, onPurchaseRequest }: Props) {
  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? 0 : 400, { damping: 20, stiffness: 200 });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View pointerEvents={isOpen ? 'auto' : 'none'} style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop</Text>
          <Text style={styles.subtitle}>Buy objects for your sanctuary.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close shop" onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {Object.entries(SHOP_CATALOG).map(([id, item]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`Buy ${item.name}`}
            onPress={() => onPurchaseRequest(id, item.price)}
          >
            <Animated.View style={styles.itemCard}>
              <Image source={item.source} style={styles.itemImage} resizeMode="contain" />
              <View style={styles.priceTag}>
                <Feather name="circle" size={12} color="#f1c40f" />
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
              <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
            </Animated.View>
          </Pressable>
        ))}
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
    height: 242,
    backgroundColor: 'rgba(20,20,25,0.95)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    zIndex: 1000,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 17,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingRight: 40,
  },
  itemCard: {
    width: 116,
    height: 152,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemImage: {
    width: 74,
    height: 74,
  },
  itemName: {
    color: '#fff',
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    minHeight: 30,
    marginTop: 8,
    textAlign: 'center',
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
