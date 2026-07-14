import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { task } from '../data/db/schema';
import {
  TaskNotFoundError,
  completeTask,
  createTask as repoCreateTask,
  getTask,
  softDeleteTask,
  undoTaskCompletion,
  updateTask,
  type Task,
  type TaskInput,
  type TaskUpdateInput,
} from '../data/repositories/taskRepository';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type TaskServiceDb = BaseSQLiteDatabase<'sync', unknown, { task: typeof task }>;

export { TaskNotFoundError };
export type { Task };

export type CreateTaskInput = Omit<TaskInput, 'sortOrder'> & { sortOrder?: number };

/**
 * Creates a task — only `title` is required (docs/MVP_SCOPE.md); every
 * other field, including `sortOrder`, is optional and defaults sensibly.
 * Precise placement within a Tasks-screen section is that screen's concern
 * (T046), not this service.
 */
export async function createTask(db: TaskServiceDb, input: CreateTaskInput): Promise<Task> {
  return repoCreateTask(db, { sortOrder: 0, ...input });
}

/** Edits a task's fields (docs/MVP_SCOPE.md's "editing") — a plain field update, since tasks carry no event history to preserve (docs/DATA_MODEL.md's Task Representation). */
export async function editTask(db: TaskServiceDb, id: string, input: TaskUpdateInput): Promise<Task> {
  return updateTask(db, id, input);
}

/**
 * Sets a task's completion to an explicit target state, idempotently. The
 * caller passes the target it wants (typically `!task.isCompleted` derived
 * from the row it just rendered), so no stale DB read decides the outcome and
 * calling it repeatedly with the same target is a harmless no-op. This is what
 * keeps a repeated tap — or one racing the screen's async reload, where the
 * card still shows the pre-tap state — from flipping a just-checked task back
 * off. Completing sets `is_completed`/`completed_at`; un-completing clears both.
 */
export async function setTaskCompletion(
  db: TaskServiceDb,
  id: string,
  isCompleted: boolean,
  now: string = new Date().toISOString(),
): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }
  if (existing.isCompleted === isCompleted) {
    return existing;
  }
  return isCompleted ? completeTask(db, id, now) : undoTaskCompletion(db, id);
}

/**
 * Toggles a task's completion off its current persisted state — the
 * completion control also serves as undo (docs/SCREEN_SPECIFICATIONS.md).
 * Prefer `setTaskCompletion` from UI handlers, which pass an explicit target
 * and so avoid the read-then-flip race; this remains for callers that
 * genuinely want "flip whatever it is now".
 */
export async function toggleTaskCompletion(
  db: TaskServiceDb,
  id: string,
  now: string = new Date().toISOString(),
): Promise<Task> {
  const existing = await getTask(db, id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }
  return setTaskCompletion(db, id, !existing.isCompleted, now);
}

/**
 * Moves a task to a new date — covers both "move to tomorrow" and "move to
 * another date" (docs/MVP_SCOPE.md), which differ only in what date the
 * caller computes (e.g. via `addDaysToDateString(today, 1)` for tomorrow).
 */
export async function moveTask(db: TaskServiceDb, id: string, date: string): Promise<Task> {
  return updateTask(db, id, { date });
}

/**
 * Deletes a task. Always a soft delete — completed tasks are stored
 * permanently (docs/MVP_SCOPE.md), so deletion is a distinct, user-initiated
 * action from completion, never a hard delete.
 */
export async function deleteTask(db: TaskServiceDb, id: string): Promise<void> {
  return softDeleteTask(db, id);
}
