// Migration 0002 (routine plan: Auslöser/Verknüpfung/Belohnung): existing
// routines must survive the schema change unmodified, per
// docs/ARCHITECTURE.md's Migration Strategy and TASKS.md's global
// schema-change rule. The three columns are optional, additive, and never
// read by streak/joker/progress logic (see schema.ts).

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

describe('migration 0002_routine_plan', () => {
  it('preserves routines created before the migration, with NULL plan fields', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 1,
      seedFixture: async (driver) => {
        // Insert using the pre-0002 column set — cue/pairing/reward do not
        // exist yet (proven by the version-1 shape test below).
        await driver.runAsync(
          'INSERT INTO routine (id, name, schedule_type, allow_conscious_skip, is_paused, sort_order, color_variant_seed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'routine-1',
            'Lesen',
            'daily',
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
    expect(rows[0]).toMatchObject({
      id: 'routine-1',
      name: 'Lesen',
      cue: null,
      pairing: null,
      reward: null,
    });

    fixture.sqlite.close();
  });

  it('adds cue, pairing, and reward as nullable columns', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'routine');

    for (const name of ['cue', 'pairing', 'reward'] as const) {
      expect(columns[name]).toBeDefined();
      expect(columns[name].notnull).toBe(0);
    }

    fixture.sqlite.close();
  });

  it('does not have the plan columns at version 1, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 1 });

    const columns = getTableColumns(fixture, 'routine');
    expect(columns.cue).toBeUndefined();
    expect(columns.pairing).toBeUndefined();
    expect(columns.reward).toBeUndefined();
    expect(columns.reason).toBeDefined();

    fixture.sqlite.close();
  });
});
