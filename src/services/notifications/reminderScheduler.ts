// Orchestration for the daily routine reminder (T091), deliberately free of
// native imports so every guarantee below is unit-testable with fakes — the
// same split `src/data/backup/import.ts` uses against `expoImport.ts`. The
// real ports live in `expoReminders.ts`.
//
// The app schedules exactly ONE local notification: a repeating daily
// reminder at the user's chosen time. There is no server, no push token, and
// no remote delivery — enabling the reminder must never make the app reach
// the network (docs/PROJECT_PRINCIPLES.md's local-first architecture).

import {
  parseReminderTime,
  type ReminderTime,
} from '../../domain/notifications/reminderTime';

/**
 * Stable identifier for the one scheduled reminder, so a re-sync replaces the
 * previous schedule instead of stacking a second notification on top of it.
 */
export const DAILY_REMINDER_IDENTIFIER = 'habithelper-daily-reminder';

/**
 * Deliberately gentle and never accusing: the reminder must not read as a
 * reprimand for an unfinished day (docs/DESIGN_SYSTEM.md's Gamification —
 * "no punishment for a missed day"). It also cannot name what is still open:
 * the text is fixed when the notification is scheduled, not when it fires.
 */
export const DAILY_REMINDER_CONTENT = {
  title: 'Zeit für deine Routinen',
  body: 'Ein kleiner Schritt zählt schon.',
};

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/** The narrow native surface the reminder needs. */
export interface ReminderPorts {
  getPermission(): Promise<ReminderPermission>;
  requestPermission(): Promise<ReminderPermission>;
  /** Creates/updates the Android notification channel the reminder posts to. */
  ensureChannel(): Promise<void>;
  scheduleDaily(time: ReminderTime): Promise<void>;
  cancelDaily(): Promise<void>;
}

export type ReminderSyncResult =
  /** A reminder is scheduled for this time. */
  | { status: 'scheduled'; time: ReminderTime }
  /** Nothing is scheduled because the user has the reminder switched off. */
  | { status: 'disabled' }
  /**
   * The user wants a reminder but the OS does not allow notifications, so
   * nothing is scheduled. The stored setting is left alone: revoking the
   * permission in Android's settings should not silently erase the user's
   * choice, and the UI surfaces this state instead.
   */
  | { status: 'permission-missing' };

export interface ReminderSettingsInput {
  enabled: boolean;
  /** `HH:mm` as stored on the profile. */
  time: string;
}

/**
 * Brings the OS-level schedule in line with the stored settings. Safe to call
 * repeatedly — it always cancels the existing reminder first, so it converges
 * whether it runs at startup, after a settings change, or after an import
 * replaced the database.
 */
export async function syncDailyReminder(
  ports: ReminderPorts,
  settings: ReminderSettingsInput,
): Promise<ReminderSyncResult> {
  if (!settings.enabled) {
    await ports.cancelDaily();
    return { status: 'disabled' };
  }

  const time = parseReminderTime(settings.time);
  if (!time) {
    // An unparseable stored time cannot be scheduled. Treated as "off" rather
    // than guessed at, so the app never wakes the user at a time they did not
    // pick; the Settings screen still shows the stored value for them to fix.
    await ports.cancelDaily();
    return { status: 'disabled' };
  }

  if ((await ports.getPermission()) !== 'granted') {
    await ports.cancelDaily();
    return { status: 'permission-missing' };
  }

  await ports.ensureChannel();
  await ports.cancelDaily();
  await ports.scheduleDaily(time);
  return { status: 'scheduled', time };
}

/**
 * Turning the reminder on: asks for the notification permission the first
 * time (Android 13+ requires it), then schedules. The permission prompt is
 * raised here — at the moment the user asks for a reminder — never at app
 * startup, where it would arrive with no context.
 */
export async function enableDailyReminder(
  ports: ReminderPorts,
  time: string,
): Promise<ReminderSyncResult> {
  const current = await ports.getPermission();
  // 'denied' is not re-requested: Android will not show the system prompt a
  // second time, so the request would resolve denied without any UI and the
  // user would be left tapping a switch that does nothing. The screen points
  // them at the system settings instead.
  if (current === 'undetermined') {
    await ports.requestPermission();
  }

  return syncDailyReminder(ports, { enabled: true, time });
}
