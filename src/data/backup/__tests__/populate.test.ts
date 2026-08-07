// Import round-trip tests (T054, docs/TEST_STRATEGY.md's "import" and
// "recalculation from source events"). These run the real populate path
// against better-sqlite3, so the SQL — including deferred foreign keys and
// the migrate-then-insert ordering — is genuinely exercised.

import { createInMemoryFixture, createMigratedFixture, getAppliedVersions } from '../../db/testUtils';
import { BackupImportError, populateFromBackup, verifyPopulated } from '../populate';
import { buildBackup } from '../serialize';
import { seedBackupFixture } from '../testFixtures';
import { BACKUP_TABLE_NAMES, type BackupFile } from '../types';

async function exportedFixtureBackup(): Promise<BackupFile> {
  const source = await createMigratedFixture();
  await seedBackupFixture(source.driver);
  return buildBackup(source.driver, { appVersion: '1.0.0' });
}

function dump(fixture: Awaited<ReturnType<typeof createInMemoryFixture>>, table: string) {
  return fixture.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
}

describe('populateFromBackup', () => {
  it('restores every row of every table into a fresh database', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();

    await populateFromBackup(target.driver, backup);

    for (const table of BACKUP_TABLE_NAMES) {
      expect(dump(target, table)).toEqual(backup.tables[table]);
    }
  });

  it('migrates the target database before inserting', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();

    await populateFromBackup(target.driver, backup);

    // A completely empty database came in; it must leave fully migrated, or
    // the restored rows would be sitting in a stale schema.
    expect(getAppliedVersions(target).length).toBeGreaterThan(0);
    expect(getAppliedVersions(target)).toEqual([...getAppliedVersions(target)].sort((a, b) => a - b));
  });

  it('restores an event whose supersede pointer references a later event', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();

    await populateFromBackup(target.driver, backup);

    const superseded = target.sqlite
      .prepare('SELECT superseded_by_event_id FROM routine_event WHERE id = ?')
      .get('event-1') as { superseded_by_event_id: string };
    expect(superseded.superseded_by_event_id).toBe('event-2');
  });

  it('leaves foreign keys enforced after the import transaction', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();

    await populateFromBackup(target.driver, backup);

    // Deferring FKs is scoped to the import transaction — a dangling
    // reference written afterwards must still fail.
    expect(() =>
      target.sqlite
        .prepare(
          `INSERT INTO routine_event (id, routine_id, occurrence_date, event_type, recorded_at)
           VALUES ('bad', 'no-such-routine', '2026-01-01', 'completed', '2026-01-01T00:00:00.000Z')`,
        )
        .run(),
    ).toThrow(/FOREIGN KEY/i);
  });

  it('fails at commit when the backup holds a dangling reference', async () => {
    const backup = await exportedFixtureBackup();
    backup.tables.routine_event.push({
      id: 'event-orphan',
      routine_id: 'routine-does-not-exist',
      occurrence_date: '2026-01-09',
      event_type: 'completed',
      recorded_at: '2026-01-09T08:00:00.000Z',
      moved_to_date: null,
      skip_reason: null,
      superseded_by_event_id: null,
    });
    const target = createInMemoryFixture();

    // Deferred, not disabled: referential integrity is still checked, just at
    // COMMIT rather than per statement.
    await expect(populateFromBackup(target.driver, backup)).rejects.toThrow(/FOREIGN KEY/i);
  });

  it('rejects a row with an invalid column name instead of building SQL from it', async () => {
    const backup = await exportedFixtureBackup();
    backup.tables.profile = [{ 'id" , x --': 'nope' }];
    const target = createInMemoryFixture();

    await expect(populateFromBackup(target.driver, backup)).rejects.toThrow(BackupImportError);
  });

  it('rejects a row with no columns', async () => {
    const backup = await exportedFixtureBackup();
    backup.tables.profile = [{}];
    const target = createInMemoryFixture();

    await expect(populateFromBackup(target.driver, backup)).rejects.toThrow(BackupImportError);
  });

  it('restores a backup that predates a later column, defaulting the new one', async () => {
    // Simulates importing a backup taken before migration 0002 added the
    // routine planning fields: the columns are simply absent from the rows.
    const backup = await exportedFixtureBackup();
    backup.tables.routine = backup.tables.routine.map((row) => {
      const { cue, pairing, reward, ...rest } = row;
      void cue;
      void pairing;
      void reward;
      return rest;
    });
    backup.manifest.schemaVersion = 1;
    const target = createInMemoryFixture();

    await populateFromBackup(target.driver, backup);

    const restored = target.sqlite
      .prepare('SELECT cue, pairing, reward FROM routine WHERE id = ?')
      .get('routine-1') as { cue: string | null; pairing: string | null; reward: string | null };
    expect(restored).toEqual({ cue: null, pairing: null, reward: null });
  });
});

describe('verifyPopulated', () => {
  it('passes for a faithfully populated database', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();
    await populateFromBackup(target.driver, backup);

    await expect(verifyPopulated(target.driver, backup)).resolves.toBeUndefined();
  });

  it('fails when the populated database is short a row', async () => {
    const backup = await exportedFixtureBackup();
    const target = createInMemoryFixture();
    await populateFromBackup(target.driver, backup);
    target.sqlite.prepare('DELETE FROM routine_event WHERE id = ?').run('event-3');

    await expect(verifyPopulated(target.driver, backup)).rejects.toThrow(/failed verification/);
  });
});
