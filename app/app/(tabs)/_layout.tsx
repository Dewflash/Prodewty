import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, focused }: { name: FeatherName; focused: boolean }) {
  return (
    <Feather
      name={name}
      size={20}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
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
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-2" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
          tabBarIcon: ({ focused }) => <TabIcon name="shield" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="recommendations"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon name="zap" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  label: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
