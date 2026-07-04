import { createDrizzleTestDb } from '../../db/testUtils';
import { ensureProfile, updateDisplayName } from '../profileRepository';

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
});
