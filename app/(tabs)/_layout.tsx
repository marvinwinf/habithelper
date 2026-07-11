import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateFab } from '../../src/ui/components/CreateFab';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// Subset of the props React Navigation passes to a custom `tabBarButton`. We
// only read the interaction handlers and the selected flag (delivered as the
// `aria-selected` attribute in this version, with `accessibilityState` kept as
// a fallback for older ones).
type TabBarButtonProps = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  testID?: string;
  'aria-label'?: string;
  'aria-selected'?: boolean;
  accessibilityState?: { selected?: boolean };
};

// Usable content height of the bar, above the Android bottom safe-area inset.
// Comfortably fits the icon+label pill (paddingTop 8 + icon 22 + gap 4 + label
// 16 + paddingBottom 8 = 58). The safe-area inset is ADDED below this (see
// TabLayout) rather than carved out of it, so the column is never clipped
// regardless of the device's gesture-nav inset.
const TAB_BAR_CONTENT_HEIGHT = 72;

// Regular tabs render as a full custom `tabBarButton` rather than a
// `tabBarIcon`. React Navigation forces a `tabBarIcon` into a fixed 31x28
// wrapper (see @react-navigation TabBarIcon), which clips the taller icon+label
// column; owning the whole button gives it a full-height flex:1 slot so both
// the icon and the label below it are always fully visible, per
// docs/DESIGN_SYSTEM.md's Navigation section.
function tabButton(focused: IconName, unfocused: IconName, label: string) {
  function TabButton(props: TabBarButtonProps) {
    const isFocused = props['aria-selected'] ?? props.accessibilityState?.selected ?? false;
    const color = isFocused ? colors.accent : colors.textSecondary;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props['aria-label']}
        accessibilityState={{ selected: isFocused }}
        testID={props.testID}
        onPress={props.onPress}
        onLongPress={props.onLongPress}
        android_ripple={{ borderless: true }}
        style={styles.tabButton}
      >
        <View style={[styles.tabItem, isFocused && styles.tabItemActive]}>
          <View style={styles.tabIconWrapper}>
            <Ionicons name={isFocused ? focused : unfocused} color={color} size={22} />
          </View>
          <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }
  return TabButton;
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
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        // Kept in normal layout flow (not absolutely positioned) so screen
        // content can never hide behind it. A flat, hairline-topped bar with
        // a soft pill fill marking the active tab, per docs/DESIGN_SYSTEM.md's
        // Navigation section. Height is the fixed content height PLUS the
        // Android bottom safe-area inset (added as paddingBottom), so the
        // icon+label column always has its full height and is never clipped.
        tabBarStyle: [
          styles.tabBar,
          { height: TAB_BAR_CONTENT_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
        ],
      }}
    >
      <Tabs.Screen
        name="today"
        options={{ title: 'Heute', tabBarButton: tabButton('sunny', 'sunny-outline', 'Heute') }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarButton: tabButton('calendar', 'calendar-outline', 'Plan') }}
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
          tabBarButton: tabButton('stats-chart', 'stats-chart-outline', 'Progress'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Me', tabBarButton: tabButton('person-circle', 'person-circle-outline', 'Me') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // Height is set dynamically in TabLayout (content height + safe-area
    // inset). Keep overflow visible so the center create button, which floats
    // up out of the bar via createButtonWrapper's negative marginTop, is not
    // clipped.
    overflow: 'visible',
  },
  // The button fills its equal-width slot's full height (flex: 1) and centers
  // the pill vertically, so every regular item is the same size and never
  // clipped.
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
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
