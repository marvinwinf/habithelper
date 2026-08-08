// Migration 0003 (routine mini version — the "2-minute rule" plan field):
// existing routines, including their 0002 plan fields, must survive the schema
// change unmodified, per docs/ARCHITECTURE.md's Migration Strategy and
// TASKS.md's global schema-change rule. The column is optional, additive, and
// never read by streak/joker/progress logic (see schema.ts).

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

describe('migration 0003_routine_mini_version', () => {
  it('preserves routines created before the migration, with a NULL mini version', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 2,
      seedFixture: async (driver) => {
        // The pre-0003 column set: 0002's plan fields exist, mini_version
        // does not (proven by the version-2 shape test below).
        await driver.runAsync(
          'INSERT INTO routine (id, name, schedule_type, reason, cue, pairing, reward, allow_conscious_skip, is_paused, sort_order, color_variant_seed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'routine-1',
            'Lesen',
            'daily',
            'Ich bin jemand, der liest',
            'Nach dem Abendessen',
            'Dabei höre ich Musik',
            'Danach ein Tee',
            0,
            0,
            1,
            0,
            '2026-01-01T00:00:00.000Z',
            '2026-01-01T00:00:00.000Z',
          ],
        );
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM routine').all() as Record<
      string,
      unknown
    >[];
    expect(rows).toHaveLength(1);
    // The already-filled plan fields must come through untouched, not just
    // the new column — this is the data a user actually wrote.
    expect(rows[0]).toMatchObject({
      id: 'routine-1',
      name: 'Lesen',
      reason: 'Ich bin jemand, der liest',
      cue: 'Nach dem Abendessen',
      pairing: 'Dabei höre ich Musik',
      reward: 'Danach ein Tee',
      mini_version: null,
    });

    fixture.sqlite.close();
  });

  it("preserves a routine's event history across the migration", async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 2,
      seedFixture: async (driver) => {
        await driver.runAsync(
          'INSERT INTO routine (id, name, schedule_type, allow_conscious_skip, is_paused, sort_order, color_variant_seed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ['routine-1', 'Lesen', 'daily', 0, 0, 1, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
        );
        await driver.runAsync(
          'INSERT INTO routine_event (id, routine_id, occurrence_date, event_type, recorded_at) VALUES (?, ?, ?, ?, ?)',
          ['event-1', 'routine-1', '2026-01-02', 'completed', '2026-01-02T08:00:00.000Z'],
        );
      },
    });

    const events = fixture.sqlite.prepare('SELECT * FROM routine_event').all();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'event-1', event_type: 'completed' });

    fixture.sqlite.close();
  });

  it('adds mini_version as a nullable column', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'routine');

    expect(columns.mini_version).toBeDefined();
    expect(columns.mini_version.notnull).toBe(0);

    fixture.sqlite.close();
  });

  it('does not have the column at version 2, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 2 });

    const columns = getTableColumns(fixture, 'routine');
    expect(columns.mini_version).toBeUndefined();
    expect(columns.cue).toBeDefined();

    fixture.sqlite.close();
  });
});
