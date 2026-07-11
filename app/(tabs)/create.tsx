import { Redirect } from 'expo-router';

// Registered only so the "create" Tabs.Screen (app/(tabs)/_layout.tsx) has a
// route to point at; unreachable in practice because that tab's tabPress is
// always intercepted in favor of CreateFab's own sheet.
export default function CreateTabPlaceholder() {
  return <Redirect href="/(tabs)/today" />;
}
