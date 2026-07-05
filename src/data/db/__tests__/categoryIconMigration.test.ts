// Migration 0001 (category icons, T063): existing user data must survive
// the schema change unmodified, per docs/ARCHITECTURE.md's Migration
// Strategy and TASKS.md's global schema-change rule.

import migrations from '../../../../migrations/migrations';
import { runPendingMigrations } from '../migrationRunner';
import { createInMemoryFixture, createMigratedFixture, getTableColumns } from '../testUtils';

describe('migration 0001_category_icon', () => {
  it('preserves categories created before the migration, with a NULL icon', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 0,
      seedFixture: async (driver) => {
        // Insert using the 0000-era column set — `icon` does not exist yet
        // (proven by the version-0 shape test below).
        await driver.runAsync(
          'INSERT INTO category (id, name, base_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          ['cat-1', 'Sport', '#8FBFA0', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
        );
      },
    });

    const rows = fixture.sqlite.prepare('SELECT * FROM category').all() as Record<
      string,
      unknown
    >[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'cat-1',
      name: 'Sport',
      base_color: '#8FBFA0',
      icon: null,
    });

    fixture.sqlite.close();
  });

  it('adds icon as a nullable column', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'category');

    expect(columns.icon).toBeDefined();
    expect(columns.icon.notnull).toBe(0);

    fixture.sqlite.close();
  });

  it('does not have the icon column at version 0, so the seed above genuinely tests the old shape', async () => {
    const fixture = createInMemoryFixture();
    await runPendingMigrations(fixture.driver, migrations, { upToVersion: 0 });

    const columns = getTableColumns(fixture, 'category');
    expect(columns.icon).toBeUndefined();
    expect(columns.name).toBeDefined();

    fixture.sqlite.close();
  });
});
