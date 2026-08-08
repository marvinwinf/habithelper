// Wires the day-rollover watcher to the real app: AppState for foreground
// events, the live database for reconciliation. Kept separate from
// dayRolloverWatcher.ts because importing the database client pulls in
// expo-sqlite's native module, which cannot load under Jest
// (docs/TEST_STRATEGY.md) — the logic itself is tested through the factory.

import { AppState } from 'react-native';

import { db } from '../data/db/client';
import { todayDateString } from '../domain/dates';
import { reconcileAllActiveRoutines } from '../services/reconciliationService';
import { createDayRolloverWatcher } from './dayRolloverWatcher';

/**
 * Note on coverage: this listens for the app being *foregrounded*, which
 * covers the realistic case (backgrounded overnight, or the screen switched
 * off and back on — Android reports both through AppState). An app left
 * literally in the foreground across midnight is not covered; adding a timer
 * for it would mean a wake-up whose only job is to catch a case the very next
 * screen-off already handles.
 */
export const dayRolloverWatcher = createDayRolloverWatcher({
  getToday: todayDateString,
  reconcile: (today) => reconcileAllActiveRoutines(db, today),
  onAppResume: (handler) => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        handler();
      }
    });
    return () => subscription.remove();
  },
});

/**
 * Notifies a screen after a rollover reconciliation, so it can reload. Without
 * this a resumed screen keeps rendering the previous day's data until
 * something else happens to refocus it.
 */
export const subscribeToDayRollover = dayRolloverWatcher.subscribe;
