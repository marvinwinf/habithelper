// Migration 0004 (structured habit stacking): existing routines must survive
// the schema change unmodified, per docs/ARCHITECTURE.md's Migration Strategy
// and TASKS.md's global schema-change rule.
//
// This migration is the first to add a *self-referential foreign key* to an
// existing table, so it checks the constraint is actually live afterwards —
// an ALTER TABLE ADD COLUMN whose REFERENCES clause silently failed to apply
// would be invisible until a dangling reference corrupted a backup.

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

const INSERT_ROUTINE =
  'INSERT INTO routine (id, name, schedule_type, allow_conscious_skip, is_paused, sort_order, color_variant_seed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

function routineValues(id: string, name: string) {
  return [id, name, 'daily', 0, 0, 1, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'];
}

describe('migration 0004_routine_habit_stack', () => {
  it('preserves routines created before the migration, with a NULL stack partner', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 3,
      seedFixture: async (driver) => {
        await driver.runAsync(INSERT_ROUTINE, routineValues('routine-1', 'Lesen'));
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM routine').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'routine-1',
      name: 'Lesen',
      pairing_routine_id: null,
    });

    fixture.sqlite.close();
  });

  it('preserves event history across the migration', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 3,
      seedFixture: async (driver) => {
        await driver.runAsync(INSERT_ROUTINE, routineValues('routine-1', 'Lesen'));
        await driver.runAsync(
          'INSERT INTO routine_event (id, routine_id, occurrence_date, event_type, recorded_at) VALUES (?, ?, ?, ?, ?)',
          ['event-1', 'routine-1', '2026-01-02', 'completed', '2026-01-02T08:00:00.000Z'],
        );
      },
    });

    expect(fixture.sqlite.prepare('SELECT * FROM routine_event').all()).toHaveLength(1);

    fixture.sqlite.close();
  });

  it('adds pairing_routine_id as a nullable column', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'routine');

    expect(columns.pairing_routine_id).toBeDefined();
    expect(columns.pairing_routine_id.notnull).toBe(0);

    fixture.sqlite.close();
  });

  it('accepts a reference to another routine', async () => {
    const fixture = await createMigratedFixture();
    fixture.sqlite.prepare(INSERT_ROUTINE).run(...routineValues('routine-1', 'Zähneputzen'));
    fixture.sqlite.prepare(INSERT_ROUTINE).run(...routineValues('routine-2', 'Lesen'));

    fixture.sqlite
      .prepare('UPDATE routine SET pairing_routine_id = ? WHERE id = ?')
      .run('routine-1', 'routine-2');

    const row = fixture.sqlite
      .prepare('SELECT pairing_routine_id FROM routine WHERE id = ?')
      .get('routine-2') as { pairing_routine_id: string };
    expect(row.pairing_routine_id).toBe('routine-1');

    fixture.sqlite.close();
  });

  it('enforces the self-referential foreign key', async () => {
    const fixture = await createMigratedFixture();
    fixture.sqlite.prepare(INSERT_ROUTINE).run(...routineValues('routine-1', 'Lesen'));

    // The REFERENCES clause on an ALTER TABLE ADD COLUMN must genuinely be in
    // force; a silently dropped constraint would only surface later as a
    // dangling reference in a backup.
    expect(() =>
      fixture.sqlite
        .prepare('UPDATE routine SET pairing_routine_id = ? WHERE id = ?')
        .run('does-not-exist', 'routine-1'),
    ).toThrow(/FOREIGN KEY/i);

    fixture.sqlite.close();
  });

  it('does not have the column at version 3, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 3 });

    const columns = getTableColumns(fixture, 'routine');
    expect(columns.pairing_routine_id).toBeUndefined();
    expect(columns.mini_version).toBeDefined();

    fixture.sqlite.close();
  });
});
