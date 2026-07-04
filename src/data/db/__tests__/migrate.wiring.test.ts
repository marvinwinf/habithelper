import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../../../migrations/migrations';
import { runMigrations } from '../migrate';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({ execSync: jest.fn() })),
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({})),
}));
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({
  migrate: jest.fn(),
}));

/**
 * expo-sqlite's native module can't run under Jest (see docs/TEST_STRATEGY.md
 * and migrate.test.ts), so migrate.ts's actual startup wiring is otherwise
 * never exercised by any test. Mocking expo-sqlite/drizzle-orm's expo-sqlite
 * bindings lets us prove the two things that previously could only break
 * silently on-device: the relative import path to migrations/migrations
 * resolves to the real generated file, and runMigrations() passes that real
 * migrations object through to drizzle's migrator unchanged.
 */
describe('runMigrations startup wiring', () => {
  it('calls migrate with the real generated migrations object', async () => {
    await runMigrations();

    expect(migrate).toHaveBeenCalledTimes(1);
    expect(migrate).toHaveBeenCalledWith(expect.anything(), migrations);
  });
});
