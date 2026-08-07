// Device-side wiring for import (T054). The safety-critical ordering lives in
// import.ts and is unit-tested with fake ports; this file only supplies the
// real ones. Keep it thin — it cannot run under Jest.

import { File } from 'expo-file-system';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '../../../migrations/migrations';
import { expoDb } from '../db/client';
import { createExpoBackupDriver, deleteWalSidecars, toFileUri } from './expoDriver';
import { writeSafetyBackup } from './export';
import { readSchemaVersion } from './serialize';
import { runImport, type ImportPorts, type ImportResult, type TempDatabase } from './import';

/** Name of the scratch database that import populates before the swap. */
const TEMP_DATABASE_NAME = 'habithelper-import.db';

/** Highest migration version this build knows how to apply. */
function supportedSchemaVersion(): number {
  return migrations.journal.entries.reduce((highest, entry) => Math.max(highest, entry.idx), 0);
}

/** The directory expo-sqlite keeps databases in, derived from the live one. */
function databaseDirectory(): string {
  return expoDb.databasePath.replace(/[^/]+$/, '');
}

function tempDatabasePath(): string {
  return `${databaseDirectory()}${TEMP_DATABASE_NAME}`;
}

/** Deletes a database file and its WAL sidecars, if present. */
function deleteDatabaseFiles(path: string): void {
  const file = new File(toFileUri(path));
  if (file.exists) {
    file.delete();
  }
  deleteWalSidecars(path);
}

function createTempDatabase(): TempDatabase {
  // A previous crashed import can leave this file behind; populating a
  // database that already holds rows would corrupt the restore, so it is
  // cleared before opening rather than after.
  deleteDatabaseFiles(tempDatabasePath());

  const database = openDatabaseSync(TEMP_DATABASE_NAME);
  database.execSync('PRAGMA foreign_keys = ON;');
  let closed = false;

  const close = async () => {
    if (!closed) {
      database.closeSync();
      closed = true;
    }
  };

  return {
    driver: createExpoBackupDriver(database),
    close,
    discard: async () => {
      await close();
      deleteDatabaseFiles(tempDatabasePath());
    },
  };
}

/**
 * The swap: replaces the live database file with the fully populated, verified
 * temp file.
 *
 * Both connections are closed first — SQLite must not hold either file open
 * across the move — and the live database's WAL sidecars are deleted. The
 * connection runs in WAL mode (src/data/db/client.ts), so leaving
 * `habithelper.db-wal` in place would have SQLite reconcile the freshly
 * imported file against the *old* database's write-ahead log, corrupting
 * exactly the data the import was meant to restore.
 *
 * After this returns the process holds a closed `expoDb` handle and every
 * subsequent query would throw, so the app must be restarted. The Settings
 * screen enforces that with a blocking "restart required" state.
 */
async function swapIntoPlace(temp: TempDatabase): Promise<void> {
  const livePath = expoDb.databasePath;
  const tempPath = tempDatabasePath();

  await temp.close();
  expoDb.closeSync();

  deleteWalSidecars(livePath);
  const liveFile = new File(toFileUri(livePath));
  if (liveFile.exists) {
    liveFile.delete();
  }

  await new File(toFileUri(tempPath)).move(new File(toFileUri(livePath)));
  deleteWalSidecars(tempPath);
}

export function createExpoImportPorts(): ImportPorts {
  return {
    readSourceText: async () => {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled) {
        return null;
      }
      return picked.result.text();
    },
    // The higher of "what this build ships" and "what the live database has
    // applied": a database somehow ahead of this build must not be told it can
    // accept an even newer backup.
    currentSchemaVersion: async () => {
      const applied = await readSchemaVersion(createExpoBackupDriver(expoDb));
      return Math.max(applied, supportedSchemaVersion());
    },
    writeSafetyBackup,
    createTempDatabase: async () => createTempDatabase(),
    swapIntoPlace,
  };
}

/**
 * Imports a backup the user picks. Resolves with `cancelled` if they back out
 * of the picker, otherwise with the safety backup's path. On success the app
 * must be restarted before any further database access.
 */
export function importBackup(): Promise<ImportResult> {
  return runImport(createExpoImportPorts());
}
