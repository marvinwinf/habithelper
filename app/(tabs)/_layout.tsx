import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '../../src/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({ focused: isFocused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={isFocused ? focused : unfocused} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
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
  );
}
