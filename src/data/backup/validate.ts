// Backup validation (T052). Completely pure: it takes text or parsed JSON and
// returns a typed `BackupFile` or throws. It never touches a database, which
// is the property that makes "no write occurs on an invalid backup" provable
// rather than merely tested — there is nothing here that *could* write.

import {
  BACKUP_TABLE_NAMES,
  type BackupFile,
  type BackupManifest,
  type BackupRow,
  type BackupTableName,
} from './types';

/** Base class so the import UI can catch every validation failure at once. */
export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

/** The file isn't JSON at all, or isn't a JSON object. */
export class BackupParseError extends BackupValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'BackupParseError';
  }
}

/** JSON, but not shaped like a backup (missing manifest/tables/fields). */
export class BackupStructureError extends BackupValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'BackupStructureError';
  }
}

/**
 * The backup was taken by a *newer* app version than this one. Importing it
 * would mean applying rows shaped by migrations this build does not have —
 * rejected before any write, per docs/ARCHITECTURE.md's Validate step.
 */
export class BackupFutureSchemaError extends BackupValidationError {
  constructor(
    readonly backupSchemaVersion: number,
    readonly currentSchemaVersion: number,
  ) {
    super(
      `Backup was created with schema version ${backupSchemaVersion}, but this app supports up to ${currentSchemaVersion}.`,
    );
    this.name = 'BackupFutureSchemaError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateManifest(raw: unknown): BackupManifest {
  if (!isPlainObject(raw)) {
    throw new BackupStructureError('Backup is missing its manifest.');
  }
  const { schemaVersion, exportedAt, appVersion } = raw;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 0) {
    throw new BackupStructureError('Backup manifest has no valid schemaVersion.');
  }
  if (typeof exportedAt !== 'string' || exportedAt.length === 0) {
    throw new BackupStructureError('Backup manifest has no valid exportedAt.');
  }
  if (typeof appVersion !== 'string') {
    throw new BackupStructureError('Backup manifest has no valid appVersion.');
  }
  return { schemaVersion, exportedAt, appVersion };
}

function validateRows(table: BackupTableName, raw: unknown): BackupRow[] {
  if (!Array.isArray(raw)) {
    throw new BackupStructureError(`Backup table "${table}" is not an array.`);
  }
  return raw.map((row, index) => {
    if (!isPlainObject(row)) {
      throw new BackupStructureError(`Backup table "${table}" row ${index} is not an object.`);
    }
    for (const [column, value] of Object.entries(row)) {
      // SQLite columns hold primitives only. Anything else (nested object,
      // array, undefined) means the file was hand-edited or produced by
      // something other than this app — reject rather than silently coercing.
      if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
        throw new BackupStructureError(
          `Backup table "${table}" row ${index} column "${column}" has an unsupported value type.`,
        );
      }
    }
    return row as BackupRow;
  });
}

/**
 * Validates parsed JSON against the backup contract, newest-first: the
 * manifest's schema version is checked before structure, so a future-version
 * backup reports *that* rather than a confusing missing-table error caused by
 * tables this build doesn't know about yet.
 */
export function validateBackup(raw: unknown, currentSchemaVersion: number): BackupFile {
  if (!isPlainObject(raw)) {
    throw new BackupParseError('Backup file is not a JSON object.');
  }

  const manifest = validateManifest(raw.manifest);
  if (manifest.schemaVersion > currentSchemaVersion) {
    throw new BackupFutureSchemaError(manifest.schemaVersion, currentSchemaVersion);
  }

  if (!isPlainObject(raw.tables)) {
    throw new BackupStructureError('Backup is missing its tables.');
  }

  const tables = {} as Record<BackupTableName, BackupRow[]>;
  for (const table of BACKUP_TABLE_NAMES) {
    if (!(table in raw.tables)) {
      throw new BackupStructureError(`Backup is missing table "${table}".`);
    }
    tables[table] = validateRows(table, raw.tables[table]);
  }

  return { manifest, tables };
}

/** Parses raw file text, then validates it. */
export function parseAndValidateBackup(text: string, currentSchemaVersion: number): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupParseError('Backup file is not valid JSON.');
  }
  return validateBackup(parsed, currentSchemaVersion);
}
