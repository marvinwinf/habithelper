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
        <View style={styles.tabIconWrapper}>
          <Ionicons name={isFocused ? focused : unfocused} color={color} size={22} />
        </View>
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  return TabIcon;
}

// The create button lives in the center slot of the bar itself (not a FAB
// floating above it) per the Phase 12 reference mockup — this replaces the
// slot's default tab button entirely, so only CreateFab's own Pressable
// responds to touch; the "create" route itself is never actually navigated
// to (its tabPress is intercepted below).
function CreateTabButton() {
  return (
    <View style={styles.createButtonWrapper}>
      <CreateFab />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        // Kept in normal layout flow (not absolutely positioned) so screen
        // content can never hide behind it. A flat, hairline-topped bar with
        // a soft pill fill marking the active tab, per docs/DESIGN_SYSTEM.md's
        // Navigation section.
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{ title: 'Heute', tabBarIcon: tabIcon('sunny', 'sunny-outline', 'Heute') }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: tabIcon('calendar', 'calendar-outline', 'Plan') }}
      />
      <Tabs.Screen
        name="create"
        options={{ tabBarButton: CreateTabButton }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline', 'Progress'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Me', tabBarIcon: tabIcon('person-circle', 'person-circle-outline', 'Me') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 72,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  tabIconWrapper: {
    flexShrink: 0,
  },
  tabItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  tabLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    textAlign: 'center',
    flexShrink: 1,
  },
  createButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Pops the button up so it visually floats out of the bar, per the
    // mockup, rather than sitting flush with the other tab icons.
    marginTop: -20,
  },
});
