import { createDrizzleTestDb } from '../../db/testUtils';
import {
  ensureProfile,
  getReminderSetting,
  updateDisplayName,
  updateReminderSetting,
} from '../profileRepository';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-profile-id'),
}));

describe('ensureProfile', () => {
  it('creates exactly one profile row on first call and returns the existing one on subsequent calls', async () => {
    const { sqlite, db } = await createDrizzleTestDb();

    const first = await ensureProfile(db);
    const second = await ensureProfile(db);

    expect(first).toEqual(second);
    expect(first.displayName).toBe('Nutzer');
    expect(first.id).toBe('test-profile-id');
    // The reminder is opt-in (T092): a fresh profile must not look enabled.
    expect(first.reminderEnabled).toBe(false);
    expect(first.reminderTime).toBeNull();

    const rows = sqlite.prepare('SELECT * FROM profile').all();
    expect(rows).toHaveLength(1);

    sqlite.close();
  });
});

describe('updateDisplayName', () => {
  it('persists a new display name for the given profile id', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);

    await updateDisplayName(db, profile.id, 'Alex');

    const rows = sqlite.prepare('SELECT * FROM profile').all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as { display_name: string }).display_name).toBe('Alex');

    sqlite.close();
  });
});

describe('reminder setting', () => {
  it('round-trips an enabled reminder time', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);

    await updateReminderSetting(db, profile.id, { enabled: true, time: '20:30' });

    expect(await getReminderSetting(db)).toEqual({ enabled: true, time: '20:30' });
    // Asserted at the column level too, so a Drizzle boolean-mode change
    // can't make a stored 0 read back as `true`.
    expect(
      sqlite.prepare('SELECT reminder_enabled, reminder_time FROM profile').get(),
    ).toEqual({ reminder_enabled: 1, reminder_time: '20:30' });

    sqlite.close();
  });

  it('clears the time when the reminder is turned off', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    await updateReminderSetting(db, profile.id, { enabled: true, time: '07:05' });

    await updateReminderSetting(db, profile.id, { enabled: false, time: null });

    expect(await getReminderSetting(db)).toEqual({ enabled: false, time: null });

    sqlite.close();
  });

  it('reads as off before anything has been stored', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    await ensureProfile(db);

    expect(await getReminderSetting(db)).toEqual({ enabled: false, time: null });

    sqlite.close();
  });

  it('reads as off when no profile row exists at all', async () => {
    const { sqlite, db } = await createDrizzleTestDb();

    expect(await getReminderSetting(db)).toEqual({ enabled: false, time: null });

    sqlite.close();
  });

  it('refuses to enable the reminder without a time', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);

    await expect(
      updateReminderSetting(db, profile.id, { enabled: true, time: null }),
    ).rejects.toThrow(/without a time/);
    expect(await getReminderSetting(db)).toEqual({ enabled: false, time: null });

    sqlite.close();
  });
});
