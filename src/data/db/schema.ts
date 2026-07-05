import {
  sqliteTable,
  text,
  integer,
  real,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

// Schema per docs/DATA_MODEL.md. This is the single source of truth for the
// initial migration (generated as migrations/0000_init.sql — Drizzle Kit's
// own zero-indexed naming, see migrate.test.ts) — see that document's Schema
// Versioning section for why every column ships together in one migration.

// Discriminator unions from docs/DATA_MODEL.md, applied to the columns below
// as compile-time brands ($type) — SQLite stores plain TEXT either way, so
// these change no SQL, but inserts/selects through Drizzle are type-checked.
// The domain layer's schedule union (see src/domain/routines/schedule.ts)
// maps from these columns and reuses ScheduleType rather than redeclaring it.
export type ScheduleType = 'daily' | 'weekdays' | 'weekly_target';

export type RoutineEventType =
  | 'completed'
  | 'exceeded'
  | 'skipped'
  | 'missed'
  | 'joker_protected'
  | 'paused'
  | 'reactivated'
  | 'moved'
  | 'joker_earned'
  | 'joker_consumed'
  | 'joker_restored';

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const category = sqliteTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseColor: text('base_color').notNull(),
  // Ionicons glyph name, added by migration 0001 (T063). Nullable: rows
  // created before the migration keep NULL and render the UI-layer fallback
  // icon (src/ui/categoryIcons.ts).
  icon: text('icon'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const routine = sqliteTable('routine', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: text('category_id').references(() => category.id),
  scheduleType: text('schedule_type').$type<ScheduleType>().notNull(),
  // JSON array of ISO weekday ints (1-7); mode json makes Drizzle
  // stringify/parse it automatically at the query layer.
  scheduledWeekdays: text('scheduled_weekdays', { mode: 'json' }).$type<number[]>(),
  weeklyTargetCount: integer('weekly_target_count'),
  timeOfDay: text('time_of_day'),
  reason: text('reason'),
  allowConsciousSkip: integer('allow_conscious_skip', { mode: 'boolean' }).notNull(),
  isPaused: integer('is_paused', { mode: 'boolean' }).notNull(),
  sortOrder: real('sort_order').notNull(),
  colorVariantSeed: integer('color_variant_seed').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const routineEvent = sqliteTable('routine_event', {
  id: text('id').primaryKey(),
  routineId: text('routine_id')
    .notNull()
    .references(() => routine.id),
  occurrenceDate: text('occurrence_date').notNull(),
  eventType: text('event_type').$type<RoutineEventType>().notNull(),
  recordedAt: text('recorded_at').notNull(),
  movedToDate: text('moved_to_date'),
  skipReason: text('skip_reason'),
  supersededByEventId: text('superseded_by_event_id').references(
    (): AnySQLiteColumn => routineEvent.id,
  ),
});

export const routineStateCache = sqliteTable('routine_state_cache', {
  routineId: text('routine_id')
    .primaryKey()
    .references(() => routine.id),
  currentStreak: integer('current_streak').notNull(),
  bestStreak: integer('best_streak').notNull(),
  totalCompletions: integer('total_completions').notNull(),
  levelRank: integer('level_rank').notNull(),
  jokerInventory: integer('joker_inventory').notNull(),
  jokerProgress: integer('joker_progress').notNull(),
  consecutiveMissedAfter66: integer('consecutive_missed_after_66').notNull(),
  reconciledThroughDate: text('reconciled_through_date').notNull(),
  recalculatedAt: text('recalculated_at').notNull(),
});

export const appStreakCache = sqliteTable('app_streak_cache', {
  id: text('id').primaryKey(),
  currentStreak: integer('current_streak').notNull(),
  lastIncrementedDate: text('last_incremented_date').notNull(),
  reconciledThroughDate: text('reconciled_through_date').notNull(),
  recalculatedAt: text('recalculated_at').notNull(),
});

export const task = sqliteTable('task', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  categoryId: text('category_id').references(() => category.id),
  date: text('date'),
  timeOfDay: text('time_of_day'),
  description: text('description'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull(),
  completedAt: text('completed_at'),
  sortOrder: real('sort_order').notNull(),
  colorVariantSeed: integer('color_variant_seed').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});
