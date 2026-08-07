import { BackupImportError } from '../../data/backup/populate';
import { BackupExportError } from '../../data/backup/serialize';
import {
  BackupFutureSchemaError,
  BackupParseError,
  BackupStructureError,
} from '../../data/backup/validate';
import { describeExportError, describeImportError } from '../backupMessages';

describe('describeImportError', () => {
  // T055: "a failed import explicitly confirms to the user that no data was
  // lost." That promise must hold for every failure path, including ones
  // added later, so it is asserted across the whole set rather than per case.
  it.each([
    ['future schema', new BackupFutureSchemaError(9, 2)],
    ['unparseable file', new BackupParseError('bad json')],
    ['broken structure', new BackupStructureError('missing table')],
    ['failed population', new BackupImportError('verification failed')],
    ['an unexpected error', new Error('disk full')],
  ])('promises no data was lost for %s', (_label, error) => {
    expect(describeImportError(error)).toContain('Deine Daten wurden nicht verändert.');
  });

  it('names the incompatible version so the user knows to update', () => {
    expect(describeImportError(new BackupFutureSchemaError(9, 2))).toContain('neueren App-Version');
  });

  it('distinguishes an invalid file from a damaged backup', () => {
    expect(describeImportError(new BackupParseError('x'))).toContain('kein gültiges Backup');
    expect(describeImportError(new BackupStructureError('x'))).toContain('unvollständig');
  });
});

describe('describeExportError', () => {
  it('explains an unmigrated database', () => {
    expect(describeExportError(new BackupExportError('no migrations'))).toContain('neu');
  });

  it('falls back to a generic retry message', () => {
    expect(describeExportError(new Error('nope'))).toContain('fehlgeschlagen');
  });
});
