// One gentle local daily reminder (T092). Local-only: expo-notifications is
// used purely as a scheduler for an on-device trigger — no push token is
// requested, no network call happens anywhere in this path. This is the one
// deliberate reversal of docs/MVP_SCOPE.md's notifications exclusion, and it
// covers *local* notifications only; remote/push, morning reports, and
// evening reports stay out of scope.
//
// Tone, per docs/DESIGN_SYSTEM.md: the copy is an invitation, never a
// reminder that something was missed. It must not name a missed day, a
// streak at risk, or a number — that is why the text is a fixed constant
// here rather than anything derived from routine state.

import * as Notifications from 'expo-notifications';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { profile } from '../data/db/schema';
import {
  getReminderSetting,
  updateReminderSetting,
  type ReminderSetting,
} from '../data/repositories/profileRepository';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type ReminderDb = BaseSQLiteDatabase<'sync', unknown, { profile: typeof profile }>;

/** Android notification channel id. Stable: changing it would orphan the
 * user's per-channel system settings (sound, importance) silently. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

export const REMINDER_TITLE = 'Zeit für deine Routinen';
export const REMINDER_BODY = 'Ein kurzer Moment für dich — schau rein, wenn es passt.';

/**
 * The outcome of a reminder change. Every failure mode is a value rather
 * than an exception: a denied OS permission is an ordinary, recoverable
 * situation the Me screen has to render (T093), not an error.
 *
 * - `scheduled` — the reminder is on and exactly one trigger is scheduled.
 * - `cancelled` — the reminder is off and nothing is scheduled.
 * - `permission-denied` — the OS refused; the stored setting stays off.
 * - `failed` — the platform rejected the schedule call; the stored setting
 *   stays off, so the UI never claims a reminder that does not exist.
 */
export type ReminderResult =
  | { status: 'scheduled'; time: string }
  | { status: 'cancelled' }
  | { status: 'permission-denied' }
  | { status: 'failed'; error: unknown };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses a stored local `HH:mm`, returning null for anything malformed. */
export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Formats a picked Date as the stored local `HH:mm`. */
export function formatReminderTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Creates (or updates) the Android channel the reminder is delivered on.
 * Idempotent, and a no-op on other platforms — expo-notifications' own
 * implementation ignores the call where channels do not exist, which keeps
 * iOS compatibility possible without a platform branch here.
 */
async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Tägliche Erinnerung',
    importance: Notifications.AndroidImportance.DEFAULT,
    // Deliberately gentle: the default sound, a short vibration, and the
    // sage accent light rather than anything attention-grabbing.
    vibrationPattern: [0, 200],
    lightColor: '#3F7256',
  });
}

/**
 * Asks for notification permission, prompting only if it has not been
 * decided yet. Re-prompting an already-denied permission is a no-op on
 * Android, so this reports the stored decision instead of pretending to ask.
 */
async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }
  if (!existing.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Cancels every scheduled notification. The app schedules exactly one
 * notification ever, so cancelling all of them is both equivalent to
 * cancelling ours and strictly more robust than tracking an identifier:
 * after a reinstall-restore the stored id would be stale, and a leaked
 * duplicate from an earlier version would otherwise never be cleaned up.
 * This is what guarantees "exactly one scheduled trigger at a time".
 */
async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedules the single repeating daily trigger. Always cancel-then-schedule,
 * so changing the time replaces the reminder rather than adding a second one.
 */
async function scheduleAt(time: string): Promise<void> {
  const parsed = parseReminderTime(time);
  if (!parsed) {
    throw new Error(`Invalid reminder time: ${time}`);
  }

  await ensureChannel();
  await cancelAll();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour: parsed.hour,
      minute: parsed.minute,
    },
  });
}

/**
 * Turns the reminder on at `time` (local `HH:mm`), or moves an already-on
 * reminder to a new time — the same path either way, because both are
 * "cancel whatever is scheduled, schedule one trigger, persist".
 *
 * The setting is persisted only after scheduling succeeds, so a denied
 * permission or a platform failure can never leave the stored state claiming
 * a reminder that the OS is not going to deliver.
 */
export async function enableReminder(
  db: ReminderDb,
  profileId: string,
  time: string,
): Promise<ReminderResult> {
  if (!parseReminderTime(time)) {
    return { status: 'failed', error: new Error(`Invalid reminder time: ${time}`) };
  }

  let granted: boolean;
  try {
    granted = await ensurePermission();
  } catch (error) {
    return { status: 'failed', error };
  }

  if (!granted) {
    // Leave the stored setting off rather than throwing, per T092's
    // acceptance criteria — the caller renders a recoverable message.
    await updateReminderSetting(db, profileId, { enabled: false, time: null });
    return { status: 'permission-denied' };
  }

  try {
    await scheduleAt(time);
  } catch (error) {
    await updateReminderSetting(db, profileId, { enabled: false, time: null });
    return { status: 'failed', error };
  }

  await updateReminderSetting(db, profileId, { enabled: true, time });
  return { status: 'scheduled', time };
}

/** Turns the reminder off and cancels the scheduled trigger. */
export async function disableReminder(
  db: ReminderDb,
  profileId: string,
): Promise<ReminderResult> {
  try {
    await cancelAll();
  } catch (error) {
    return { status: 'failed', error };
  }
  await updateReminderSetting(db, profileId, { enabled: false, time: null });
  return { status: 'cancelled' };
}

/**
 * Re-applies the stored reminder on app start. Android drops scheduled
 * alarms on reboot and a backup restore brings the setting back without the
 * schedule, so without this the reminder would silently stop firing with the
 * UI still showing it as on.
 *
 * Never prompts: startup is the wrong moment to ask for a permission the
 * user did not just request. If permission has since been revoked in system
 * settings the stored setting is turned off, so the Me screen tells the truth.
 */
export async function rescheduleReminderOnStart(db: ReminderDb): Promise<ReminderResult> {
  let setting: ReminderSetting;
  try {
    setting = await getReminderSetting(db);
  } catch (error) {
    return { status: 'failed', error };
  }

  if (!setting.enabled || !setting.time) {
    return { status: 'cancelled' };
  }

  const [row] = await db.select().from(profile).limit(1);
  if (!row) {
    return { status: 'cancelled' };
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      await cancelAll();
      await updateReminderSetting(db, row.id, { enabled: false, time: null });
      return { status: 'permission-denied' };
    }
    await scheduleAt(setting.time);
  } catch (error) {
    return { status: 'failed', error };
  }

  return { status: 'scheduled', time: setting.time };
}
