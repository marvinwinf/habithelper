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

    // Driven off the real journal rather than a hardcoded list, so adding a
    // migration does not require editing this test to keep it honest.
    const entries = [...migrations.journal.entries].sort((a, b) => a.idx - b.idx);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const key = `m${String(entry.idx).padStart(4, '0')}` as keyof typeof migrations.migrations;
      const [firstStatement] = migrations.migrations[key].split('--> statement-breakpoint');
      expect(mockDb.execAsync).toHaveBeenCalledWith(firstStatement.trim());
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [entry.idx, expect.any(String)],
      );
    }
    // One transaction per migration (see migrationRunner.ts).
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(entries.length);
  });
});
