import { createDrizzleTestDb } from '../../db/testUtils';
import {
  ensureProfile,
  readReminderSettings,
  updateDisplayName,
  updateReminderSettings,
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

  it('leaves the reminder settings untouched', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    await updateReminderSettings(db, profile.id, { enabled: true, time: '21:15' });

    await updateDisplayName(db, profile.id, 'Alex');

    expect(readReminderSettings(await ensureProfile(db))).toEqual({
      enabled: true,
      time: '21:15',
    });

    sqlite.close();
  });
});

describe('reminder settings', () => {
  it('start off at the default time on a fresh profile', async () => {
    const { sqlite, db } = await createDrizzleTestDb();

    const profile = await ensureProfile(db);

    expect(readReminderSettings(profile)).toEqual({ enabled: false, time: '08:00' });

    sqlite.close();
  });

  it('persist a chosen time and survive a re-read', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);

    await updateReminderSettings(db, profile.id, { enabled: true, time: '06:45' });

    // Re-read through ensureProfile: this is the path every screen and the
    // startup sync take, so it proves the setting is genuinely persisted
    // rather than only held in the object returned by the update.
    expect(readReminderSettings(await ensureProfile(db))).toEqual({
      enabled: true,
      time: '06:45',
    });

    sqlite.close();
  });

  it('keep the chosen time when the reminder is switched off', async () => {
    const { sqlite, db } = await createDrizzleTestDb();
    const profile = await ensureProfile(db);
    await updateReminderSettings(db, profile.id, { enabled: true, time: '06:45' });

    await updateReminderSettings(db, profile.id, { enabled: false, time: '06:45' });

    expect(readReminderSettings(await ensureProfile(db))).toEqual({
      enabled: false,
      time: '06:45',
    });

    sqlite.close();
  });
});
