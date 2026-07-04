import { randomUUID } from 'expo-crypto';
import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { category } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type CategoryDb = BaseSQLiteDatabase<'sync', unknown, { category: typeof category }>;

export type Category = typeof category.$inferSelect;

export interface CategoryInput {
  name: string;
  baseColor: string;
}

class CategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Category not found: ${id}`);
    this.name = 'CategoryNotFoundError';
  }
}

/** Creates a new category with a freshly generated, stable `id`. */
export async function createCategory(db: CategoryDb, input: CategoryInput): Promise<Category> {
  const now = new Date().toISOString();
  const created: Category = {
    id: randomUUID(),
    name: input.name,
    baseColor: input.baseColor,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(category).values(created);
  return created;
}

export async function getCategory(db: CategoryDb, id: string): Promise<Category | undefined> {
  const [row] = await db.select().from(category).where(eq(category.id, id)).limit(1);
  return row;
}

/** All categories, in no particular order (screens are responsible for sorting/display). */
export async function listCategories(db: CategoryDb): Promise<Category[]> {
  return db.select().from(category);
}

/**
 * Updates a category's editable fields. The `id` is never part of the
 * update payload and is never regenerated — renaming (or recoloring) a
 * category must not disconnect it from routines/tasks that reference its
 * `id`, per docs/DATA_PERSISTENCE.md's Stable Identifiers rule.
 */
export async function updateCategory(
  db: CategoryDb,
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const existing = await getCategory(db, id);
  if (!existing) {
    throw new CategoryNotFoundError(id);
  }

  const updated: Category = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.update(category).set(updated).where(eq(category.id, id));
  return updated;
}

/**
 * Hard-deletes a category row. Callers must resolve any routine/task
 * references first (reassign or null out `category_id`) — see the
 * category service (T021) for that orchestration; this repository performs
 * no reference checks of its own, per docs/DATA_MODEL.md's Deletion note.
 */
export async function deleteCategory(db: CategoryDb, id: string): Promise<void> {
  await db.delete(category).where(eq(category.id, id));
}
