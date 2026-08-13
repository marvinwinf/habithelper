// Orchestration between the stored reminder settings (profile row) and the
// OS-level schedule, per docs/ARCHITECTURE.md's Repository and Service
// Boundaries: screens call this, never the repository or expo-notifications
// directly.

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { profile } from '../data/db/schema';
import {
  ensureProfile,
  readReminderSettings,
  updateReminderSettings,
  type ReminderSettings,
} from '../data/repositories/profileRepository';
import { expoReminderPorts } from './notifications/expoReminders';
import {
  enableDailyReminder,
  syncDailyReminder,
  type ReminderPorts,
  type ReminderSyncResult,
} from './notifications/reminderScheduler';

type ProfileDb = BaseSQLiteDatabase<'sync', unknown, { profile: typeof profile }>;

/**
 * Re-applies the stored settings to the OS schedule. Called at startup so the
 * reminder heals itself after a reinstall, a restored backup, or a revoked
 * notification permission — the schedule lives in the OS, the truth lives in
 * the database, and this is the one place that reconciles the two.
 */
export async function syncStoredReminder(
  db: ProfileDb,
  ports: ReminderPorts = expoReminderPorts,
): Promise<ReminderSyncResult> {
  const row = await ensureProfile(db);
  return syncDailyReminder(ports, readReminderSettings(row));
}

/**
 * Persists a settings change and applies it. Enabling asks for the
 * notification permission first (see `enableDailyReminder`); the setting is
 * stored either way, so a user who grants the permission later gets their
 * reminder back on the next startup sync without re-entering anything.
 */
export async function saveReminderSettings(
  db: ProfileDb,
  profileId: string,
  settings: ReminderSettings,
  ports: ReminderPorts = expoReminderPorts,
): Promise<ReminderSyncResult> {
  await updateReminderSettings(db, profileId, settings);
  return settings.enabled
    ? enableDailyReminder(ports, settings.time)
    : syncDailyReminder(ports, settings);
}
