// Backup validation tests (T052, docs/TEST_STRATEGY.md's "backup
// validation"). validate.ts imports no database module at all, so "no write
// occurs on an invalid backup" is structural — these tests pin the error
// types the import UI branches on.

import {
  BackupFutureSchemaError,
  BackupParseError,
  BackupStructureError,
  parseAndValidateBackup,
  validateBackup,
} from '../validate';
import { BACKUP_TABLE_NAMES, type BackupFile, type BackupRow } from '../types';

function validBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  const tables = Object.fromEntries(
    BACKUP_TABLE_NAMES.map((table) => [table, [] as BackupRow[]]),
  ) as BackupFile['tables'];
  return {
    manifest: { schemaVersion: 2, exportedAt: '2026-08-07T10:00:00.000Z', appVersion: '1.0.0' },
    tables,
    ...overrides,
  };
}

describe('validateBackup', () => {
  it('accepts a well-formed backup at the current schema version', () => {
    expect(validateBackup(validBackup(), 2)).toEqual(validBackup());
  });

  it('accepts a backup from an older schema version', () => {
    const older = validBackup({
      manifest: { schemaVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', appVersion: '0.9.0' },
    });
    expect(validateBackup(older, 2).manifest.schemaVersion).toBe(1);
  });

  it('rejects a backup from a newer schema version', () => {
    const newer = validBackup({
      manifest: { schemaVersion: 9, exportedAt: '2026-08-07T10:00:00.000Z', appVersion: '2.0.0' },
    });

    expect(() => validateBackup(newer, 2)).toThrow(BackupFutureSchemaError);
    try {
      validateBackup(newer, 2);
    } catch (error) {
      expect(error).toMatchObject({ backupSchemaVersion: 9, currentSchemaVersion: 2 });
    }
  });

  it('checks the schema version before the table structure', () => {
    // A future backup may legitimately contain tables this build has never
    // heard of; reporting "missing table" for it would be misleading.
    const futureAndUnfamiliar = {
      manifest: { schemaVersion: 9, exportedAt: '2026-08-07T10:00:00.000Z', appVersion: '2.0.0' },
      tables: {},
    };
    expect(() => validateBackup(futureAndUnfamiliar, 2)).toThrow(BackupFutureSchemaError);
  });

  it.each([
    ['a non-object', 42],
    ['null', null],
    ['an array', []],
  ])('rejects %s as a parse error', (_label, raw) => {
    expect(() => validateBackup(raw, 2)).toThrow(BackupParseError);
  });

  it.each([
    ['a missing manifest', { tables: {} }],
    ['a manifest without schemaVersion', { manifest: { exportedAt: 'x', appVersion: '1' }, tables: {} }],
    [
      'a non-integer schemaVersion',
      { manifest: { schemaVersion: 1.5, exportedAt: 'x', appVersion: '1' }, tables: {} },
    ],
    [
      'a manifest without exportedAt',
      { manifest: { schemaVersion: 1, appVersion: '1' }, tables: {} },
    ],
    ['missing tables', { manifest: { schemaVersion: 1, exportedAt: 'x', appVersion: '1' } }],
  ])('rejects %s as a structure error', (_label, raw) => {
    expect(() => validateBackup(raw, 2)).toThrow(BackupStructureError);
  });

  it('rejects a backup missing one of the persistent tables', () => {
    const incomplete = validBackup();
    delete (incomplete.tables as Record<string, unknown>).task;

    expect(() => validateBackup(incomplete, 2)).toThrow(/missing table "task"/);
  });

  it('rejects a table that is not an array of rows', () => {
    const broken = validBackup();
    (broken.tables as Record<string, unknown>).routine = { id: 'r1' };

    expect(() => validateBackup(broken, 2)).toThrow(/is not an array/);
  });

  it('rejects a row holding a non-primitive column value', () => {
    const broken = validBackup();
    (broken.tables as Record<string, unknown[]>).routine = [{ id: 'r1', name: { nested: true } }];

    expect(() => validateBackup(broken, 2)).toThrow(/unsupported value type/);
  });

  it('accepts rows holding strings, numbers, and nulls', () => {
    const backup = validBackup();
    (backup.tables as Record<string, unknown[]>).routine = [
      { id: 'r1', name: 'Meditieren', sort_order: 1.5, deleted_at: null },
    ];

    expect(validateBackup(backup, 2).tables.routine).toHaveLength(1);
  });
});

describe('parseAndValidateBackup', () => {
  it('parses and validates well-formed JSON text', () => {
    const text = JSON.stringify(validBackup());
    expect(parseAndValidateBackup(text, 2).manifest.appVersion).toBe('1.0.0');
  });

  it('reports unparseable text as a parse error', () => {
    expect(() => parseAndValidateBackup('not json at all', 2)).toThrow(BackupParseError);
  });

  it('reports an empty file as a parse error', () => {
    expect(() => parseAndValidateBackup('', 2)).toThrow(BackupParseError);
  });
});
