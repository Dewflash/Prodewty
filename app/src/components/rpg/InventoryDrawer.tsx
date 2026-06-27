import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '../../theme/colors';

export type InventoryItemProps = {
  itemId: string;
  quantity: number;
  isSelected: boolean;
  onSelect: () => void;
};

export function InventoryDrawer({ items, selectedItemId, onSelectItem }: { 
  items: Omit<InventoryItemProps, 'isSelected' | 'onSelect'>[], 
  selectedItemId: string | null,
  onSelectItem: (id: string | null) => void 
}) {
  return (
    <View style={styles.drawerContainer}>
      <Text style={styles.title}>Inventory</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map(item => (
          <Pressable 
            key={item.itemId} 
            accessibilityRole="button"
            accessibilityState={{ selected: selectedItemId === item.itemId }}
            style={[styles.itemBox, selectedItemId === item.itemId && styles.itemBoxSelected]}
            onPress={() => onSelectItem(selectedItemId === item.itemId ? null : item.itemId)}
          >
            <Text style={styles.itemIcon} numberOfLines={1} adjustsFontSizeToFit>{item.itemId.replace('rpg_', '').slice(0, 2).toUpperCase()}</Text>
            <Text style={styles.itemQuantity}>{item.quantity}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemId.replace('rpg_', '')}</Text>
          </Pressable>
        ))}
        {items.length === 0 && (
          <View style={styles.emptySlot}>
            <Text style={styles.emptyText}>Empty</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    width: '100%',
    height: 120,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 10,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scrollContent: {
    paddingRight: 20,
  },
  itemBox: {
    width: 70,
    height: 70,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  itemBoxSelected: {
    borderColor: colors.primary,
  },
  itemIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    width: 42,
    textAlign: 'center',
  },
  itemQuantity: {
    position: 'absolute',
    bottom: 2,
    right: 5,
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemName: {
    position: 'absolute',
    top: 2,
    fontSize: 8,
    color: colors.textMuted,
    maxWidth: 58,
  },
  emptySlot: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
