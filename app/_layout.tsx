import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { db } from '../src/data/db/client';
import { runMigrations } from '../src/data/db/migrate';
import { ensureProfile } from '../src/data/repositories/profileRepository';

export default function RootLayout() {
  // TODO(docs/ARCHITECTURE.md "Startup-critical failures"): replace the
  // console.error below with the full-screen recovery view (offer backup
  // restore) once the backup stack exists (Phase 9); until then a failed
  // migration only logs and screens render against a possibly-unmigrated DB.
  // TODO(T038): reconcile missed occurrences for every active routine here,
  // after migrations and before routine state is shown anywhere.
  useEffect(() => {
    async function initialize() {
      await runMigrations();
      await ensureProfile(db);
    }
    initialize().catch((error) => {
      console.error('App startup initialization failed', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
