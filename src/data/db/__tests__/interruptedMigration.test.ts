import {
  runPendingMigrations,
  type MigrationDriver,
  type MigrationsData,
} from '../migrationRunner';
import { createInMemoryFixture, type MigrationFixture } from '../testUtils';

/**
 * T012: proves the transaction-per-migration design (docs/ARCHITECTURE.md's
 * Migration Strategy) protects data when a migration is interrupted partway
 * through. The interruption is simulated as a crash between statements — the
 * driver throws after some of the migration's writes have executed — not as
 * invalid SQL, so the rolled-back statements are all individually valid.
 */

const migrationsData: MigrationsData = {
  journal: {
    entries: [
      { idx: 0, when: 1, tag: '0000_base', breakpoints: true },
      { idx: 1, when: 2, tag: '0001_addition', breakpoints: true },
    ],
  },
  migrations: {
    m0000:
      'CREATE TABLE schema_migrations (version integer primary key, applied_at text not null);' +
      '--> statement-breakpoint' +
      'CREATE TABLE note (id integer primary key, body text not null);',
    m0001:
      'CREATE TABLE tag (id integer primary key, label text not null);' +
      '--> statement-breakpoint' +
      "INSERT INTO tag (label) VALUES ('written before the crash');" +
      '--> statement-breakpoint' +
      'ALTER TABLE note ADD COLUMN tag_id integer;',
  },
};

/** Wraps a driver so execAsync crashes after `statements` successful calls. */
function interruptAfter(driver: MigrationDriver, statements: number): MigrationDriver {
  let executed = 0;
  return {
    ...driver,
    execAsync: async (sql) => {
      if (executed >= statements) {
        throw new Error('simulated crash: process killed mid-migration');
      }
      executed += 1;
      await driver.execAsync(sql);
    },
  };
}

/**
 * Migrates to version 0, seeds a fixture row, then attempts migration 1 with
 * a driver that crashes after 2 of its 3 statements have written.
 */
async function runInterruptedScenario(): Promise<{
  fixture: MigrationFixture;
  failedRun: Promise<void>;
}> {
  const fixture = createInMemoryFixture();
  await runPendingMigrations(fixture.driver, migrationsData, { upToVersion: 0 });
  fixture.sqlite.prepare('INSERT INTO note (body) VALUES (?)').run('pre-existing user data');

  const failedRun = runPendingMigrations(interruptAfter(fixture.driver, 2), migrationsData);
  return { fixture, failedRun };
}

describe('interrupted migration recovery', () => {
  it('rolls back the interrupted migration fully, leaving prior data untouched', async () => {
    const { fixture, failedRun } = await runInterruptedScenario();

    await expect(failedRun).rejects.toThrow('simulated crash');

    // Both partial writes of migration 1 (CREATE TABLE tag + its INSERT)
    // rolled back with the transaction, even though they had executed.
    const tables = fixture.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tag'")
      .all();
    expect(tables).toHaveLength(0);

    // The migration was not recorded as applied.
    const versions = fixture.sqlite.prepare('SELECT version FROM schema_migrations').all();
    expect(versions).toEqual([{ version: 0 }]);

    // Data written before the interrupted migration is untouched.
    const notes = fixture.sqlite.prepare('SELECT body FROM note').all();
    expect(notes).toEqual([{ body: 'pre-existing user data' }]);

    fixture.sqlite.close();
  });

  it('retries the rolled-back migration successfully on the next startup', async () => {
    const { fixture, failedRun } = await runInterruptedScenario();
    await expect(failedRun).rejects.toThrow('simulated crash');

    // Next launch: same migrations, no crash this time.
    await expect(runPendingMigrations(fixture.driver, migrationsData)).resolves.toBeUndefined();

    // The retried migration applied completely...
    const tags = fixture.sqlite.prepare('SELECT label FROM tag').all();
    expect(tags).toEqual([{ label: 'written before the crash' }]);
    const noteColumns = fixture.sqlite
      .prepare('PRAGMA table_info(note)')
      .all()
      .map((row) => (row as { name: string }).name);
    expect(noteColumns).toContain('tag_id');

    // ...was recorded exactly once, and prior data still survived.
    const versions = fixture.sqlite.prepare('SELECT version FROM schema_migrations').all();
    expect(versions).toEqual([{ version: 0 }, { version: 1 }]);
    const notes = fixture.sqlite.prepare('SELECT body FROM note').all();
    expect(notes).toEqual([{ body: 'pre-existing user data' }]);

    fixture.sqlite.close();
  });
});
