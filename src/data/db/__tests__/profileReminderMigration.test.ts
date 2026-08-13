// Migration 0005 (daily reminder settings on the profile): the existing
// profile row — the user's display name, created once at first launch and
// never re-created — must survive the schema change, per
// docs/ARCHITECTURE.md's Migration Strategy and TASKS.md's global
// schema-change rule.

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

const INSERT_PROFILE = 'INSERT INTO profile (id, display_name, created_at) VALUES (?, ?, ?)';

describe('migration 0005_profile_reminder', () => {
  it('preserves a profile created before the migration', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 4,
      seedFixture: async (driver) => {
        await driver.runAsync(INSERT_PROFILE, [
          'profile-1',
          'Marvin',
          '2026-01-01T00:00:00.000Z',
        ]);
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM profile').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'profile-1',
      display_name: 'Marvin',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    fixture.sqlite.close();
  });

  it('migrates an existing profile to "reminder off at the default time"', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 4,
      seedFixture: async (driver) => {
        await driver.runAsync(INSERT_PROFILE, ['profile-1', 'Marvin', '2026-01-01T00:00:00.000Z']);
      },
    });

    // Not NULL and not "on": an upgrade must never start notifying a user who
    // never asked for a reminder.
    const row = fixture.sqlite.prepare('SELECT * FROM profile').get() as Record<string, unknown>;
    expect(row.reminder_enabled).toBe(0);
    expect(row.reminder_time).toBe('08:00');

    fixture.sqlite.close();
  });

  it('adds both columns as NOT NULL with defaults', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'profile');

    expect(columns.reminder_enabled.notnull).toBe(1);
    expect(columns.reminder_time.notnull).toBe(1);

    fixture.sqlite.close();
  });

  it('accepts an enabled reminder at a chosen time', async () => {
    const fixture = await createMigratedFixture();
    fixture.sqlite.prepare(INSERT_PROFILE).run('profile-1', 'Marvin', '2026-01-01T00:00:00.000Z');
    fixture.sqlite
      .prepare('UPDATE profile SET reminder_enabled = 1, reminder_time = ? WHERE id = ?')
      .run('21:15', 'profile-1');

    expect(fixture.sqlite.prepare('SELECT * FROM profile').get()).toMatchObject({
      reminder_enabled: 1,
      reminder_time: '21:15',
    });

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
