import Database from 'better-sqlite3';
import migrations from '../../../../migrations/migrations';
import { runPendingMigrations, type MigrationDriver, type MigrationsData } from '../migrationRunner';

function createDriver(sqlite: Database.Database): MigrationDriver {
  return {
    execAsync: async (sql) => {
      sqlite.exec(sql);
    },
    runAsync: async (sql, params) => {
      sqlite.prepare(sql).run(...params);
    },
    getAllAsync: async <T>(sql: string) => sqlite.prepare(sql).all() as T[],
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

describe('runPendingMigrations', () => {
  it('applies the real migration on first launch and records it in schema_migrations', async () => {
    const sqlite = new Database(':memory:');
    const driver = createDriver(sqlite);

    await runPendingMigrations(driver, migrations);

    const rows = sqlite.prepare('SELECT version, applied_at FROM schema_migrations').all() as {
      version: number;
      applied_at: string;
    }[];
    expect(rows).toEqual([{ version: 0, applied_at: expect.any(String) }]);
    expect(() => new Date(rows[0].applied_at).toISOString()).not.toThrow();

    sqlite.close();
  });

  it('is a no-op on a second run against an already-migrated database', async () => {
    const sqlite = new Database(':memory:');
    const driver = createDriver(sqlite);

    await runPendingMigrations(driver, migrations);
    // A re-run would try to CREATE TABLE profile (etc.) again and throw if
    // the skip logic didn't work, so simply not throwing is part of the proof.
    await expect(runPendingMigrations(driver, migrations)).resolves.toBeUndefined();

    const rows = sqlite.prepare('SELECT version FROM schema_migrations').all();
    expect(rows).toHaveLength(1);

    sqlite.close();
  });

  it('runs each migration in its own transaction, isolating a failure to only that migration', async () => {
    const sqlite = new Database(':memory:');
    const driver = createDriver(sqlite);

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

    await expect(runPendingMigrations(driver, twoMigrations)).rejects.toThrow();

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    // The first migration's own transaction committed independently...
    expect(tables).toContain('ok_table');
    // ...while the second migration's table-creation attempt rolled back
    // before its schema_migrations row was ever inserted.
    expect(tables).not.toContain('this_is_not_valid_sql');

    const rows = sqlite.prepare('SELECT version FROM schema_migrations').all() as {
      version: number;
    }[];
    expect(rows.map((row) => row.version)).toEqual([0]);

    sqlite.close();
  });
});
