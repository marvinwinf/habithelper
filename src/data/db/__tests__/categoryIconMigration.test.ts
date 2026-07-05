// Migration 0001 (category icons, T063): existing user data must survive
// the schema change unmodified, per docs/ARCHITECTURE.md's Migration
// Strategy and TASKS.md's global schema-change rule.

import { createMigratedFixture, getTableColumns } from '../testUtils';

describe('migration 0001_category_icon', () => {
  it('preserves categories created before the migration, with a NULL icon', async () => {
    const fixture = await createMigratedFixture({
      seedAtVersion: 0,
      seedFixture: async (driver) => {
        // Insert using the 0000-era column set — `icon` must not exist yet.
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
  });

  it('adds icon as a nullable column', async () => {
    const fixture = await createMigratedFixture();
    const columns = getTableColumns(fixture, 'category');

    expect(columns.icon).toBeDefined();
    expect(columns.icon.notnull).toBe(0);
  });

  it('rejects inserting into the old column set before the migration runs', async () => {
    // Guards the seedFixture above against silently testing nothing: the
    // icon column genuinely must not exist at version 0.
    const fixture = await createMigratedFixture({ seedAtVersion: 0 });
    const columns = getTableColumns(fixture, 'category');
    expect(columns.icon).toBeDefined(); // fully migrated now

    const preMigration = await createMigratedFixture({
      seedAtVersion: 0,
      seedFixture: async (driver) => {
        await expect(
          driver.runAsync(
            'INSERT INTO category (id, name, base_color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['cat-x', 'X', '#8FBFA0', 'book', 'x', 'x'],
          ),
        ).rejects.toThrow();
      },
    });
    expect(preMigration).toBeDefined();
  });
});
