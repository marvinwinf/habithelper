// The database ↔ OS-schedule seam: what is stored, and what is scheduled as
// a consequence. Runs against a real (better-sqlite3) database per
// docs/TEST_STRATEGY.md, with the native notification ports faked.

import { createDrizzleTestDb } from '../../data/db/testUtils';
import {
  ensureProfile,
  updateReminderSettings,
} from '../../data/repositories/profileRepository';
import type { ReminderTime } from '../../domain/notifications/reminderTime';
import type { ReminderPermission, ReminderPorts } from '../notifications/reminderScheduler';
import { saveReminderSettings, syncStoredReminder } from '../reminderService';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-profile-id'),
}));

interface FakePorts extends ReminderPorts {
  scheduled: ReminderTime[];
  permission: ReminderPermission;
  requestCount: number;
}

function createPorts(permission: ReminderPermission = 'granted'): FakePorts {
  const ports: FakePorts = {
    scheduled: [],
    permission,
    requestCount: 0,
    async getPermission() {
      return ports.permission;
    },
    async requestPermission() {
      ports.requestCount += 1;
      ports.permission = 'granted';
      return ports.permission;
    },
    async ensureChannel() {},
    async scheduleDaily(time) {
      ports.scheduled.push(time);
    },
    async cancelDaily() {
      ports.scheduled.length = 0;
    },
  };
  return ports;
}

describe('saveReminderSettings', () => {
  it('stores the choice and schedules it', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    const ports = createPorts();

    const result = await saveReminderSettings(
      db,
      profile.id,
      { enabled: true, time: '06:15' },
      ports,
    );

    expect(result).toEqual({ status: 'scheduled', time: { hour: 6, minute: 15 } });
    const stored = await ensureProfile(db);
    expect(stored).toMatchObject({ reminderEnabled: true, reminderTime: '06:15' });

    sqlite.close();
  });

  it('keeps the stored choice when the OS refuses notifications', async () => {
    // A revoked permission must not silently erase what the user asked for —
    // granting it later has to bring the reminder back on its own.
    const { db, sqlite } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    const ports = createPorts('denied');

    const result = await saveReminderSettings(
      db,
      profile.id,
      { enabled: true, time: '06:15' },
      ports,
    );

    expect(result).toEqual({ status: 'permission-missing' });
    expect(await ensureProfile(db)).toMatchObject({ reminderEnabled: true, reminderTime: '06:15' });
    expect(ports.scheduled).toEqual([]);

    sqlite.close();
  });

  it('cancels the schedule when the reminder is switched off', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    const ports = createPorts();

    await saveReminderSettings(db, profile.id, { enabled: true, time: '06:15' }, ports);
    const result = await saveReminderSettings(
      db,
      profile.id,
      { enabled: false, time: '06:15' },
      ports,
    );

    expect(result).toEqual({ status: 'disabled' });
    expect(ports.scheduled).toEqual([]);
    expect(await ensureProfile(db)).toMatchObject({ reminderEnabled: false, reminderTime: '06:15' });

    sqlite.close();
  });
});

describe('syncStoredReminder', () => {
  it('re-applies the stored reminder, which is what heals the schedule after a restore', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    await updateReminderSettings(db, profile.id, { enabled: true, time: '21:45' });
    const ports = createPorts();

    const result = await syncStoredReminder(db, ports);

    expect(result).toEqual({ status: 'scheduled', time: { hour: 21, minute: 45 } });
    expect(ports.scheduled).toEqual([{ hour: 21, minute: 45 }]);

    sqlite.close();
  });

  it('schedules nothing on a fresh profile — reminders are opt-in', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const ports = createPorts('undetermined');

    const result = await syncStoredReminder(db, ports);

    expect(result).toEqual({ status: 'disabled' });
    expect(ports.scheduled).toEqual([]);
    // And startup must never raise the system permission prompt.
    expect(ports.requestCount).toBe(0);

    sqlite.close();
  });
});
