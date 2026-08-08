// The one place that adapts expo-sqlite and expo-file-system to the backup
// module's engine-agnostic interfaces. Everything else under src/data/backup/
// stays free of native imports so it can run under Jest (expo-sqlite's native
// module cannot — docs/TEST_STRATEGY.md); this file is correspondingly thin
// and is exercised by the on-device manual checklist rather than unit tests.

import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackupWriteDriver } from './types';

/** Wraps an expo-sqlite handle in the driver shape the backup module uses. */
export function createExpoBackupDriver(database: SQLiteDatabase): BackupWriteDriver {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: async (sql, params) => {
      await database.runAsync(sql, params);
    },
    getAllAsync: (sql) => database.getAllAsync(sql),
    withTransactionAsync: (task) => database.withTransactionAsync(task),
  };
}

/**
 * expo-sqlite reports absolute filesystem paths (`SQLiteDatabase.databasePath`)
 * while expo-file-system's `File` takes `file:///` URIs. Everything downstream
 * assumes URIs, so paths are normalized here rather than at each call site.
 */
export function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Deletes a SQLite database's write-ahead-log sidecars.
 *
 * This is not optional bookkeeping. The live connection runs in WAL mode
 * (src/data/db/client.ts), so `habithelper.db-wal` and `habithelper.db-shm`
 * hold committed pages that belong to the *old* database. Moving a new file
 * over `habithelper.db` while those sidecars survive would leave SQLite
 * reconciling a fresh database against a stale WAL — corrupting exactly the
 * data the import was meant to restore.
 */
export function deleteWalSidecars(databasePath: string): void {
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = new File(toFileUri(`${databasePath}${suffix}`));
    if (sidecar.exists) {
      sidecar.delete();
    }
  }
}
