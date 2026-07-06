import { eq } from 'drizzle-orm';
import { createDrizzleTestDb } from '../../db/testUtils';
import { routine } from '../../db/schema';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../categoryRepository';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-category-id-${counter++}`),
  };
});

describe('categoryRepository', () => {
  it('creates a category with a generated id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const created = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });

    expect(created.id).toBe('test-category-id-0');
    expect(created.name).toBe('Sport');
    expect(created.baseColor).toBe('#8FBFA0');
    expect(created.createdAt).toBe(created.updatedAt);

    sqlite.close();
  });

  it('reads a category by id, and undefined for an unknown id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createCategory(db, { name: 'Haushalt', baseColor: '#A9A0D6' });

    expect(await getCategory(db, created.id)).toEqual(created);
    expect(await getCategory(db, 'does-not-exist')).toBeUndefined();

    sqlite.close();
  });

  it('lists all categories', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const first = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });
    const second = await createCategory(db, { name: 'Haushalt', baseColor: '#A9A0D6' });

    const all = await listCategories(db);

    expect(all).toHaveLength(2);
    expect(all.map((c) => c.id).sort()).toEqual([first.id, second.id].sort());

    sqlite.close();
  });

  it('deletes a category', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });

    await deleteCategory(db, created.id);

    expect(await getCategory(db, created.id)).toBeUndefined();

    sqlite.close();
  });

  it('round-trips the icon, defaulting to NULL when omitted', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const withIcon = await createCategory(db, {
      name: 'Sport',
      baseColor: '#8FBFA0',
      icon: 'barbell',
    });
    const withoutIcon = await createCategory(db, { name: 'Haushalt', baseColor: '#A9A0D6' });

    expect((await getCategory(db, withIcon.id))?.icon).toBe('barbell');
    expect((await getCategory(db, withoutIcon.id))?.icon).toBeNull();

    const updated = await updateCategory(db, withoutIcon.id, { icon: 'home' });
    expect(updated.icon).toBe('home');
    expect((await getCategory(db, withoutIcon.id))?.icon).toBe('home');

    sqlite.close();
  });

  it('throws when updating an unknown category', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(updateCategory(db, 'does-not-exist', { name: 'X' })).rejects.toThrow(
      'Category not found: does-not-exist',
    );

    sqlite.close();
  });

  it('renaming a category does not change its id, and existing routine.category_id references remain valid', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createCategory(db, { name: 'Sport', baseColor: '#8FBFA0' });

    const now = new Date().toISOString();
    await db.insert(routine).values({
      id: 'test-routine-id',
      name: 'Laufen',
      categoryId: created.id,
      scheduleType: 'daily',
      allowConsciousSkip: false,
      isPaused: false,
      sortOrder: 0,
      colorVariantSeed: 0,
      createdAt: now,
      updatedAt: now,
    });

    const renamed = await updateCategory(db, created.id, {
      name: 'Fitness',
      baseColor: '#5E9A76',
    });

    expect(renamed.id).toBe(created.id);
    expect(renamed.name).toBe('Fitness');

    const [linkedRoutine] = await db.select().from(routine).where(eq(routine.id, 'test-routine-id'));
    expect(linkedRoutine.categoryId).toBe(created.id);

    const categoryViaRoutine = await getCategory(db, linkedRoutine.categoryId!);
    expect(categoryViaRoutine?.name).toBe('Fitness');

    sqlite.close();
  });
});
