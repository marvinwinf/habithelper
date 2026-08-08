// Backup export tests (T051, docs/TEST_STRATEGY.md's "backup export").

import { createInMemoryFixture, createMigratedFixture } from '../../db/testUtils';
import {
  BackupExportError,
  backupFileName,
  buildBackup,
  readSchemaVersion,
  serializeBackup,
} from '../serialize';
import { seedBackupFixture } from '../testFixtures';
import { BACKUP_TABLE_NAMES } from '../types';

async function seededFixture() {
  const fixture = await createMigratedFixture();
  await seedBackupFixture(fixture.driver);
  return fixture;
}

describe('readSchemaVersion', () => {
  it('reports the highest applied migration version', async () => {
    const fixture = await createMigratedFixture();
    const version = await readSchemaVersion(fixture.driver);
    const applied = fixture.sqlite
      .prepare('SELECT MAX(version) AS version FROM schema_migrations')
      .get() as { version: number };
    expect(version).toBe(applied.version);
  });

  it('refuses to report a version for an unmigrated database', async () => {
    const fixture = createInMemoryFixture();
    fixture.sqlite.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT)');
    await expect(readSchemaVersion(fixture.driver)).rejects.toThrow(BackupExportError);
  });
});

describe('buildBackup', () => {
  it('includes a manifest with the schema version, timestamp, and app version', async () => {
    const fixture = await seededFixture();
    const backup = await buildBackup(fixture.driver, {
      appVersion: '1.2.3',
      now: new Date('2026-08-07T10:00:00.000Z'),
    });

    expect(backup.manifest).toEqual({
      schemaVersion: await readSchemaVersion(fixture.driver),
      exportedAt: '2026-08-07T10:00:00.000Z',
      appVersion: '1.2.3',
    });
  });

  it('serializes every persistent table', async () => {
    const fixture = await seededFixture();
    const backup = await buildBackup(fixture.driver, { appVersion: '1.0.0' });

    expect(Object.keys(backup.tables).sort()).toEqual([...BACKUP_TABLE_NAMES].sort());
    expect(backup.tables.profile).toHaveLength(1);
    expect(backup.tables.category).toHaveLength(2);
    expect(backup.tables.routine).toHaveLength(2);
    expect(backup.tables.task).toHaveLength(1);
    expect(backup.tables.routine_event).toHaveLength(3);
    expect(backup.tables.routine_state_cache).toHaveLength(1);
    expect(backup.tables.app_streak_cache).toHaveLength(1);
  });

  it('preserves nulls rather than dropping or stringifying them', async () => {
    const fixture = await seededFixture();
    const backup = await buildBackup(fixture.driver, { appVersion: '1.0.0' });

    const withoutIcon = backup.tables.category.find((row) => row.id === 'cat-2');
    expect(withoutIcon).toBeDefined();
    expect(withoutIcon).toHaveProperty('icon', null);

    // Survives the JSON round trip too — the format users actually get.
    const roundTripped = JSON.parse(serializeBackup(backup));
    expect(roundTripped.tables.category[1].icon).toBeNull();
  });

  it('keeps the event log in insertion order', async () => {
    const fixture = await seededFixture();
    const backup = await buildBackup(fixture.driver, { appVersion: '1.0.0' });

    expect(backup.tables.routine_event.map((row) => row.id)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
  });

  it('produces byte-identical output for an unchanged database', async () => {
    const fixture = await seededFixture();
    const options = { appVersion: '1.0.0', now: new Date('2026-08-07T10:00:00.000Z') };

    const first = serializeBackup(await buildBackup(fixture.driver, options));
    const second = serializeBackup(await buildBackup(fixture.driver, options));

    expect(first).toBe(second);
  });

  it('exports an empty but structurally complete backup from a fresh database', async () => {
    const fixture = await createMigratedFixture();
    const backup = await buildBackup(fixture.driver, { appVersion: '1.0.0' });

    for (const table of BACKUP_TABLE_NAMES) {
      expect(backup.tables[table]).toEqual([]);
    }
  });
});

describe('backupFileName', () => {
  it('builds a filesystem-safe, chronologically sortable name', () => {
    expect(backupFileName('2026-08-07T10:00:00.000Z')).toBe(
      'habithelper-backup-2026-08-07T10-00-00-000Z.json',
    );
  });
});
