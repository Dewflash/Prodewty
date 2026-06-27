import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';

export type ResourceNodeType = 'Oak_Tree' | 'Pine_Tree' | 'Boulder' | 'Weed';

export function ResourceNodeView({ type, health, maxHealth, onHit }: { type: ResourceNodeType, health: number, maxHealth: number, onHit: () => void }) {
  let bgColor = colors.danger;
  let label = '?';

  switch (type) {
    case 'Oak_Tree':
      bgColor = '#22c55e';
      label = '🌳';
      break;
    case 'Pine_Tree':
      bgColor = '#166534';
      label = '🌲';
      break;
    case 'Boulder':
      bgColor = '#64748b';
      label = '🪨';
      break;
    case 'Weed':
      bgColor = '#84cc16';
      label = '🌿';
      break;
  }

  const healthPercentage = Math.max(0, health / maxHealth);

  return (
    <Pressable style={[styles.container, { backgroundColor: bgColor }]} onPress={onHit}>
      <Text style={styles.icon}>{label}</Text>
      
      {health < maxHealth && (
        <View style={styles.healthBarContainer}>
          <View style={[styles.healthBar, { width: `${healthPercentage * 100}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  icon: {
    fontSize: 20,
  },
  healthBarContainer: {
    position: 'absolute',
    bottom: 2,
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#ef4444',
  }
});
