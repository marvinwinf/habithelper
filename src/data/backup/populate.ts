// Fills a *fresh* database from a validated backup (part of T054). Never runs
// against the live database: import builds a separate file, populates it here,
// verifies it, and only then swaps it into place (docs/ARCHITECTURE.md's
// Backup and Restore Architecture). Engine-agnostic via BackupWriteDriver, so
// it is unit-testable against better-sqlite3.

import migrations from '../../../migrations/migrations';
import { runPendingMigrations } from '../db/migrationRunner';
import { BACKUP_TABLE_NAMES, type BackupFile, type BackupWriteDriver, type BackupRow } from './types';

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupImportError';
  }
}

function buildInsert(table: string, row: BackupRow): { sql: string; params: (string | number | null)[] } {
  const columns = Object.keys(row);
  if (columns.length === 0) {
    throw new BackupImportError(`Backup table "${table}" contains a row with no columns.`);
  }
  const placeholders = columns.map(() => '?').join(', ');
  // Column names originate from the backup file, so they are quoted rather
  // than interpolated bare. A name containing a double quote cannot survive
  // SQLite identifier quoting, so it is rejected outright — a legitimate
  // export never produces one.
  for (const column of columns) {
    if (column.includes('"')) {
      throw new BackupImportError(`Backup table "${table}" has an invalid column name.`);
    }
  }
  const quoted = columns.map((column) => `"${column}"`).join(', ');
  return {
    sql: `INSERT INTO ${table} (${quoted}) VALUES (${placeholders})`,
    params: columns.map((column) => row[column]),
  };
}

/**
 * Migrates the target database to the current schema, then inserts every
 * backup row into it.
 *
 * Two deliberate details:
 *
 * 1. **Migrations run first, then rows are inserted.** That is what makes an
 *    older backup importable at all (docs/ARCHITECTURE.md: backups are JSON so
 *    they stay portable across migrations) — the rows land in a
 *    current-schema database, and columns added since the export simply take
 *    their schema defaults.
 * 2. **Foreign keys are deferred to COMMIT**, not disabled.
 *    `routine_event.superseded_by_event_id` points *forward* at the newer
 *    event that replaced an older one, so no row ordering can satisfy it
 *    during insertion. Deferring keeps full referential validation at COMMIT,
 *    where a backup with genuinely dangling references still fails loudly.
 */
export async function populateFromBackup(
  driver: BackupWriteDriver,
  backup: BackupFile,
): Promise<void> {
  await runPendingMigrations(driver, migrations);

  await driver.withTransactionAsync(async () => {
    await driver.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const table of BACKUP_TABLE_NAMES) {
      for (const row of backup.tables[table]) {
        const { sql, params } = buildInsert(table, row);
        await driver.runAsync(sql, params);
      }
    }
  });
}

/**
 * Re-reads the populated database and asserts every table's row count matches
 * the backup. This runs *before* the file is swapped over the live database,
 * so a short write or a silently rejected row is caught while the live data is
 * still untouched (T054's "completely written and re-verified").
 */
export async function verifyPopulated(
  driver: BackupWriteDriver,
  backup: BackupFile,
): Promise<void> {
  for (const table of BACKUP_TABLE_NAMES) {
    const rows = await driver.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    const actual = rows[0]?.count ?? 0;
    const expected = backup.tables[table].length;
    if (actual !== expected) {
      throw new BackupImportError(
        `Imported database failed verification: table "${table}" has ${actual} rows, expected ${expected}.`,
      );
    }
  }
}
