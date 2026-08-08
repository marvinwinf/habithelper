// Shared seed data for the backup tests. Kept in one place so the export,
// round-trip, and import-orchestration tests all assert against the same
// realistic database rather than three divergent hand-rolled ones.

import type { MigrationDriver } from '../db/migrationRunner';
import type { BackupWriteDriver } from './types';

/**
 * Seeds a migrated database with one of everything, including the two shapes
 * that have historically broken naive import implementations:
 *
 * - a `routine_event` whose `superseded_by_event_id` points *forward* at a
 *   later event (retroactive edit — docs/DATA_MODEL.md), which no row ordering
 *   can satisfy without deferred foreign keys;
 * - `NULL`s in nullable columns, which must survive the JSON round trip as
 *   `null` and not become the string `"null"` or a missing column.
 */
export async function seedBackupFixture(driver: MigrationDriver | BackupWriteDriver): Promise<void> {
  // The fixture deliberately contains a forward self-reference in
  // routine_event, so seeding needs the same deferred-FK transaction that
  // import uses (populate.ts) — otherwise event-1 cannot be inserted before
  // the event-2 it points at.
  await driver.withTransactionAsync(async () => {
    await driver.execAsync('PRAGMA defer_foreign_keys = ON');
    await insertFixtureRows(driver);
  });
}

async function insertFixtureRows(driver: MigrationDriver | BackupWriteDriver): Promise<void> {
  await driver.runAsync('INSERT INTO profile (id, display_name, created_at) VALUES (?, ?, ?)', [
    'profile-1',
    'Marvin',
    '2026-01-01T00:00:00.000Z',
  ]);

  await driver.runAsync(
    'INSERT INTO category (id, name, base_color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['cat-1', 'Gesundheit', '#8AA88B', 'leaf-outline', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  );
  // icon NULL — a category created before migration 0001.
  await driver.runAsync(
    'INSERT INTO category (id, name, base_color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['cat-2', 'Fokus', '#B7A78F', null, '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
  );

  await driver.runAsync(
    `INSERT INTO routine (
       id, name, category_id, schedule_type, scheduled_weekdays, weekly_target_count,
       time_of_day, reason, cue, pairing, reward, allow_conscious_skip, is_paused,
       sort_order, color_variant_seed, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'routine-1',
      'Meditieren',
      'cat-1',
      'daily',
      null,
      null,
      '07:00',
      'Ruhiger anfangen',
      'Nach dem Zähneputzen',
      null,
      'Danach ein Kaffee',
      1,
      0,
      0,
      3,
      '2026-01-01T00:00:00.000Z',
      '2026-01-05T00:00:00.000Z',
      null,
    ],
  );
  await driver.runAsync(
    `INSERT INTO routine (
       id, name, category_id, schedule_type, scheduled_weekdays, weekly_target_count,
       time_of_day, reason, cue, pairing, reward, allow_conscious_skip, is_paused,
       sort_order, color_variant_seed, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'routine-2',
      'Laufen',
      null,
      'weekly_target',
      '[1,3,5]',
      3,
      null,
      null,
      null,
      null,
      null,
      0,
      1,
      1,
      7,
      '2026-01-02T00:00:00.000Z',
      '2026-01-06T00:00:00.000Z',
      null,
    ],
  );

  await driver.runAsync(
    `INSERT INTO task (
       id, title, category_id, date, time_of_day, description, is_completed,
       completed_at, sort_order, color_variant_seed, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'task-1',
      'Steuer sortieren',
      'cat-2',
      '2026-02-01',
      '18:00',
      'Belege scannen',
      1,
      '2026-02-01T17:12:00.000Z',
      0,
      2,
      '2026-01-20T00:00:00.000Z',
      '2026-02-01T17:12:00.000Z',
      null,
    ],
  );

  // event-1 was superseded by event-2, which is recorded *later* — the
  // forward self-reference that forces deferred FK enforcement on import.
  await driver.runAsync(
    `INSERT INTO routine_event (
       id, routine_id, occurrence_date, event_type, recorded_at,
       moved_to_date, skip_reason, superseded_by_event_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['event-1', 'routine-1', '2026-01-03', 'missed', '2026-01-04T06:00:00.000Z', null, null, 'event-2'],
  );
  await driver.runAsync(
    `INSERT INTO routine_event (
       id, routine_id, occurrence_date, event_type, recorded_at,
       moved_to_date, skip_reason, superseded_by_event_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['event-2', 'routine-1', '2026-01-03', 'completed', '2026-01-05T09:30:00.000Z', null, null, null],
  );
  await driver.runAsync(
    `INSERT INTO routine_event (
       id, routine_id, occurrence_date, event_type, recorded_at,
       moved_to_date, skip_reason, superseded_by_event_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['event-3', 'routine-1', '2026-01-04', 'skipped', '2026-01-04T20:00:00.000Z', null, 'Krank', null],
  );

  await driver.runAsync(
    `INSERT INTO routine_state_cache (
       routine_id, current_streak, best_streak, total_completions, level_rank,
       joker_inventory, joker_progress, consecutive_missed_after_66,
       reconciled_through_date, recalculated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['routine-1', 4, 9, 41, 0, 1, 2, 0, '2026-02-06', '2026-02-07T05:00:00.000Z'],
  );

  await driver.runAsync(
    `INSERT INTO app_streak_cache (
       id, current_streak, last_incremented_date, reconciled_through_date, recalculated_at
     ) VALUES (?, ?, ?, ?, ?)`,
    ['singleton', 12, '2026-02-07', '2026-02-06', '2026-02-07T05:00:00.000Z'],
  );
}
