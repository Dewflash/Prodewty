import React, { useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { RpgGrid, GridObject } from './RpgGrid';
import { InventoryDrawer } from './InventoryDrawer';
import { colors } from '../../theme/colors';

type InventoryItem = {
  itemId: string;
  quantity: number;
};

type Props = {
  objects: GridObject[];
  inventory: InventoryItem[];
  energy: number;
  maxEnergy: number;
  onTileAction?: (row: number, col: number, selectedItemId: string | null, obj?: GridObject) => void;
};

export function RpgScreen({ objects, inventory, energy, maxEnergy, onTileAction }: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const lastPressTime = useRef<Record<string, number>>({});

  const handleTilePress = (row: number, col: number, obj?: GridObject) => {
    const now = Date.now();
    const tileKey = `${row}-${col}`;
    if (lastPressTime.current[tileKey] && now - lastPressTime.current[tileKey] < 300) {
      return;
    }
    lastPressTime.current[tileKey] = now;
    onTileAction?.(row, col, selectedItemId, obj);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sanctuary</Text>
        <Text style={styles.energyLabel}>{energy}/{maxEnergy} AP</Text>
      </View>
      
      <View style={styles.gridWrapper}>
        <RpgGrid objects={objects} onTilePress={handleTilePress} />
      </View>

      <InventoryDrawer 
        items={inventory} 
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  energyLabel: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  gridWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
});
