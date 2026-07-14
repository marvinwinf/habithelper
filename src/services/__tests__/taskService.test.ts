import { createDrizzleTestDb } from '../../data/db/testUtils';
import {
  getTask,
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
} from '../../data/repositories/taskRepository';
import {
  TaskNotFoundError,
  createTask,
  deleteTask,
  editTask,
  moveTask,
  setTaskCompletion,
  toggleTaskCompletion,
} from '../taskService';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-task-id-${counter++}`),
  };
});

const baseInput = { title: 'Wäsche waschen', colorVariantSeed: 0 };

describe('taskService', () => {
  it('creates a task with only a title required, defaulting sortOrder', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const created = await createTask(db, baseInput);

    expect(created.title).toBe('Wäsche waschen');
    expect(created.sortOrder).toBe(0);
    expect(created.isCompleted).toBe(false);
    expect(created.date).toBeNull();

    sqlite.close();
  });

  it('edits a task without changing its id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    const edited = await editTask(db, created.id, { title: 'Wäsche aufhängen', description: 'Balkon' });

    expect(edited.id).toBe(created.id);
    expect(edited.title).toBe('Wäsche aufhängen');
    expect(edited.description).toBe('Balkon');

    sqlite.close();
  });

  it('throws when editing an unknown task', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(editTask(db, 'does-not-exist', { title: 'X' })).rejects.toThrow(TaskNotFoundError);

    sqlite.close();
  });

  it('completes an incomplete task, setting is_completed and completed_at', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    const completed = await toggleTaskCompletion(db, created.id, '2026-07-05T10:00:00.000Z');

    expect(completed.isCompleted).toBe(true);
    expect(completed.completedAt).toBe('2026-07-05T10:00:00.000Z');

    sqlite.close();
  });

  it('undoes an already-completed task, clearing is_completed and completed_at', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);
    await toggleTaskCompletion(db, created.id, '2026-07-05T10:00:00.000Z');

    const undone = await toggleTaskCompletion(db, created.id);

    expect(undone.isCompleted).toBe(false);
    expect(undone.completedAt).toBeNull();

    sqlite.close();
  });

  it('toggling completion twice returns to the original state (completion control also serves as undo)', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    await toggleTaskCompletion(db, created.id);
    await toggleTaskCompletion(db, created.id);

    const final = await getTask(db, created.id);
    expect(final?.isCompleted).toBe(false);
    expect(final?.completedAt).toBeNull();

    sqlite.close();
  });

  it('throws when toggling completion on an unknown task', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(toggleTaskCompletion(db, 'does-not-exist')).rejects.toThrow(TaskNotFoundError);

    sqlite.close();
  });

  it('moves a task to a new date', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, { ...baseInput, date: '2026-07-01' });

    const moved = await moveTask(db, created.id, '2026-07-02');

    expect(moved.date).toBe('2026-07-02');

    sqlite.close();
  });

  it('deletes a task via a soft delete, preserving its row and id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    await deleteTask(db, created.id);

    const afterDelete = await getTask(db, created.id);
    expect(afterDelete?.id).toBe(created.id);
    expect(afterDelete?.deletedAt).not.toBeNull();

    sqlite.close();
  });

  it('deleting a completed task preserves its completed history rather than removing it', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);
    await toggleTaskCompletion(db, created.id, '2026-07-05T10:00:00.000Z');

    await deleteTask(db, created.id);

    const afterDelete = await getTask(db, created.id);
    expect(afterDelete?.isCompleted).toBe(true);
    expect(afterDelete?.completedAt).toBe('2026-07-05T10:00:00.000Z');
    expect(afterDelete?.deletedAt).not.toBeNull();

    sqlite.close();
  });

  it('recalculates overdue status correctly as a fixed clock advances past a task\'s date, with no explicit recompute step', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, { ...baseInput, date: '2026-07-05' });

    // On its own date, the task is due today, not overdue.
    expect(await listOverdueTasks(db, '2026-07-05')).toEqual([]);
    expect((await listTasksForToday(db, '2026-07-05')).map((t) => t.id)).toEqual([created.id]);

    // The clock alone advances past that date — nothing about the task
    // itself changes, yet it now shows as overdue (docs/DATA_MODEL.md:
    // overdue is derived, never a stored flag).
    expect((await listOverdueTasks(db, '2026-07-06')).map((t) => t.id)).toEqual([created.id]);
    expect(await listTasksForToday(db, '2026-07-06')).toEqual([]);

    sqlite.close();
  });

  describe('setTaskCompletion (explicit target state)', () => {
    it('completes a task and is idempotent when the target is unchanged', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createTask(db, baseInput);

      const completed = await setTaskCompletion(db, created.id, true, '2026-07-05T10:00:00.000Z');
      expect(completed.isCompleted).toBe(true);
      expect(completed.completedAt).toBe('2026-07-05T10:00:00.000Z');

      // Setting the same target again must not change the recorded completion
      // time — a repeated tap is a no-op, not a fresh completion.
      const again = await setTaskCompletion(db, created.id, true, '2026-07-05T11:00:00.000Z');
      expect(again.completedAt).toBe('2026-07-05T10:00:00.000Z');

      sqlite.close();
    });

    it('un-completing is idempotent and never re-flips a just-checked task', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createTask(db, baseInput);
      await setTaskCompletion(db, created.id, true, '2026-07-05T10:00:00.000Z');

      // A repeated "complete" tap (same target) leaves it complete rather than
      // toggling it back off — the multi-tap bug a plain toggle exhibited.
      const stillComplete = await setTaskCompletion(db, created.id, true);
      expect(stillComplete.isCompleted).toBe(true);

      const undone = await setTaskCompletion(db, created.id, false);
      expect(undone.isCompleted).toBe(false);
      expect(undone.completedAt).toBeNull();

      const undoneAgain = await setTaskCompletion(db, created.id, false);
      expect(undoneAgain.isCompleted).toBe(false);

      sqlite.close();
    });

    it('throws when the target task does not exist', async () => {
      const { db, sqlite } = await createDrizzleTestDb();

      await expect(setTaskCompletion(db, 'does-not-exist', true)).rejects.toThrow(TaskNotFoundError);

      sqlite.close();
    });

    it('updates each task independently — completing several by id does not overwrite the others', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const a = await createTask(db, { ...baseInput, title: 'A', date: '2026-07-05' });
      const b = await createTask(db, { ...baseInput, title: 'B', date: '2026-07-05' });
      const c = await createTask(db, { ...baseInput, title: 'C', date: '2026-07-05' });

      // Complete the first and last, leaving the middle open. Each write is
      // scoped to its own stable id, so none clobbers another.
      await setTaskCompletion(db, a.id, true, '2026-07-05T10:00:00.000Z');
      await setTaskCompletion(db, c.id, true, '2026-07-05T10:01:00.000Z');

      const open = (await listTasksForToday(db, '2026-07-05')).map((t) => t.id);
      expect(open).toEqual([b.id]);

      const done = (await listCompletedTasks(db)).map((t) => t.id).sort();
      expect(done).toEqual([a.id, c.id].sort());

      sqlite.close();
    });

    it('persists and reloads the exact completion state', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const a = await createTask(db, { ...baseInput, title: 'A' });
      const b = await createTask(db, { ...baseInput, title: 'B' });

      await setTaskCompletion(db, a.id, true, '2026-07-05T10:00:00.000Z');

      // Re-reading from persistence returns the same states — a completed
      // task stays completed, an untouched one stays open.
      expect((await getTask(db, a.id))?.isCompleted).toBe(true);
      expect((await getTask(db, b.id))?.isCompleted).toBe(false);

      sqlite.close();
    });
  });
});
