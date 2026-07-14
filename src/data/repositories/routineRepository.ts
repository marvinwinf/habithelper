import { randomUUID } from 'expo-crypto';
import { eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { routine, type ScheduleType } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type RoutineDb = BaseSQLiteDatabase<'sync', unknown, { routine: typeof routine }>;

export type Routine = typeof routine.$inferSelect;

export interface RoutineInput {
  name: string;
  categoryId?: string | null;
  scheduleType: ScheduleType;
  scheduledWeekdays?: number[] | null;
  weeklyTargetCount?: number | null;
  timeOfDay?: string | null;
  reason?: string | null;
  // Optional "Atomic Habits" planning aids — free text, no effect on
  // streak/joker/progress/completion (docs/DATA_MODEL.md's routine table).
  cue?: string | null;
  pairing?: string | null;
  reward?: string | null;
  allowConsciousSkip: boolean;
  sortOrder: number;
  colorVariantSeed: number;
}

export type RoutineUpdateInput = Partial<RoutineInput> & { isPaused?: boolean };

export class RoutineNotFoundError extends Error {
  constructor(id: string) {
    super(`Routine not found: ${id}`);
    this.name = 'RoutineNotFoundError';
  }
}

/** Creates a new routine with a freshly generated, stable `id`. Starts active (not paused, not deleted). */
export async function createRoutine(db: RoutineDb, input: RoutineInput): Promise<Routine> {
  const now = new Date().toISOString();
  const created: Routine = {
    id: randomUUID(),
    name: input.name,
    categoryId: input.categoryId ?? null,
    scheduleType: input.scheduleType,
    scheduledWeekdays: input.scheduledWeekdays ?? null,
    weeklyTargetCount: input.weeklyTargetCount ?? null,
    timeOfDay: input.timeOfDay ?? null,
    reason: input.reason ?? null,
    cue: input.cue ?? null,
    pairing: input.pairing ?? null,
    reward: input.reward ?? null,
    allowConsciousSkip: input.allowConsciousSkip,
    isPaused: false,
    sortOrder: input.sortOrder,
    colorVariantSeed: input.colorVariantSeed,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(routine).values(created);
  return created;
}

/** Reads a routine by id, regardless of pause or soft-delete state. */
export async function getRoutine(db: RoutineDb, id: string): Promise<Routine | undefined> {
  const [row] = await db.select().from(routine).where(eq(routine.id, id)).limit(1);
  return row;
}

export interface ListRoutinesOptions {
  /** Include soft-deleted routines. Defaults to false. */
  includeDeleted?: boolean;
}

/** Lists routines, excluding soft-deleted ones by default. No particular order (screens sort/display). */
export async function listRoutines(
  db: RoutineDb,
  options: ListRoutinesOptions = {},
): Promise<Routine[]> {
  if (options.includeDeleted) {
    return db.select().from(routine);
  }
  return db.select().from(routine).where(isNull(routine.deletedAt));
}

/**
 * Updates a routine's editable fields, including `isPaused`. The `id` is
 * never part of the update payload and is never regenerated — renaming a
 * routine must not disconnect it from its `routine_event` history, per
 * docs/DATA_PERSISTENCE.md's Stable Identifiers rule.
 */
export async function updateRoutine(
  db: RoutineDb,
  id: string,
  input: RoutineUpdateInput,
): Promise<Routine> {
  const existing = await getRoutine(db, id);
  if (!existing) {
    throw new RoutineNotFoundError(id);
  }

  const updated: Routine = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.update(routine).set(updated).where(eq(routine.id, id));
  return updated;
}

/**
 * Soft-deletes a routine by setting `deletedAt`, preserving its `id` and
 * event history for anything that still references it (docs/DATA_MODEL.md).
 */
export async function softDeleteRoutine(db: RoutineDb, id: string): Promise<void> {
  const existing = await getRoutine(db, id);
  if (!existing) {
    throw new RoutineNotFoundError(id);
  }

  const now = new Date().toISOString();
  await db.update(routine).set({ deletedAt: now, updatedAt: now }).where(eq(routine.id, id));
}
