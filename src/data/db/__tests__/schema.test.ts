import Database from 'better-sqlite3';
import {
  profile,
  category,
  routine,
  routineEvent,
  routineStateCache,
  appStreakCache,
  task,
  schemaMigrations,
} from '../schema';
import { EXPECTED_TABLE_NAMES } from '../expectedTables';

const schema = {
  profile,
  category,
  routine,
  routineEvent,
  routineStateCache,
  appStreakCache,
  task,
  schemaMigrations,
};

type ColumnInfo = { notnull: number; pk: number };

function tableColumns(sqlite: Database.Database, table: string): Record<string, ColumnInfo> {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
    notnull: number;
    pk: number;
  }[];
  return Object.fromEntries(rows.map((row) => [row.name, { notnull: row.notnull, pk: row.pk }]));
}

function foreignKeyTargets(sqlite: Database.Database, table: string): string[] {
  const rows = sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all() as { table: string }[];
  return rows.map((row) => row.table).sort();
}

describe('database schema shape (docs/DATA_MODEL.md)', () => {
  let sqlite: Database.Database;

  beforeAll(async () => {
    // Loaded via require (not a static import) so ESLint's import/namespace
    // rule does not attempt to build an export map for drizzle-kit's bundled
    // API module, which crashes the resolver on its internal dynamic imports.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const drizzleKitApi = require('drizzle-kit/api') as typeof import('drizzle-kit/api');
    const { generateSQLiteDrizzleJson, generateSQLiteMigration } = drizzleKitApi;

    const [prev, cur] = await Promise.all([
      generateSQLiteDrizzleJson({}),
      generateSQLiteDrizzleJson(schema),
    ]);
    const statements = await generateSQLiteMigration(prev, cur);

    sqlite = new Database(':memory:');
    for (const statement of statements) {
      sqlite.exec(statement);
    }
  });

  afterAll(() => {
    sqlite.close();
  });

  it('creates every entity table from docs/DATA_MODEL.md', () => {
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(EXPECTED_TABLE_NAMES);
  });

  it('defines the profile table columns', () => {
    expect(tableColumns(sqlite, 'profile')).toEqual({
      id: { notnull: 1, pk: 1 },
      display_name: { notnull: 1, pk: 0 },
      created_at: { notnull: 1, pk: 0 },
    });
  });

  it('defines the category table columns', () => {
    expect(tableColumns(sqlite, 'category')).toEqual({
      id: { notnull: 1, pk: 1 },
      name: { notnull: 1, pk: 0 },
      base_color: { notnull: 1, pk: 0 },
      icon: { notnull: 0, pk: 0 },
      created_at: { notnull: 1, pk: 0 },
      updated_at: { notnull: 1, pk: 0 },
    });
  });

  it('defines the routine table columns and its category FK', () => {
    expect(tableColumns(sqlite, 'routine')).toEqual({
      id: { notnull: 1, pk: 1 },
      name: { notnull: 1, pk: 0 },
      category_id: { notnull: 0, pk: 0 },
      schedule_type: { notnull: 1, pk: 0 },
      scheduled_weekdays: { notnull: 0, pk: 0 },
      weekly_target_count: { notnull: 0, pk: 0 },
      time_of_day: { notnull: 0, pk: 0 },
      reason: { notnull: 0, pk: 0 },
      cue: { notnull: 0, pk: 0 },
      pairing: { notnull: 0, pk: 0 },
      reward: { notnull: 0, pk: 0 },
      allow_conscious_skip: { notnull: 1, pk: 0 },
      is_paused: { notnull: 1, pk: 0 },
      sort_order: { notnull: 1, pk: 0 },
      color_variant_seed: { notnull: 1, pk: 0 },
      created_at: { notnull: 1, pk: 0 },
      updated_at: { notnull: 1, pk: 0 },
      deleted_at: { notnull: 0, pk: 0 },
    });
    expect(foreignKeyTargets(sqlite, 'routine')).toEqual(['category']);
  });

  it('defines the routine_event table columns and its FKs, including self-reference', () => {
    expect(tableColumns(sqlite, 'routine_event')).toEqual({
      id: { notnull: 1, pk: 1 },
      routine_id: { notnull: 1, pk: 0 },
      occurrence_date: { notnull: 1, pk: 0 },
      event_type: { notnull: 1, pk: 0 },
      recorded_at: { notnull: 1, pk: 0 },
      moved_to_date: { notnull: 0, pk: 0 },
      skip_reason: { notnull: 0, pk: 0 },
      superseded_by_event_id: { notnull: 0, pk: 0 },
    });
    expect(foreignKeyTargets(sqlite, 'routine_event')).toEqual(['routine', 'routine_event']);
  });

  it('defines the routine_state_cache table columns and its routine FK', () => {
    expect(tableColumns(sqlite, 'routine_state_cache')).toEqual({
      routine_id: { notnull: 1, pk: 1 },
      current_streak: { notnull: 1, pk: 0 },
      best_streak: { notnull: 1, pk: 0 },
      total_completions: { notnull: 1, pk: 0 },
      level_rank: { notnull: 1, pk: 0 },
      joker_inventory: { notnull: 1, pk: 0 },
      joker_progress: { notnull: 1, pk: 0 },
      consecutive_missed_after_66: { notnull: 1, pk: 0 },
      reconciled_through_date: { notnull: 1, pk: 0 },
      recalculated_at: { notnull: 1, pk: 0 },
    });
    expect(foreignKeyTargets(sqlite, 'routine_state_cache')).toEqual(['routine']);
  });

  it('defines the app_streak_cache table columns', () => {
    expect(tableColumns(sqlite, 'app_streak_cache')).toEqual({
      id: { notnull: 1, pk: 1 },
      current_streak: { notnull: 1, pk: 0 },
      last_incremented_date: { notnull: 1, pk: 0 },
      reconciled_through_date: { notnull: 1, pk: 0 },
      recalculated_at: { notnull: 1, pk: 0 },
    });
  });

  it('defines the task table columns and its category FK', () => {
    expect(tableColumns(sqlite, 'task')).toEqual({
      id: { notnull: 1, pk: 1 },
      title: { notnull: 1, pk: 0 },
      category_id: { notnull: 0, pk: 0 },
      date: { notnull: 0, pk: 0 },
      time_of_day: { notnull: 0, pk: 0 },
      description: { notnull: 0, pk: 0 },
      is_completed: { notnull: 1, pk: 0 },
      completed_at: { notnull: 0, pk: 0 },
      sort_order: { notnull: 1, pk: 0 },
      color_variant_seed: { notnull: 1, pk: 0 },
      created_at: { notnull: 1, pk: 0 },
      updated_at: { notnull: 1, pk: 0 },
      deleted_at: { notnull: 0, pk: 0 },
    });
    expect(foreignKeyTargets(sqlite, 'task')).toEqual(['category']);
  });

  it('defines the schema_migrations table columns', () => {
    expect(tableColumns(sqlite, 'schema_migrations')).toEqual({
      version: { notnull: 1, pk: 1 },
      applied_at: { notnull: 1, pk: 0 },
    });
  });
});
