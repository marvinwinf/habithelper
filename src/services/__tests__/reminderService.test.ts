// T092. expo-notifications is mocked globally in jest.setup.js (its native
// module cannot run under Jest, per docs/TEST_STRATEGY.md); the database is a
// real better-sqlite3 engine, so persistence is genuinely exercised.
//
// The two properties these tests exist to protect:
//   1. exactly one scheduled trigger at a time — cancel always precedes
//      schedule, so changing the time replaces rather than duplicates;
//   2. the stored setting never claims a reminder the OS will not deliver —
//      a denied permission or a failed schedule leaves it off.

import * as Notifications from 'expo-notifications';
import { createDrizzleTestDb, type DrizzleTestDb } from '../../data/db/testUtils';
import { ensureProfile, getReminderSetting } from '../../data/repositories/profileRepository';
import {
  disableReminder,
  enableReminder,
  formatReminderTime,
  parseReminderTime,
  rescheduleReminderOnStart,
  REMINDER_BODY,
  REMINDER_CHANNEL_ID,
  REMINDER_TITLE,
} from '../reminderService';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-profile-id'),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

/** The order of the cancel/schedule calls, which is the whole point of the
 * "exactly one trigger" guarantee — asserting both were called is not enough. */
function callOrder(): string[] {
  const order: [string, number][] = [];
  for (const [name, fn] of [
    ['cancel', mocked.cancelAllScheduledNotificationsAsync],
    ['schedule', mocked.scheduleNotificationAsync],
  ] as const) {
    for (const call of fn.mock.invocationCallOrder) {
      order.push([name, call]);
    }
  }
  return order.sort((a, b) => a[1] - b[1]).map(([name]) => name);
}

function grantPermission(): void {
  mocked.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted',
  } as never);
}

function undecidedPermission(): void {
  mocked.getPermissionsAsync.mockResolvedValue({
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  } as never);
}

describe('reminderService', () => {
  let fixture: DrizzleTestDb;
  let profileId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    grantPermission();
    mocked.requestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: 'granted',
    } as never);
    mocked.scheduleNotificationAsync.mockResolvedValue('scheduled-notification-id');
    mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    mocked.setNotificationChannelAsync.mockResolvedValue(null as never);

    fixture = await createDrizzleTestDb();
    profileId = (await ensureProfile(fixture.db)).id;
  });

  afterEach(() => {
    fixture.sqlite.close();
  });

  describe('time helpers', () => {
    it('parses a valid local HH:mm', () => {
      expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
      expect(parseReminderTime('20:30')).toEqual({ hour: 20, minute: 30 });
      expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    });

    it('rejects malformed or out-of-range times', () => {
      for (const bad of ['', '7:05', '24:00', '20:60', '20:3', 'abc', '20:30:00']) {
        expect(parseReminderTime(bad)).toBeNull();
      }
    });

    it('formats a picked Date as zero-padded local HH:mm', () => {
      expect(formatReminderTime(new Date(2026, 0, 1, 7, 5))).toBe('07:05');
      expect(formatReminderTime(new Date(2026, 0, 1, 20, 30))).toBe('20:30');
    });
  });

  describe('enableReminder', () => {
    it('creates the channel, cancels, then schedules exactly one daily trigger and persists', async () => {
      const result = await enableReminder(fixture.db, profileId, '20:30');

      expect(result).toEqual({ status: 'scheduled', time: '20:30' });
      expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
        REMINDER_CHANNEL_ID,
        expect.objectContaining({ name: expect.any(String) }),
      );
      expect(callOrder()).toEqual(['cancel', 'schedule']);
      expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: REMINDER_TITLE, body: REMINDER_BODY },
        trigger: {
          type: 'daily',
          channelId: REMINDER_CHANNEL_ID,
          hour: 20,
          minute: 30,
        },
      });
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: true, time: '20:30' });
    });

    it('uses gentle copy that never names a missed day or a streak', () => {
      // docs/DESIGN_SYSTEM.md: the reminder is an invitation. Guarding the
      // copy here because a later "helpful" edit is exactly how guilt
      // wording creeps in.
      const copy = `${REMINDER_TITLE} ${REMINDER_BODY}`.toLowerCase();
      for (const forbidden of ['verpasst', 'streak', 'serie', 'vergessen', 'nicht', 'verlier']) {
        expect(copy).not.toContain(forbidden);
      }
    });

    it('prompts for permission only when it has not been decided yet', async () => {
      undecidedPermission();

      await enableReminder(fixture.db, profileId, '08:00');

      expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('does not prompt again when permission is already granted', async () => {
      await enableReminder(fixture.db, profileId, '08:00');

      expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('replaces rather than duplicates the trigger when the time changes', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      jest.clearAllMocks();
      grantPermission();
      mocked.scheduleNotificationAsync.mockResolvedValue('scheduled-notification-id');
      mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);

      const result = await enableReminder(fixture.db, profileId, '07:05');

      expect(result).toEqual({ status: 'scheduled', time: '07:05' });
      expect(callOrder()).toEqual(['cancel', 'schedule']);
      expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ hour: 7, minute: 5 }),
        }),
      );
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: true, time: '07:05' });
    });

    it('leaves the setting off and schedules nothing when permission is denied', async () => {
      mocked.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
        status: 'undetermined',
      } as never);
      mocked.requestPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      } as never);

      const result = await enableReminder(fixture.db, profileId, '20:30');

      expect(result).toEqual({ status: 'permission-denied' });
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: false, time: null });
    });

    it('reports a permanently denied permission without prompting', async () => {
      mocked.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      } as never);

      const result = await enableReminder(fixture.db, profileId, '20:30');

      expect(result).toEqual({ status: 'permission-denied' });
      expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('returns a recoverable failure (not a throw) when scheduling is rejected', async () => {
      const error = new Error('no exact alarm permission');
      mocked.scheduleNotificationAsync.mockRejectedValue(error);

      const result = await enableReminder(fixture.db, profileId, '20:30');

      expect(result).toEqual({ status: 'failed', error });
      // The stored setting must not claim a reminder the OS refused.
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: false, time: null });
    });

    it('rejects an invalid time without touching the OS', async () => {
      const result = await enableReminder(fixture.db, profileId, '25:00');

      expect(result.status).toBe('failed');
      expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: false, time: null });
    });
  });

  describe('disableReminder', () => {
    it('cancels the trigger and clears the stored setting', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      jest.clearAllMocks();
      mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);

      const result = await disableReminder(fixture.db, profileId);

      expect(result).toEqual({ status: 'cancelled' });
      expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: false, time: null });
    });

    it('keeps the setting on when cancelling fails, so the UI still matches reality', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      const error = new Error('cancel failed');
      mocked.cancelAllScheduledNotificationsAsync.mockRejectedValue(error);

      const result = await disableReminder(fixture.db, profileId);

      expect(result).toEqual({ status: 'failed', error });
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: true, time: '20:30' });
    });
  });

  describe('rescheduleReminderOnStart', () => {
    it('re-applies a stored reminder as a single trigger', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      jest.clearAllMocks();
      grantPermission();
      mocked.scheduleNotificationAsync.mockResolvedValue('scheduled-notification-id');
      mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);

      const result = await rescheduleReminderOnStart(fixture.db);

      expect(result).toEqual({ status: 'scheduled', time: '20:30' });
      expect(callOrder()).toEqual(['cancel', 'schedule']);
      expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('schedules nothing when the reminder is off', async () => {
      const result = await rescheduleReminderOnStart(fixture.db);

      expect(result).toEqual({ status: 'cancelled' });
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('never prompts for permission at startup', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      jest.clearAllMocks();
      undecidedPermission();

      await rescheduleReminderOnStart(fixture.db);

      expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('turns the stored setting off when permission was revoked in system settings', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      jest.clearAllMocks();
      mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
      mocked.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      } as never);

      const result = await rescheduleReminderOnStart(fixture.db);

      expect(result).toEqual({ status: 'permission-denied' });
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
      // Otherwise the Me screen would keep showing a reminder that can
      // never fire again.
      expect(await getReminderSetting(fixture.db)).toEqual({ enabled: false, time: null });
    });

    it('does nothing when there is no profile row yet', async () => {
      const empty = await createDrizzleTestDb();

      const result = await rescheduleReminderOnStart(empty.db);

      expect(result).toEqual({ status: 'cancelled' });
      expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();

      empty.sqlite.close();
    });

    it('reports a failure rather than throwing into app startup', async () => {
      await enableReminder(fixture.db, profileId, '20:30');
      const error = new Error('scheduler unavailable');
      mocked.scheduleNotificationAsync.mockRejectedValue(error);

      await expect(rescheduleReminderOnStart(fixture.db)).resolves.toEqual({
        status: 'failed',
        error,
      });
    });
  });
});
