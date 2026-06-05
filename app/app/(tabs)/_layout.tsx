import React from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { GlobalCurrencyBar } from '../../src/components/GlobalCurrencyBar';
import { playSound } from '../../src/services/audio';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, focused }: { name: FeatherName; focused: boolean }) {
  return <Feather name={name} size={20} color={focused ? colors.primary : colors.textMuted} />;
}

function CustomTabBar(props: BottomTabBarProps) {
  return (
    <View>
      <GlobalCurrencyBar />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenListeners={{ tabPress: () => playSound('bottomribbonbutton') }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon name="trending-up" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: ({ onPress }) => (
            <Pressable onPress={onPress ?? undefined} style={styles.plusTabBtn}>
              <View style={styles.plusIcon}>
                <Feather name="plus" size={22} color={colors.bg} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Recharge',
          tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
          tabBarIcon: ({ focused }) => <TabIcon name="shield" focused={focused} />,
        }}
      />
      <Tabs.Screen name="stats"           options={{ href: null }} />
      <Tabs.Screen name="journal"         options={{ href: null }} />
      <Tabs.Screen name="recommendations" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 72,
    paddingBottom: 14,
    paddingTop: 8,
  },
  label: {
    fontFamily: fonts.ui.medium,
    fontSize: 10,
    marginTop: 2,
  },
  plusTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
});
