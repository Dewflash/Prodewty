import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '../../theme/colors';

export type AnimalData = {
  id: number;
  name: string;
  type: string;
  daysOld: number;
  friendshipPoints: number;
  isFedToday: boolean;
  hasProduce: boolean;
};

function animalInitial(type: string) {
  return type.trim().slice(0, 1).toUpperCase() || 'A';
}

export function AnimalCoopView({ animals, onPet, onFeed, onHarvest }: {
  animals: AnimalData[];
  onPet: (id: number) => void;
  onFeed: (id: number) => void;
  onHarvest: (id: number) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inside the Building</Text>
      
      <ScrollView>
        {animals.map(animal => (
          <View key={animal.id} style={styles.animalCard}>
            <View style={styles.animalInfo}>
              <Text style={styles.animalIcon}>{animalInitial(animal.type)}</Text>
              <View style={styles.animalText}>
                <Text style={styles.animalName}>{animal.name}</Text>
                <Text style={styles.animalStats}>
                  Hearts: {Math.floor(animal.friendshipPoints / 100)}/10 | Age: {animal.daysOld}d
                </Text>
              </View>
            </View>
            
            <View style={styles.actions}>
              <Pressable 
                style={[styles.btn, animal.isFedToday ? styles.btnDisabled : styles.btnActive]} 
                disabled={animal.isFedToday}
                onPress={() => onFeed(animal.id)}
              >
                <Text style={styles.btnText}>{animal.isFedToday ? 'Fed' : 'Feed (Hay)'}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.btn, styles.btnActive]} 
                onPress={() => onPet(animal.id)}
              >
                <Text style={styles.btnText}>Pet</Text>
              </Pressable>

              {animal.hasProduce && (
                <Pressable 
                  style={[styles.btn, styles.btnSuccess]} 
                  onPress={() => onHarvest(animal.id)}
                >
                  <Text style={styles.btnText}>Harvest</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
        {animals.length === 0 && (
          <Text style={styles.emptyText}>This building is empty.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  animalCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  animalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  animalIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    color: colors.textPrimary,
    backgroundColor: colors.border,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  animalText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  animalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  animalStats: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  btnDisabled: {
    backgroundColor: colors.border,
  },
  btnSuccess: {
    backgroundColor: colors.success,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  }
});
