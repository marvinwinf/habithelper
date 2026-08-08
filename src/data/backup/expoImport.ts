// Device-side wiring for import (T054). The safety-critical ordering lives in
// import.ts and is unit-tested with fake ports; this file only supplies the
// real ones. Keep it thin — it cannot run under Jest.

import { File } from 'expo-file-system';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '../../../migrations/migrations';
import { expoDb } from '../db/client';
import { createExpoBackupDriver, deleteWalSidecars, toFileUri } from './expoDriver';
import { writeSafetyBackup } from './export';
import { runImport, type ImportPorts, type ImportResult, type TempDatabase } from './import';
import { markDatabaseClosed } from '../../state/databaseLifecycle';

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
  const supersededPath = `${livePath}.superseded`;

  await temp.close();
  expoDb.closeSync();
  // Flagged the moment the connection closes, not after the swap succeeds:
  // from here on every query in this process would throw, whichever way the
  // rest of this function goes.
  markDatabaseClosed();
  deleteWalSidecars(livePath);

  // The old database is stepped aside, not deleted. Deleting it first left a
  // window with no database at all: if the move below then failed (no space,
  // I/O error, denied rename), runImport's cleanup discarded the populated
  // temp file too and the user lost everything — while the UI still told them
  // their data was untouched. Moving it aside means that window has a
  // recovery path, taken below.
  if (new File(toFileUri(supersededPath)).exists) {
    new File(toFileUri(supersededPath)).delete();
  }
  const hadLiveFile = new File(toFileUri(livePath)).exists;
  if (hadLiveFile) {
    await new File(toFileUri(livePath)).move(new File(toFileUri(supersededPath)));
  }

  try {
    await new File(toFileUri(tempPath)).move(new File(toFileUri(livePath)));
  } catch (error) {
    // Put the original back before reporting the failure, so "your data was
    // not changed" stays true.
    if (hadLiveFile && new File(toFileUri(supersededPath)).exists) {
      await new File(toFileUri(supersededPath)).move(new File(toFileUri(livePath)));
    }
    throw error;
  }

  deleteWalSidecars(tempPath);
  if (new File(toFileUri(supersededPath)).exists) {
    new File(toFileUri(supersededPath)).delete();
  }
}

export interface ExpoImportOptions {
  /**
   * Allows the import to proceed when the *live* database cannot be read.
   *
   * Normally the pre-import safety backup is a precondition — it is the
   * rollback path for an unwanted import. But the one moment a restore
   * matters most is exactly when the live database is broken (a failed
   * migration, a corrupt file), and in that state it cannot be read to back
   * it up. Refusing to import then would make the backup useless precisely
   * when it is needed.
   *
   * With this set, a safety backup that cannot be produced is reported
   * (`NO_SAFETY_BACKUP`) rather than thrown: there is no readable data left
   * to protect, so failing the restore over its absence would protect
   * nothing.
   */
  tolerateUnreadableLiveDatabase?: boolean;
}

/** Reported as the safety backup path when there was no readable data to save. */
export const NO_SAFETY_BACKUP = 'none';

export function createExpoImportPorts(options: ExpoImportOptions = {}): ImportPorts {
  const tolerant = options.tolerateUnreadableLiveDatabase ?? false;

  return {
    readSourceText: async () => {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled) {
        return null;
      }
      return picked.result.text();
    },
    // Strictly what *this build* can apply. An import is replayed into a
    // fresh database that this build migrates (populate.ts), so the live
    // database's own applied version has no bearing on which backups are
    // acceptable. Mixing it in was actively wrong: after an APK rollback the
    // live database can sit at a higher version than the build supports, and
    // taking the maximum let a too-new backup past the gate only to fail deep
    // inside populate with a generic error.
    currentSchemaVersion: async () => supportedSchemaVersion(),
    writeSafetyBackup: async () => {
      try {
        return await writeSafetyBackup();
      } catch (error) {
        if (!tolerant) {
          throw error;
        }
        return NO_SAFETY_BACKUP;
      }
    },
    createTempDatabase: async () => createTempDatabase(),
    swapIntoPlace,
  };
}

/**
 * Imports a backup the user picks. Resolves with `cancelled` if they back out
 * of the picker, otherwise with the safety backup's path. On success the app
 * must be restarted before any further database access.
 */
export function importBackup(options: ExpoImportOptions = {}): Promise<ImportResult> {
  return runImport(createExpoImportPorts(options));
}
