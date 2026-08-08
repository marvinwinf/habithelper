// Backup serialization (T051). Pure with respect to the filesystem: it reads
// through a driver and returns a `BackupFile`, so the whole thing is unit-
// testable against better-sqlite3 (docs/TEST_STRATEGY.md's Data Tests) and
// the expo-file-system/expo-sharing wiring stays in export.ts.

import {
  BACKUP_TABLE_NAMES,
  type BackupFile,
  type BackupReadDriver,
  type BackupRow,
  type BackupTableName,
} from './types';

export class BackupExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupExportError';
  }
}

/**
 * Reads the highest applied migration version — the manifest's
 * `schemaVersion` (docs/DATA_MODEL.md's Schema Versioning). A database with
 * no applied migrations cannot be exported meaningfully; that is a
 * programming error (export is only ever reachable after startup migrations),
 * so it throws rather than writing a backup that claims version 0.
 */
export async function readSchemaVersion(driver: BackupReadDriver): Promise<number> {
  const rows = await driver.getAllAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  const version = rows[0]?.version;
  if (version === undefined || version === null) {
    throw new BackupExportError('Database has no applied migrations; refusing to export.');
  }
  return version;
}

export interface BuildBackupOptions {
  /** App version recorded in the manifest, supplied by the caller so this
   * module stays free of expo-constants. */
  appVersion: string;
  /** Injectable for deterministic tests. */
  now?: Date;
}

/**
 * Serializes every persistent table (docs/DATA_PERSISTENCE.md's Persistent
 * Data list) plus a manifest. Rows are read in `rowid` order so two exports of
 * an unchanged database produce byte-identical files — which is what makes the
 * pre-import safety backup verifiable.
 */
export async function buildBackup(
  driver: BackupReadDriver,
  options: BuildBackupOptions,
): Promise<BackupFile> {
  const schemaVersion = await readSchemaVersion(driver);

  const tables = {} as Record<BackupTableName, BackupRow[]>;
  for (const table of BACKUP_TABLE_NAMES) {
    // Table names come from the frozen BACKUP_TABLE_NAMES tuple, never from
    // user input, so this interpolation carries no injection surface.
    tables[table] = await driver.getAllAsync<BackupRow>(`SELECT * FROM ${table} ORDER BY rowid`);
  }

  return {
    manifest: {
      schemaVersion,
      exportedAt: (options.now ?? new Date()).toISOString(),
      appVersion: options.appVersion,
    },
    tables,
  };
}

/** Pretty-printed so a user who opens the file can read their own data. */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** `habithelper-backup-2026-08-07T12-30-00.json` — sorts chronologically. */
export function backupFileName(exportedAt: string): string {
  return `habithelper-backup-${exportedAt.replace(/[:.]/g, '-')}.json`;
}
