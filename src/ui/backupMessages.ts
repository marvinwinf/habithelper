// User-facing copy for backup failures. Lives in the UI layer (per
// docs/ARCHITECTURE.md, src/data must not own presentation) but is kept out of
// the screen itself so the mapping from error type to message is unit-tested
// rather than only reachable by driving the UI.

import { BackupExportError } from '../data/backup/serialize';
import { BackupImportError } from '../data/backup/populate';
import {
  BackupFutureSchemaError,
  BackupParseError,
  BackupStructureError,
} from '../data/backup/validate';

/**
 * Every import failure path leaves the live database untouched — validation
 * runs before any write, and population happens in a separate file that is
 * only swapped in after it verifies (docs/ARCHITECTURE.md's Backup and Restore
 * Architecture). T055 requires the UI to say so explicitly, so every message
 * here ends by confirming no data was lost.
 */
const NOTHING_LOST = 'Deine Daten wurden nicht verändert.';

export function describeImportError(error: unknown): string {
  if (error instanceof BackupFutureSchemaError) {
    return `Dieses Backup stammt aus einer neueren App-Version (Schema ${error.backupSchemaVersion}). Aktualisiere die App, um es zu importieren. ${NOTHING_LOST}`;
  }
  if (error instanceof BackupParseError) {
    return `Diese Datei ist kein gültiges Backup. ${NOTHING_LOST}`;
  }
  if (error instanceof BackupStructureError) {
    return `Dieses Backup ist unvollständig oder beschädigt. ${NOTHING_LOST}`;
  }
  if (error instanceof BackupImportError) {
    return `Das Backup konnte nicht vollständig wiederhergestellt werden. ${NOTHING_LOST}`;
  }
  return `Der Import ist fehlgeschlagen. ${NOTHING_LOST}`;
}

export function describeExportError(error: unknown): string {
  if (error instanceof BackupExportError) {
    return 'Die Datenbank ist noch nicht bereit für einen Export. Starte die App neu und versuche es erneut.';
  }
  return 'Der Export ist fehlgeschlagen. Bitte versuche es erneut.';
}
