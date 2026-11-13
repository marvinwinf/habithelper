// Migration 0006 (optional completion chime): an existing profile — including
// its reminder setting from 0005 — must survive the schema change with the
// sound *off*, per docs/ARCHITECTURE.md's Migration Strategy and TASKS.md's
// global schema-change rule. Off matters: the app must never start making
// sounds for a user who did not ask for them.

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

describe('migration 0006_profile_completion_sound', () => {
  it('preserves a profile created before the migration, with the sound off', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 5,
      seedFixture: async (driver) => {
        await driver.runAsync(
          'INSERT INTO profile (id, display_name, reminder_enabled, reminder_time, created_at) VALUES (?, ?, ?, ?, ?)',
          ['profile-1', 'Alex', 1, '20:30', '2026-01-01T00:00:00.000Z'],
        );
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM profile').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'profile-1',
      display_name: 'Alex',
      reminder_enabled: 1,
      reminder_time: '20:30',
      created_at: '2026-01-01T00:00:00.000Z',
      completion_sound_enabled: 0,
    });

    fixture.sqlite.close();
  });

  it('adds completion_sound_enabled as NOT NULL defaulted off', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'profile');
    expect(columns.completion_sound_enabled.notnull).toBe(1);

    fixture.sqlite
      .prepare('INSERT INTO profile (id, display_name, created_at) VALUES (?, ?, ?)')
      .run('profile-2', 'Nutzer', '2026-02-01T00:00:00.000Z');
    expect(
      fixture.sqlite.prepare('SELECT completion_sound_enabled FROM profile WHERE id = ?').get('profile-2'),
    ).toEqual({ completion_sound_enabled: 0 });

    fixture.sqlite.close();
  });

  it('does not have the column at version 5, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 5 });

    const columns = getTableColumns(fixture, 'profile');
    expect(columns.completion_sound_enabled).toBeUndefined();
    expect(columns.reminder_enabled).toBeDefined();

    fixture.sqlite.close();
  });
});
