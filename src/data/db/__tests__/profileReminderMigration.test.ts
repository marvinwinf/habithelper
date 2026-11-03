// Migration 0005 (local daily reminder): an existing profile must survive the
// schema change with the reminder *off*, per docs/ARCHITECTURE.md's Migration
// Strategy and TASKS.md's global schema-change rule.
//
// The "off" part is the point, not a detail: a defaulted-on reminder would
// start scheduling notifications for users who never asked for one, which
// T092 explicitly forbids.

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

const INSERT_PROFILE = 'INSERT INTO profile (id, display_name, created_at) VALUES (?, ?, ?)';

describe('migration 0005_profile_reminder', () => {
  it('preserves a profile created before the migration, with the reminder off', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 4,
      seedFixture: async (driver) => {
        await driver.runAsync(INSERT_PROFILE, ['profile-1', 'Alex', '2026-01-01T00:00:00.000Z']);
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM profile').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'profile-1',
      display_name: 'Alex',
      created_at: '2026-01-01T00:00:00.000Z',
      reminder_enabled: 0,
      reminder_time: null,
    });

    fixture.sqlite.close();
  });

  it('adds reminder_enabled as NOT NULL defaulted off and reminder_time as nullable', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'profile');

    expect(columns.reminder_enabled).toBeDefined();
    expect(columns.reminder_enabled.notnull).toBe(1);
    expect(columns.reminder_time).toBeDefined();
    expect(columns.reminder_time.notnull).toBe(0);

    // A profile inserted without the new columns still lands with the
    // reminder off, which is what makes the NOT NULL column safe to add.
    fixture.sqlite.prepare(INSERT_PROFILE).run('profile-2', 'Nutzer', '2026-02-01T00:00:00.000Z');
    const row = fixture.sqlite
      .prepare('SELECT reminder_enabled, reminder_time FROM profile WHERE id = ?')
      .get('profile-2');
    expect(row).toEqual({ reminder_enabled: 0, reminder_time: null });

    fixture.sqlite.close();
  });

  it('stores a local HH:mm reminder time', async () => {
    const fixture = await createMigratedFixture();
    fixture.sqlite.prepare(INSERT_PROFILE).run('profile-1', 'Alex', '2026-01-01T00:00:00.000Z');

    fixture.sqlite
      .prepare('UPDATE profile SET reminder_enabled = 1, reminder_time = ? WHERE id = ?')
      .run('20:30', 'profile-1');

    expect(
      fixture.sqlite
        .prepare('SELECT reminder_enabled, reminder_time FROM profile WHERE id = ?')
        .get('profile-1'),
    ).toEqual({ reminder_enabled: 1, reminder_time: '20:30' });

    fixture.sqlite.close();
  });

  it('does not have the columns at version 4, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 4 });

    const columns = getTableColumns(fixture, 'profile');
    expect(columns.reminder_enabled).toBeUndefined();
    expect(columns.reminder_time).toBeUndefined();
    expect(columns.display_name).toBeDefined();

    fixture.sqlite.close();
  });
});
