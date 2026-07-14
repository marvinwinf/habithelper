import { openDatabaseSync } from 'expo-sqlite';
import migrations from '../../../../migrations/migrations';
import { runMigrations } from '../migrate';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    // Empty result simulates a fresh database: schema_migrations doesn't
    // exist yet, so the runner should attempt every migration.
    getAllAsync: jest.fn(async () => []),
    withTransactionAsync: jest.fn((task: () => Promise<void>) => task()),
  })),
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({})),
}));

/**
 * expo-sqlite's native module can't run under Jest (see docs/TEST_STRATEGY.md
 * and migrate.test.ts), so migrate.ts's actual startup wiring is otherwise
 * never exercised by any test. Mocking expo-sqlite's SQLiteDatabase surface
 * lets us prove runMigrations() wires the real generated migrations.js
 * content through to the app's own schema_migrations-tracked runner.
 */
describe('runMigrations startup wiring', () => {
  it('runs the real generated migration SQL and records it in schema_migrations', async () => {
    await runMigrations();

    const mockOpenDatabaseSync = openDatabaseSync as jest.Mock;
    const mockDb = mockOpenDatabaseSync.mock.results[0].value;

    const realSql = migrations.migrations.m0000;
    const [firstStatement] = realSql.split('--> statement-breakpoint');
    expect(mockDb.execAsync).toHaveBeenCalledWith(firstStatement.trim());
    expect(mockDb.execAsync).toHaveBeenCalledWith(migrations.migrations.m0001.trim());
    const [firstPlanStatement] = migrations.migrations.m0002.split('--> statement-breakpoint');
    expect(mockDb.execAsync).toHaveBeenCalledWith(firstPlanStatement.trim());
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      [0, expect.any(String)],
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      [1, expect.any(String)],
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      [2, expect.any(String)],
    );
    // One transaction per migration (see migrationRunner.ts).
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(3);
  });
});
