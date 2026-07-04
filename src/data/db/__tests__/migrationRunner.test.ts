import migrations from '../../../../migrations/migrations';
import { runPendingMigrations, type MigrationsData } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableNames } from '../testUtils';

describe('runPendingMigrations', () => {
  it('applies the real migration on first launch and records it in schema_migrations', async () => {
    const { sqlite } = await createMigratedFixture();

    const rows = sqlite.prepare('SELECT version, applied_at FROM schema_migrations').all() as {
      version: number;
      applied_at: string;
    }[];
    expect(rows).toEqual([{ version: 0, applied_at: expect.any(String) }]);
    expect(() => new Date(rows[0].applied_at).toISOString()).not.toThrow();

    sqlite.close();
  });

  it('is a no-op on a second run against an already-migrated database', async () => {
    const fixture = await createMigratedFixture();

    // A re-run would try to CREATE TABLE profile (etc.) again and throw if
    // the skip logic didn't work, so simply not throwing is part of the proof.
    await expect(runPendingMigrations(fixture.driver, migrations)).resolves.toBeUndefined();

    const rows = fixture.sqlite.prepare('SELECT version FROM schema_migrations').all();
    expect(rows).toHaveLength(1);

    fixture.sqlite.close();
  });

  it('runs each migration in its own transaction, isolating a failure to only that migration', async () => {
    const fixture = createInMemoryFixture();

    const twoMigrations: MigrationsData = {
      journal: {
        entries: [
          { idx: 0, when: 1, tag: '0000_ok', breakpoints: true },
          { idx: 1, when: 2, tag: '0001_broken', breakpoints: true },
        ],
      },
      migrations: {
        m0000:
          'CREATE TABLE ok_table (id integer primary key);' +
          '--> statement-breakpoint' +
          'CREATE TABLE schema_migrations (version integer primary key, applied_at text not null);',
        m0001: 'CREATE TABLE this_is_not_valid_sql (;',
      },
    };

    // Asserted via a plain truthy check rather than .rejects.toThrow(): a
    // native module (better-sqlite3) loaded from a different test file's own
    // Jest VM realm can produce a SqliteError that fails `instanceof Error`
    // here, which .toThrow() relies on — a Jest/native-addon quirk, not a
    // bug in the rejection itself.
    await expect(runPendingMigrations(fixture.driver, twoMigrations)).rejects.toBeTruthy();

    const tables = getTableNames(fixture);
    // The first migration's own transaction committed independently...
    expect(tables).toContain('ok_table');
    // ...while the second migration's table-creation attempt rolled back
    // before its schema_migrations row was ever inserted.
    expect(tables).not.toContain('this_is_not_valid_sql');

    const rows = fixture.sqlite.prepare('SELECT version FROM schema_migrations').all() as {
      version: number;
    }[];
    expect(rows.map((row) => row.version)).toEqual([0]);

    fixture.sqlite.close();
  });
});
