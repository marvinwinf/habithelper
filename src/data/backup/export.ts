// Backup export, device side (T051). Serialization itself lives in
// serialize.ts and is unit-tested; this file only writes the result to a file
// and hands it to the OS share sheet.

import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { expoDb } from '../db/client';
import { createExpoBackupDriver } from './expoDriver';
import { backupFileName, buildBackup, serializeBackup } from './serialize';

/** Where pre-import safety backups live — app-private, never user-facing. */
export const SAFETY_BACKUP_DIRECTORY = 'safety-backups';

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

/**
 * Writes a backup of the live database to the given file and returns it.
 * Shared by the user-facing export and the automatic pre-import safety backup
 * so both produce byte-identical formats — a safety backup is a real backup,
 * importable through the normal flow.
 */
async function writeBackupTo(file: File): Promise<File> {
  const driver = createExpoBackupDriver(expoDb);
  const backup = await buildBackup(driver, { appVersion: appVersion() });
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(serializeBackup(backup));
  return file;
}

/**
 * Exports a backup and opens the share sheet so the user can put the file
 * somewhere durable (docs/MVP_SCOPE.md's Data Management).
 *
 * The file is written to the cache directory: once it has been shared out it
 * is the user's copy that matters, and letting the system reclaim the
 * scratch copy is preferable to silently growing app storage on every export.
 *
 * Returns the file's URI. If sharing is unavailable the file is still written
 * and its URI returned, so the caller can tell the user where it landed
 * rather than failing outright.
 */
export async function exportBackup(): Promise<{ uri: string; shared: boolean }> {
  const name = backupFileName(new Date().toISOString());
  const file = await writeBackupTo(new File(Paths.cache, name));

  if (!(await Sharing.isAvailableAsync())) {
    return { uri: file.uri, shared: false };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Backup teilen',
    UTI: 'public.json',
  });
  return { uri: file.uri, shared: true };
}

/**
 * Writes the automatic pre-import safety backup (T053) into app-private
 * storage. Timestamped, so successive imports never overwrite each other's
 * escape hatch.
 */
export async function writeSafetyBackup(): Promise<string> {
  const directory = new Directory(Paths.document, SAFETY_BACKUP_DIRECTORY);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  const name = `safety-${backupFileName(new Date().toISOString())}`;
  const file = await writeBackupTo(new File(directory, name));
  return file.uri;
}
