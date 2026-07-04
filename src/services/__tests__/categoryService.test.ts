import { eq } from 'drizzle-orm';
import { createDrizzleTestDb } from '../../data/db/testUtils';
import { routine, task } from '../../data/db/schema';
import { createCategory, getCategory } from '../../data/repositories/categoryRepository';
import {
  CategoryHasReferencesError,
  CategoryNotFoundError,
  deleteCategory,
} from '../categoryService';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-category-id-${counter++}`),
  };
});

async function seedRoutine(db: Awaited<ReturnType<typeof createDrizzleTestDb>>['db'], categoryId: string) {
  const now = new Date().toISOString();
  await db.insert(routine).values({
    id: 'test-routine-id',
    name: 'Laufen',
    categoryId,
    scheduleType: 'daily',
    allowConsciousSkip: false,
    isPaused: false,
    sortOrder: 0,
    colorVariantSeed: 0,
    createdAt: now,
    updatedAt: now,
  });
}

async function seedTask(db: Awaited<ReturnType<typeof createDrizzleTestDb>>['db'], categoryId: string) {
  const now = new Date().toISOString();
  await db.insert(task).values({
    id: 'test-task-id',
    title: 'Einkaufen',
    categoryId,
    isCompleted: false,
    sortOrder: 0,
    colorVariantSeed: 0,
    createdAt: now,
    updatedAt: now,
  });
}

describe('categoryService.deleteCategory', () => {
  it('deletes an unreferenced category directly, with no resolution', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const unreferenced = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });

    await deleteCategory(db, unreferenced.id);

    expect(await getCategory(db, unreferenced.id)).toBeUndefined();

    sqlite.close();
  });

  it('reassigns referencing routines and tasks before deleting, when resolution is reassign', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const toDelete = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });
    const target = await createCategory(db, { name: 'Fitness', baseColor: '#5E9A76' });
    await seedRoutine(db, toDelete.id);
    await seedTask(db, toDelete.id);

    await deleteCategory(db, toDelete.id, { type: 'reassign', toCategoryId: target.id });

    expect(await getCategory(db, toDelete.id)).toBeUndefined();
    const [linkedRoutine] = await db.select().from(routine).where(eq(routine.id, 'test-routine-id'));
    const [linkedTask] = await db.select().from(task).where(eq(task.id, 'test-task-id'));
    expect(linkedRoutine.categoryId).toBe(target.id);
    expect(linkedTask.categoryId).toBe(target.id);

    sqlite.close();
  });

  it('nulls out referencing routines and tasks before deleting, when resolution is remove', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const toDelete = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });
    await seedRoutine(db, toDelete.id);
    await seedTask(db, toDelete.id);

    await deleteCategory(db, toDelete.id, { type: 'remove' });

    expect(await getCategory(db, toDelete.id)).toBeUndefined();
    const [linkedRoutine] = await db.select().from(routine).where(eq(routine.id, 'test-routine-id'));
    const [linkedTask] = await db.select().from(task).where(eq(task.id, 'test-task-id'));
    expect(linkedRoutine.categoryId).toBeNull();
    expect(linkedTask.categoryId).toBeNull();

    sqlite.close();
  });

  it('rejects deleting a referenced category when no resolution is provided, leaving everything unchanged', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const referenced = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });
    await seedRoutine(db, referenced.id);

    await expect(deleteCategory(db, referenced.id)).rejects.toThrow(CategoryHasReferencesError);

    expect(await getCategory(db, referenced.id)).toEqual(referenced);
    const [linkedRoutine] = await db.select().from(routine).where(eq(routine.id, 'test-routine-id'));
    expect(linkedRoutine.categoryId).toBe(referenced.id);

    sqlite.close();
  });

  it('rejects reassigning to a category that does not exist, leaving everything unchanged', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const toDelete = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });
    await seedRoutine(db, toDelete.id);

    await expect(
      deleteCategory(db, toDelete.id, { type: 'reassign', toCategoryId: 'does-not-exist' }),
    ).rejects.toThrow(CategoryNotFoundError);

    expect(await getCategory(db, toDelete.id)).toEqual(toDelete);
    const [linkedRoutine] = await db.select().from(routine).where(eq(routine.id, 'test-routine-id'));
    expect(linkedRoutine.categoryId).toBe(toDelete.id);

    sqlite.close();
  });

  it('throws for an unknown category id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(deleteCategory(db, 'does-not-exist')).rejects.toThrow(CategoryNotFoundError);

    sqlite.close();
  });
});
