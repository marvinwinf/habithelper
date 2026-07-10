import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { CreateFab } from '../../src/ui/components/CreateFab';
import { colors, radius, spacing } from '../../src/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({ focused: isFocused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={isFocused ? focused : unfocused} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          // Kept in normal layout flow (not absolutely positioned) so screen
          // content can never hide behind it. T077 replaces the remaining
          // floating geometry with a flat, hairline-topped bar and a gold
          // underline for the active tab.
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="today"
          options={{ title: 'Heute', tabBarIcon: tabIcon('sunny', 'sunny-outline') }}
        />
        <Tabs.Screen
          name="routines"
          options={{ title: 'Routinen', tabBarIcon: tabIcon('repeat', 'repeat-outline') }}
        />
        <Tabs.Screen
          name="tasks"
          options={{ title: 'Aufgaben', tabBarIcon: tabIcon('checkbox', 'checkbox-outline') }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Einstellungen', tabBarIcon: tabIcon('settings', 'settings-outline') }}
        />
      </Tabs>
      <CreateFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    height: 64,
  },
  tabBarItem: {
    borderRadius: radius.md,
    marginHorizontal: spacing.xs,
    overflow: 'hidden',
  },
});
