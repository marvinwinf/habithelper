// Pure helpers for the daily reminder's wall-clock time (T091). Kept in
// src/domain so it stays free of React/React Native/Expo imports per
// docs/ARCHITECTURE.md — the scheduling side effects live in
// src/services/notifications.

/** Used for a fresh profile and whenever a stored value is unusable. */
export const DEFAULT_REMINDER_TIME = '08:00';

export interface ReminderTime {
  /** 0–23, local time. */
  hour: number;
  /** 0–59, local time. */
  minute: number;
}

const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

/**
 * Parses `HH:mm` into hour/minute, or returns `null` when the value is not a
 * valid time. Callers must handle `null` rather than scheduling a notification
 * at a guessed time: the column is plain TEXT and a backup written by an older
 * build (or hand-edited by the user, since backups are readable JSON) can
 * legitimately carry something else.
 */
export function parseReminderTime(value: string): ReminderTime | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

/** Formats hour/minute back into the stored `HH:mm` form. */
export function formatReminderTime(time: ReminderTime): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(time.hour)}:${pad(time.minute)}`;
}

/**
 * The stored value, normalized: a malformed or out-of-range time falls back to
 * the default instead of disabling the reminder silently.
 */
export function normalizeReminderTime(value: string): string {
  const parsed = parseReminderTime(value);
  return parsed ? formatReminderTime(parsed) : DEFAULT_REMINDER_TIME;
}
