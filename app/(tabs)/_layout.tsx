import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { CreateFab } from '../../src/ui/components/CreateFab';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// Labels render inside the custom tabBarIcon (not the default
// tabBarShowLabel slot) so the soft pill fill can wrap the icon+label group,
// per docs/DESIGN_SYSTEM.md's Navigation section.
function tabIcon(focused: IconName, unfocused: IconName, label: string) {
  function TabIcon({ focused: isFocused, color }: { focused: boolean; color: ColorValue }) {
    return (
      <View style={[styles.tabItem, isFocused && styles.tabItemActive]}>
        <Ionicons name={isFocused ? focused : unfocused} color={color} size={22} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </View>
    );
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          // Kept in normal layout flow (not absolutely positioned) so screen
          // content can never hide behind it. A flat, hairline-topped bar —
          // no floating margin, rounded corners, or shadow — with a gold
          // underline marking the active tab (T077).
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tabs.Screen
          name="today"
          options={{ title: 'Heute', tabBarIcon: tabIcon('sunny', 'sunny-outline', 'Heute') }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Routinen',
            tabBarIcon: tabIcon('repeat', 'repeat-outline', 'Routinen'),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Aufgaben',
            tabBarIcon: tabIcon('checkbox', 'checkbox-outline', 'Aufgaben'),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Einstellungen',
            tabBarIcon: tabIcon('settings', 'settings-outline', 'Einstellungen'),
          }}
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 64,
  },
  tabItem: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  tabItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  tabLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
