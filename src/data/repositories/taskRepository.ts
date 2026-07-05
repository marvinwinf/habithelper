import { randomUUID } from 'expo-crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { task } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type TaskDb = BaseSQLiteDatabase<'sync', unknown, { task: typeof task }>;

export type Task = typeof task.$inferSelect;

export interface TaskInput {
  title: string;
  categoryId?: string | null;
  date?: string | null;
  timeOfDay?: string | null;
  description?: string | null;
  sortOrder: number;
  colorVariantSeed: number;
}

export type TaskUpdateInput = Partial<TaskInput>;

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = 'TaskNotFoundError';
  }
}

/** Creates a new task with a freshly generated, stable `id`. Starts incomplete, not deleted — only `title` is required (docs/MVP_SCOPE.md). */
export async function createTask(db: TaskDb, input: TaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const created: Task = {
    id: randomUUID(),
    title: input.title,
    categoryId: input.categoryId ?? null,
    date: input.date ?? null,
    timeOfDay: input.timeOfDay ?? null,
    description: input.description ?? null,
    isCompleted: false,
    completedAt: null,
    sortOrder: input.sortOrder,
    colorVariantSeed: input.colorVariantSeed,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(task).values(created);
  return created;
}

/** Reads a task by id, regardless of completion or soft-delete state. */
export async function getTask(db: TaskDb, id: string): Promise<Task | undefined> {
  const [row] = await db.select().from(task).where(eq(task.id, id)).limit(1);
  return row;
}

/**
 * Updates a task's editable fields. The `id` is never part of the update
 * payload and is never regenerated — renaming a task's title must not
 * disconnect it from its own identity, per docs/DATA_PERSISTENCE.md's
 * Stable Identifiers rule (tasks have no separate event log, but the same
 * rule applies to the row's own id).
 */
export async function updateTask(db: TaskDb, id: string, input: TaskUpdateInput): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  const updated: Task = { ...existing, ...input, updatedAt: new Date().toISOString() };
  await db.update(task).set(updated).where(eq(task.id, id));
  return updated;
}

/** Marks a task complete at `completedAt` (defaults to now). */
export async function completeTask(
  db: TaskDb,
  id: string,
  completedAt: string = new Date().toISOString(),
): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  const updated: Task = {
    ...existing,
    isCompleted: true,
    completedAt,
    updatedAt: new Date().toISOString(),
  };
  await db.update(task).set(updated).where(eq(task.id, id));
  return updated;
}

/** Clears a task's completion state — the completion control also serves as undo (docs/SCREEN_SPECIFICATIONS.md). */
export async function undoTaskCompletion(db: TaskDb, id: string): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  const updated: Task = {
    ...existing,
    isCompleted: false,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await db.update(task).set(updated).where(eq(task.id, id));
  return updated;
}

/**
 * Soft-deletes a task by setting `deletedAt`. Completed tasks are stored
 * permanently (docs/MVP_SCOPE.md), so deletion is a distinct, user-initiated
 * action from completion, never a hard delete.
 */
export async function softDeleteTask(db: TaskDb, id: string): Promise<void> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  const now = new Date().toISOString();
  await db.update(task).set({ deletedAt: now, updatedAt: now }).where(eq(task.id, id));
}

// Query helpers below back the Tasks screen's five sections
// (docs/SCREEN_SPECIFICATIONS.md): Überfällig/Heute/Demnächst/Ohne Datum/
// Erledigt. All exclude soft-deleted tasks. "Overdue"/"today"/"upcoming"
// are derived from `date` compared against a caller-supplied `today`
// (never `Date.now()` internally), so overdue derivation is testable with
// an injected fixed clock, per docs/TEST_STRATEGY.md — and since SQLite
// comparisons against a NULL column are themselves NULL (never true), an
// undated task's `date` naturally never matches any of these three without
// needing an explicit `IS NOT NULL` filter.

/** Incomplete tasks whose `date` is before `today` — the Überfällig section. */
export async function listOverdueTasks(db: TaskDb, today: string): Promise<Task[]> {
  return db
    .select()
    .from(task)
    .where(and(isNull(task.deletedAt), eq(task.isCompleted, false), lt(task.date, today)));
}

/** Incomplete tasks whose `date` is exactly `today` — the Heute section. */
export async function listTasksForToday(db: TaskDb, today: string): Promise<Task[]> {
  return db
    .select()
    .from(task)
    .where(and(isNull(task.deletedAt), eq(task.isCompleted, false), eq(task.date, today)));
}

/** Incomplete tasks whose `date` is after `today` — the Demnächst section. */
export async function listUpcomingTasks(db: TaskDb, today: string): Promise<Task[]> {
  return db
    .select()
    .from(task)
    .where(and(isNull(task.deletedAt), eq(task.isCompleted, false), gt(task.date, today)));
}

/** Incomplete tasks with no `date` at all — the Ohne Datum section. */
export async function listUndatedTasks(db: TaskDb): Promise<Task[]> {
  return db
    .select()
    .from(task)
    .where(and(isNull(task.deletedAt), eq(task.isCompleted, false), isNull(task.date)));
}

/** All completed tasks, regardless of date — the (collapsed-by-default) Erledigt section. */
export async function listCompletedTasks(db: TaskDb): Promise<Task[]> {
  return db
    .select()
    .from(task)
    .where(and(isNull(task.deletedAt), eq(task.isCompleted, true)));
}
