// Shared shapes for the backup file format (docs/ARCHITECTURE.md's Backup and
// Restore Architecture, docs/DATA_PERSISTENCE.md's Backup and Restore).
//
// A backup is plain JSON — deliberately not a raw SQLite file copy — so an
// older backup stays portable across schema migrations: on import it is
// replayed into a database that has been migrated to the *current* schema,
// rather than restoring a frozen binary at whatever schema it was taken.

/**
 * Every table whose contents travel in a backup, in a FK-safe insert order
 * (parents before children). `schema_migrations` is deliberately absent: the
 * target database's version is established by running migrations, and the
 * source version travels in the manifest instead.
 *
 * `routine_event.superseded_by_event_id` is a *forward* self-reference (an
 * older event points at the newer event that replaced it), so no ordering of
 * rows within `routine_event` can satisfy it — import defers foreign-key
 * enforcement to COMMIT instead (see populate.ts).
 */
export const BACKUP_TABLE_NAMES = [
  'profile',
  'category',
  'routine',
  'task',
  'routine_event',
  'routine_state_cache',
  'app_streak_cache',
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

/** A single row, as SQLite returns it: only primitive column values. */
export type BackupRow = Record<string, string | number | null>;

export interface BackupManifest {
  /** Highest applied migration version at export time (docs/DATA_MODEL.md's
   * Schema Versioning) — the compatibility gate on import. */
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
}

export interface BackupFile {
  manifest: BackupManifest;
  tables: Record<BackupTableName, BackupRow[]>;
}

/**
 * The narrow read surface backup serialization needs. Structurally satisfied
 * by both the production expo-sqlite driver and better-sqlite3 in tests, so
 * the serialization logic itself is engine-agnostic and unit-testable
 * (expo-sqlite's native module cannot run under Jest — docs/TEST_STRATEGY.md).
 */
export interface BackupReadDriver {
  getAllAsync<T>(sql: string): Promise<T[]>;
}

/**
 * The write surface import needs, on a *fresh* target database. Mirrors
 * `MigrationDriver` so the same better-sqlite3 adapter used by migration
 * tests drives import tests too.
 */
export interface BackupWriteDriver extends BackupReadDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: (string | number | null)[]): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
