import { createDrizzleTestDb } from '../../db/testUtils';
import { ensureProfile } from '../profileRepository';

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
