// Import orchestration (T054). Deliberately free of expo-sqlite and
// expo-file-system imports: every side effect is reached through the
// `ImportPorts` interface, so the *ordering guarantees* that make import safe
// — validate before anything, safety backup before any database is touched,
// swap only after verification — are unit-testable with fake ports
// (docs/TEST_STRATEGY.md's "failed import recovery"). expoBackup.ts supplies
// the real ports.

import { populateFromBackup, verifyPopulated } from './populate';
import { parseAndValidateBackup } from './validate';
import type { BackupFile, BackupWriteDriver } from './types';

/** A freshly created, empty database file that is not the live one. */
export interface TempDatabase {
  driver: BackupWriteDriver;
  /** Closes the connection, leaving the file in place for the swap. */
  close(): Promise<void>;
  /** Closes (if still open) and deletes the temp file. Safe to call twice. */
  discard(): Promise<void>;
}

export interface ImportPorts {
  /** Returns the chosen file's text, or `null` if the user cancelled. */
  readSourceText(): Promise<string | null>;
  /** Highest migration version this build can apply. */
  currentSchemaVersion(): Promise<number>;
  /** Writes the app-private pre-import safety backup; returns its path. */
  writeSafetyBackup(): Promise<string>;
  createTempDatabase(): Promise<TempDatabase>;
  /** Atomically moves the temp database over the live one. After this
   * resolves the live connection is closed and the app must be restarted. */
  swapIntoPlace(temp: TempDatabase): Promise<void>;
}

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'imported'; safetyBackupPath: string; backup: BackupFile };

/**
 * Runs an import end to end.
 *
 * Ordering is the whole point of this function:
 *
 * 1. **Read and validate first.** Validation is pure (validate.ts touches no
 *    database), so a malformed or future-schema file is rejected while
 *    everything — live database *and* filesystem — is still untouched. This
 *    also means no safety backup is written for a file that was never
 *    importable in the first place.
 * 2. **Safety backup next**, before any database work begins (T053).
 * 3. **Populate and verify a separate temp database.** The live database is
 *    never written to; a failure here leaves it untouched by construction,
 *    not by rollback (docs/ARCHITECTURE.md).
 * 4. **Swap last**, only after verification passed.
 *
 * If anything fails from step 3 onward the temp database is discarded and the
 * error is rethrown with the live database still intact and the safety backup
 * on disk as a second line of defense.
 */
export async function runImport(ports: ImportPorts): Promise<ImportResult> {
  const text = await ports.readSourceText();
  if (text === null) {
    return { status: 'cancelled' };
  }

  const currentSchemaVersion = await ports.currentSchemaVersion();
  const backup = parseAndValidateBackup(text, currentSchemaVersion);

  const safetyBackupPath = await ports.writeSafetyBackup();

  const temp = await ports.createTempDatabase();
  try {
    await populateFromBackup(temp.driver, backup);
    await verifyPopulated(temp.driver, backup);
    await ports.swapIntoPlace(temp);
  } catch (error) {
    // Best-effort cleanup: the import already failed, and a leftover temp
    // file must not mask the real error on its way to the user.
    await temp.discard().catch(() => undefined);
    throw error;
  }

  return { status: 'imported', safetyBackupPath, backup };
}
