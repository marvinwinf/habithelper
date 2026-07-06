import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { CreateFab } from '../../src/ui/components/CreateFab';
import { colors, radius, shadows, spacing } from '../../src/ui/theme';

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
          // Floating rounded tab bar per the design reference mockup: kept
          // in normal layout flow (not absolutely positioned) so screen
          // content can never hide behind it; the margins let the warm
          // background show around it, which is what reads as "floating".
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarActiveBackgroundColor: colors.categories.mint.lighter,
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
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xxs,
    height: 64,
    ...shadows.soft,
  },
  tabBarItem: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.xxs,
    overflow: 'hidden',
  },
});
