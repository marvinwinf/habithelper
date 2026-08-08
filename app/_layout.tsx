import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { importBackup } from '../src/data/backup/expoImport';
import { db } from '../src/data/db/client';
import { runMigrations } from '../src/data/db/migrate';
import { ensureProfile } from '../src/data/repositories/profileRepository';
import { reconcileAllActiveRoutines } from '../src/services/reconciliationService';
import { dayRolloverWatcher } from '../src/state/appDayRollover';
import {
  isDatabaseClosed,
  subscribeToDatabaseClosed,
} from '../src/state/databaseLifecycle';
import { RestartRequired } from '../src/ui/components/RestartRequired';
import { StartupRecovery } from '../src/ui/components/StartupRecovery';
import { colors } from '../src/ui/theme';

type StartupState = 'loading' | 'ready' | 'failed';

export default function RootLayout() {
  // Screens must not mount (and query the database) until migrations have
  // run: child effects fire before parent effects in React, so without this
  // gate a fresh install's first queries race the CREATE TABLEs and fail —
  // leaving every list permanently empty.
  const [state, setState] = useState<StartupState>('loading');
  // Bumping this re-runs the startup effect, so "Erneut versuchen" retries a
  // transient failure without the user force-quitting the app.
  const [attempt, setAttempt] = useState(0);
  // A successful import closes the database connection and swaps the file
  // underneath it, and the singleton cannot be rebound mid-session. Blocking
  // here rather than inside Settings is what actually stops the tab bar: the
  // tabs live below this layout, so a screen-local block left "Heute" one tap
  // away from querying a closed handle.
  const [databaseClosed, setDatabaseClosed] = useState(isDatabaseClosed);

  useEffect(() => subscribeToDatabaseClosed(() => setDatabaseClosed(true)), []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      await runMigrations();
      await ensureProfile(db);
      // Every active routine (and the app streak) is reconciled up through
      // yesterday before any screen reads routine state, per T038 /
      // docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation.
      await reconcileAllActiveRoutines(db);
    }

    initialize()
      .then(() => {
        if (!cancelled) {
          setState('ready');
        }
      })
      // A startup-critical failure now blocks on a recovery view rather than
      // proceeding (docs/ARCHITECTURE.md's Error Handling). Previously this
      // only logged and then rendered the app anyway, so an unmigrated
      // database produced empty lists on every screen — a user could not tell
      // that apart from having lost all of their data.
      .catch((error) => {
        console.error('App startup initialization failed', error);
        if (!cancelled) {
          setState('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Startup reconciliation only covers the day the app happened to launch on.
  // Android keeps processes alive for days, so the watcher re-runs it whenever
  // the app is foregrounded on a later calendar day — otherwise a backgrounded
  // app resumes showing a new date next to yesterday's streaks.
  useEffect(() => {
    if (state !== 'ready') {
      return;
    }
    return dayRolloverWatcher.start();
  }, [state]);

  // Resets to the loading state here rather than in the effect body: a
  // synchronous setState inside an effect triggers a cascading render (and is
  // rejected by react-hooks/set-state-in-effect). An event handler is the
  // right place for it, and `attempt` changing re-runs the startup effect.
  const handleRetry = useCallback(() => {
    setState('loading');
    setAttempt((current) => current + 1);
  }, []);

  // Restoring is allowed to proceed even though the live database is the
  // thing that just failed — see ExpoImportOptions in expoImport.ts for why
  // the usual live-database preconditions are relaxed here.
  const handleRestoreBackup = useCallback(async () => {
    const result = await importBackup({ tolerateUnreadableLiveDatabase: true });
    return result.status === 'imported';
  }, []);

  if (databaseClosed) {
    return (
      <View style={styles.fill} testID="app-restart-required">
        <RestartRequired />
      </View>
    );
  }

  if (state === 'failed') {
    return (
      <View style={styles.fill}>
        <StartupRecovery
          onRetry={handleRetry}
          onRestoreBackup={handleRestoreBackup}
          testID="startup-recovery"
        />
      </View>
    );
  }

  if (state === 'loading') {
    return <View style={styles.fill} />;
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

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
