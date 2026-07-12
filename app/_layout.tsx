import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { db } from '../src/data/db/client';
import { runMigrations } from '../src/data/db/migrate';
import { ensureProfile } from '../src/data/repositories/profileRepository';
import { reconcileAllActiveRoutines } from '../src/services/reconciliationService';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  // Screens must not mount (and query the database) until migrations have
  // run: child effects fire before parent effects in React, so without this
  // gate a fresh install's first queries race the CREATE TABLEs and fail —
  // leaving every list permanently empty.
  const [ready, setReady] = useState(false);

  // TODO(docs/ARCHITECTURE.md "Startup-critical failures"): replace the
  // console.error below with the full-screen recovery view (offer backup
  // restore) once the backup stack exists (Phase 9); until then a failed
  // migration only logs and screens render against a possibly-unmigrated DB.
  useEffect(() => {
    async function initialize() {
      await runMigrations();
      await ensureProfile(db);
      // Every active routine (and the app streak) is reconciled up through
      // yesterday before any screen reads routine state, per T038 /
      // docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation.
      await reconcileAllActiveRoutines(db);
    }
    initialize()
      .catch((error) => {
        console.error('App startup initialization failed', error);
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* One deliberate, consistent push transition for every stack screen
          (create/edit/detail) instead of the platform default — hierarchical
          navigation reads as "going into" the item. */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </GestureHandlerRootView>
  );
}
