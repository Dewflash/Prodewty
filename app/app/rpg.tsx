import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Dimensions, Alert } from 'react-native';
import { colors } from '../src/theme/colors';
import { fonts } from '../src/theme/typography';
import { GameAssets, getGardenAsset } from '../src/utils/GameAssets';
import { getGardenPlots, getInventory, addInventoryItem, plantItem, GardenPlot, UserInventoryItem } from '../src/db/garden';
import { useFocusEffect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 40;
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

export default function RpgScreen() {
  const [plots, setPlots] = useState<GardenPlot[]>([]);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'garden' | 'expedition'>('garden');

  function loadData() {
    setPlots(getGardenPlots());
    setInventory(getInventory());
  }

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // DEBUG: Give user some seeds for testing
  function debugGiveSeeds() {
    addInventoryItem('tree_basic', 5);
    addInventoryItem('tree_autumn', 5);
    loadData();
    Alert.alert('Debug', 'Added test seeds to inventory!');
  }

  function handleGridTap(e: any) {
    if (!selectedSeed) return;
    
    const x = Math.floor(e.nativeEvent.locationX / GRID_SIZE) * GRID_SIZE;
    const y = Math.floor(e.nativeEvent.locationY / GRID_SIZE) * GRID_SIZE;
    
    plantItem(selectedSeed, x, y);
    // Remove one seed (we should use `useInventoryItem` in a real flow, but for prototype let's just leave it or deduct it)
    loadData();
    setSelectedSeed(null); // Unselect after planting
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <View style={styles.tabs}>
          <Pressable onPress={() => setActiveTab('garden')}>
            <Text style={[styles.tabText, activeTab === 'garden' && styles.tabTextActive]}>Sanctuary</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('expedition')}>
            <Text style={[styles.tabText, activeTab === 'expedition' && styles.tabTextActive]}>Expedition</Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'garden' ? (
        <>
          {/* Background Parallax Layers */}
          <View style={styles.bgContainer}>
            {GameAssets.bg_winter.map((bgSrc: any, idx: number) => (
              <Image key={idx} source={bgSrc} style={styles.bgLayer} resizeMode="cover" />
            ))}
          </View>

          <ScrollView 
            horizontal 
            bounces={false}
            contentContainerStyle={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          >
            <ScrollView 
              bounces={false}
              contentContainerStyle={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            >
              <Pressable style={styles.mapArea} onPress={handleGridTap}>
                {/* Render Planted Items */}
                {plots.map((plot) => {
                  const asset = getGardenAsset(plot.item_id, plot.growth_stage);
                  if (!asset) return null;
                  return (
                    <Image 
                      key={plot.id}
                      source={asset}
                      style={[styles.plantItem, { left: plot.grid_x, top: plot.grid_y }]}
                    />
                  );
                })}
              </Pressable>
            </ScrollView>
          </ScrollView>

          {/* Inventory / HUD */}
          <View style={styles.hud}>
            <Pressable style={styles.debugBtn} onPress={debugGiveSeeds}>
              <Text style={styles.debugText}>+ Seeds</Text>
            </Pressable>

            <ScrollView horizontal style={styles.inventoryRow}>
              {inventory.map((inv) => (
                <Pressable 
                  key={inv.item_id}
                  style={[
                    styles.invSlot, 
                    selectedSeed === inv.item_id && styles.invSlotSelected
                  ]}
                  onPress={() => setSelectedSeed(selectedSeed === inv.item_id ? null : inv.item_id)}
                >
                  <Image source={getGardenAsset(inv.item_id, 2) || undefined} style={styles.invIcon} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{inv.quantity}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Expeditions Coming Soon</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.ui.bold,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabTextActive: {
    color: '#fff',
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
    fontSize: 20,
  },
  bgContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bgLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  mapArea: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  plantItem: {
    position: 'absolute',
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  hud: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  debugText: {
    color: '#fff',
    fontFamily: fonts.ui.bold,
  },
  inventoryRow: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 10,
  },
  invSlot: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  invSlotSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  invIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.ui.bold,
  },
});
