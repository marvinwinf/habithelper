// Reusable migration test harness (TASKS.md's T010). expo-sqlite's native
// module can't run under Jest (see docs/TEST_STRATEGY.md), so every
// migration-related test runs against better-sqlite3 instead, as a
// same-SQL-dialect stand-in. This module is the one place that adapts
// better-sqlite3 to the MigrationDriver interface, so individual test files
// don't each hand-roll their own database + driver setup.
//
// Use `createMigratedFixture()` for the common case (a database migrated to
// current); use `createInMemoryFixture()` directly when a test needs to
// observe a migration attempt that's expected to fail partway through.

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import realMigrations from '../../../migrations/migrations';
import * as schema from './schema';
import {
  runPendingMigrations,
  type MigrationDriver,
  type MigrationsData,
} from './migrationRunner';

export interface MigrationFixture {
  sqlite: Database.Database;
  driver: MigrationDriver;
}

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

/** A fresh in-memory SQLite database with no migrations applied yet. */
export function createInMemoryFixture(): MigrationFixture {
  const sqlite = new Database(':memory:');
  // Mirror the production connection (client.ts): FK violations must fail in
  // tests exactly as they would on-device, or FK-breaking repository code
  // would pass CI and crash in the real app.
  sqlite.pragma('foreign_keys = ON');
  return { sqlite, driver: createDriver(sqlite) };
}

export interface CreateMigratedFixtureOptions {
  /** Run only migrations up to (and including) this version first, to
   * simulate a database stuck on an older schema. Omit to start from a
   * completely empty database (pre-0000_init). */
  seedAtVersion?: number;
  /** Run against the driver once `seedAtVersion` is reached, before
   * migrating the rest of the way to current — e.g. INSERT fixture rows
   * matching that older schema's shape, to prove a later migration
   * preserves them. */
  seedFixture?: (driver: MigrationDriver) => Promise<void>;
  /** Defaults to the real committed migrations/migrations.js; override with
   * fabricated journal/migrations data to test the runner's behavior in
   * isolation (e.g. a deliberately broken migration). */
  migrationsData?: MigrationsData;
}

/**
 * Seeds a fresh in-memory SQLite database at a given schema version with
 * optional fixture data, then runs migrations up to current. The standard
 * entry point for migration tests — use this instead of hand-rolling a
 * better-sqlite3 database and driver per test file.
 */
export async function createMigratedFixture(
  options: CreateMigratedFixtureOptions = {},
): Promise<MigrationFixture> {
  const migrationsData = options.migrationsData ?? realMigrations;
  const fixture = createInMemoryFixture();

  if (options.seedAtVersion !== undefined) {
    await runPendingMigrations(fixture.driver, migrationsData, {
      upToVersion: options.seedAtVersion,
    });
  }
  if (options.seedFixture) {
    await options.seedFixture(fixture.driver);
  }
  await runPendingMigrations(fixture.driver, migrationsData);

  return fixture;
}

export function getTableNames(fixture: MigrationFixture): string[] {
  return fixture.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);
}

export function getTableColumns(
  fixture: MigrationFixture,
  table: string,
): Record<string, { notnull: number; pk: number }> {
  const rows = fixture.sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
    notnull: number;
    pk: number;
  }[];
  return Object.fromEntries(rows.map((row) => [row.name, { notnull: row.notnull, pk: row.pk }]));
}

export function getForeignKeyTargets(fixture: MigrationFixture, table: string): string[] {
  const rows = fixture.sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all() as {
    table: string;
  }[];
  return rows.map((row) => row.table).sort();
}

export function getAppliedVersions(fixture: MigrationFixture): number[] {
  const rows = fixture.sqlite.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {
    version: number;
  }[];
  return rows.map((row) => row.version);
}

export interface DrizzleTestDb {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
}

/**
 * A fresh in-memory database migrated to current, wrapped with Drizzle's
 * query builder (schema-bound), for testing repositories. Repositories
 * accept any sync-dialect SQLite drizzle database, so this same-SQL-dialect
 * stand-in exercises the real query-building code, not just raw SQL —
 * expo-sqlite's native module cannot run under Jest (docs/TEST_STRATEGY.md).
 */
export async function createDrizzleTestDb(): Promise<DrizzleTestDb> {
  const { sqlite } = await createMigratedFixture();
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
