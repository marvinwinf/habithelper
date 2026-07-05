import { createDrizzleTestDb } from '../../db/testUtils';
import {
  TaskNotFoundError,
  completeTask,
  createTask,
  getTask,
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
  listUndatedTasks,
  listUpcomingTasks,
  softDeleteTask,
  undoTaskCompletion,
  updateTask,
} from '../taskRepository';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-task-id-${counter++}`),
  };
});

const baseInput = {
  title: 'Wäsche waschen',
  sortOrder: 0,
  colorVariantSeed: 0,
};

describe('taskRepository', () => {
  it('creates a task with a generated id, incomplete and not deleted', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const created = await createTask(db, baseInput);

    expect(created.id).toBe('test-task-id-0');
    expect(created.title).toBe('Wäsche waschen');
    expect(created.isCompleted).toBe(false);
    expect(created.completedAt).toBeNull();
    expect(created.deletedAt).toBeNull();
    expect(created.date).toBeNull();
    expect(created.createdAt).toBe(created.updatedAt);

    sqlite.close();
  });

  it('reads a task by id, and undefined for an unknown id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    expect(await getTask(db, created.id)).toEqual(created);
    expect(await getTask(db, 'does-not-exist')).toBeUndefined();

    sqlite.close();
  });

  it('updates editable fields without changing id (renaming a task preserves its identity)', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    const renamed = await updateTask(db, created.id, { title: 'Wäsche aufhängen', date: '2026-07-10' });

    expect(renamed.id).toBe(created.id);
    expect(renamed.title).toBe('Wäsche aufhängen');
    expect(renamed.date).toBe('2026-07-10');

    sqlite.close();
  });

  it('throws when updating an unknown task', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(updateTask(db, 'does-not-exist', { title: 'X' })).rejects.toThrow(TaskNotFoundError);

    sqlite.close();
  });

  it('completes a task at the given time, then undoes it', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    const completed = await completeTask(db, created.id, '2026-07-05T10:00:00.000Z');
    expect(completed.isCompleted).toBe(true);
    expect(completed.completedAt).toBe('2026-07-05T10:00:00.000Z');

    const undone = await undoTaskCompletion(db, created.id);
    expect(undone.isCompleted).toBe(false);
    expect(undone.completedAt).toBeNull();

    sqlite.close();
  });

  it('throws when completing or undoing an unknown task', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(completeTask(db, 'does-not-exist')).rejects.toThrow(TaskNotFoundError);
    await expect(undoTaskCompletion(db, 'does-not-exist')).rejects.toThrow(TaskNotFoundError);

    sqlite.close();
  });

  it('soft-deletes a task, preserving its row and id (completed tasks are stored permanently)', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createTask(db, baseInput);

    await softDeleteTask(db, created.id);

    const afterDelete = await getTask(db, created.id);
    expect(afterDelete?.id).toBe(created.id);
    expect(afterDelete?.deletedAt).not.toBeNull();

    sqlite.close();
  });

  it('throws when soft-deleting an unknown task', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(softDeleteTask(db, 'does-not-exist')).rejects.toThrow(TaskNotFoundError);

    sqlite.close();
  });

  describe('query helpers', () => {
    const TODAY = '2026-07-05';

    async function seedOneOfEach(db: Awaited<ReturnType<typeof createDrizzleTestDb>>['db']) {
      const overdue = await createTask(db, { ...baseInput, title: 'Overdue', date: '2026-07-04' });
      const today = await createTask(db, { ...baseInput, title: 'Today', date: TODAY });
      const upcoming = await createTask(db, { ...baseInput, title: 'Upcoming', date: '2026-07-06' });
      const undated = await createTask(db, { ...baseInput, title: 'Undated' });
      const completed = await createTask(db, { ...baseInput, title: 'Completed', date: '2026-07-01' });
      await completeTask(db, completed.id, '2026-07-01T09:00:00.000Z');
      return { overdue, today, upcoming, undated, completed };
    }

    it('lists overdue tasks: incomplete with a date before today, using an injected fixed clock', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { overdue, today } = await seedOneOfEach(db);

      const overdueList = await listOverdueTasks(db, TODAY);
      expect(overdueList.map((t) => t.id)).toEqual([overdue.id]);

      // Advance the injected clock by one day, past the "today" task's own
      // date: it becomes overdue too, purely because the clock moved — no
      // stored flag changed. Proves overdue is derived, not persisted
      // (docs/DATA_MODEL.md's Task Representation).
      const overdueNextDay = await listOverdueTasks(db, '2026-07-06');
      expect(overdueNextDay.map((t) => t.id).sort()).toEqual([overdue.id, today.id].sort());

      sqlite.close();
    });

    it('lists tasks due today: incomplete with a date exactly matching today', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { today } = await seedOneOfEach(db);

      expect((await listTasksForToday(db, TODAY)).map((t) => t.id)).toEqual([today.id]);
      // A different fixed "today" matches whichever task actually has that
      // date — here, the one seeded for 2026-07-04.
      expect(await listTasksForToday(db, '2026-07-04')).toHaveLength(1);

      sqlite.close();
    });

    it('lists upcoming tasks: incomplete with a date after today', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { upcoming } = await seedOneOfEach(db);

      expect((await listUpcomingTasks(db, TODAY)).map((t) => t.id)).toEqual([upcoming.id]);

      sqlite.close();
    });

    it('lists undated tasks: incomplete with no date at all', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { undated } = await seedOneOfEach(db);

      expect((await listUndatedTasks(db)).map((t) => t.id)).toEqual([undated.id]);

      sqlite.close();
    });

    it('lists completed tasks regardless of date, excluding them from the other sections', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { completed } = await seedOneOfEach(db);

      expect((await listCompletedTasks(db)).map((t) => t.id)).toEqual([completed.id]);
      expect(await listOverdueTasks(db, TODAY)).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: completed.id })]),
      );

      sqlite.close();
    });

    it('excludes soft-deleted tasks from every query helper', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const { overdue, today, upcoming, undated, completed } = await seedOneOfEach(db);
      await Promise.all(
        [overdue, today, upcoming, undated, completed].map((t) => softDeleteTask(db, t.id)),
      );

      expect(await listOverdueTasks(db, TODAY)).toEqual([]);
      expect(await listTasksForToday(db, TODAY)).toEqual([]);
      expect(await listUpcomingTasks(db, TODAY)).toEqual([]);
      expect(await listUndatedTasks(db)).toEqual([]);
      expect(await listCompletedTasks(db)).toEqual([]);

      sqlite.close();
    });
  });
});
