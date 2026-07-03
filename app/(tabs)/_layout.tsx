import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="today" options={{ title: 'Heute' }} />
      <Tabs.Screen name="routines" options={{ title: 'Routinen' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Aufgaben' }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen' }} />
    </Tabs>
  );
}
