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
  | 'joker_restored'
  // Supersedes a misclicked completed/exceeded event (and its joker_earned
  // sibling, if any) — see src/domain/routines/undo.ts. event_type is a plain
  // TEXT column with no DB-level constraint, so this needs no migration.
  | 'completion_undone'
  // The same audit marker for a misclicked conscious skip: supersedes the
  // `skipped` event so the occurrence returns to pending and can be completed.
  // Without it a mis-tapped skip locked that day permanently — the completion
  // control renders disabled for a skipped occurrence.
  | 'skip_undone';

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  // Local daily reminder (migration 0005, T092). Deliberately on the profile
  // row rather than a new table: the MVP has exactly one profile and exactly
  // one reminder, so a second table would only add a join. Defaulted off and
  // NULL respectively, so profiles created before the migration keep the
  // reminder disabled and nothing is ever scheduled without the user asking.
  // `reminderTime` is local wall-clock `HH:mm` — not a UTC instant — because
  // "remind me at 20:00" must survive a timezone change unmoved.
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderTime: text('reminder_time'),
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
  // Optional "Atomic Habits" planning aids (added by migration 0002,
  // routine plan). Free text only, purely a thinking/planning prompt — never
  // read by streak/joker/progress/completion logic, so they need no domain
  // wiring. cue = Auslöser, pairing = Verknüpfung, reward = Belohnung.
  cue: text('cue'),
  pairing: text('pairing'),
  reward: text('reward'),
  // The "2-minute rule" version of the routine (migration 0003) — the
  // smallest form that still counts as showing up. Like the fields above it
  // is a planning prompt only: completing the mini version is recorded as an
  // ordinary completion, so no streak, joker, level, or replay logic reads
  // this column. See docs/DATA_MODEL.md for why it is not its own event type.
  miniVersion: text('mini_version'),
  // Structured habit stacking (migration 0004): the routine this one follows.
  // `pairing` above stays the free-text note; this makes the "after X" part a
  // real reference, so renaming X updates the display and deleting X cannot
  // leave a stale name behind. Self-referential and nullable — a routine
  // without a stack partner simply has NULL. Nothing traverses the chain, so
  // a cycle (A after B, B after A) is harmless; the form only prevents a
  // routine from being stacked on itself.
  pairingRoutineId: text('pairing_routine_id').references((): AnySQLiteColumn => routine.id),
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
