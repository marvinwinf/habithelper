import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { EXPECTED_TABLE_NAMES } from '../expectedTables';

/**
 * T008: proves the committed 0001_init migration (see migrations/0000_init.sql
 * — Drizzle Kit's own zero-indexed naming, per TASKS.md's T008 allowance)
 * applies cleanly to a fresh, empty database. Uses better-sqlite3 as a
 * same-SQL-dialect stand-in for expo-sqlite, since expo-sqlite's native
 * module cannot run under Jest (see docs/TEST_STRATEGY.md).
 */
describe('initial schema migration', () => {
  it('applies cleanly to an empty database and creates every entity table', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite);

    migrate(db, {
      migrationsFolder: path.join(__dirname, '../../../../migrations'),
    });

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name)
      // Drizzle's own migration-tracking table, not part of the app schema.
      .filter((name) => name !== '__drizzle_migrations');

    expect(tables).toEqual(EXPECTED_TABLE_NAMES);

    sqlite.close();
  });
});
