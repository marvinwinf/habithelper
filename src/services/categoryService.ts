import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { category, routine, task } from '../data/db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type CategoryServiceDb = BaseSQLiteDatabase<
  'sync',
  unknown,
  { category: typeof category; routine: typeof routine; task: typeof task }
>;

export type CategoryDeleteResolution = { type: 'reassign'; toCategoryId: string } | { type: 'remove' };

export class CategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Category not found: ${id}`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryHasReferencesError extends Error {
  constructor(id: string) {
    super(
      `Category ${id} is still referenced by routines or tasks; pass a resolution (reassign or remove) to delete it`,
    );
    this.name = 'CategoryHasReferencesError';
  }
}

/**
 * Deletes a category, per docs/SCREEN_SPECIFICATIONS.md's Category
 * Management delete flow ("reassignment, removal of category, or
 * cancellation"): an unreferenced category deletes directly. A referenced
 * one requires an explicit `resolution`, applied atomically (in the same
 * transaction as the delete) before the row is always hard-deleted, per
 * docs/DATA_MODEL.md's Deletion note — nothing else stores a category
 * name/color snapshot that would need preserving.
 *
 * Runs as a single synchronous SQLite transaction: the better-sqlite3
 * driver's `.transaction()` rejects async callbacks outright (and an
 * un-awaited async callback would let statements escape the transaction
 * boundary entirely), so every statement inside uses the query builder's
 * synchronous `.run()`/`.all()` rather than `await`.
 */
export async function deleteCategory(
  db: CategoryServiceDb,
  id: string,
  resolution?: CategoryDeleteResolution,
): Promise<void> {
  db.transaction((tx) => {
    const [existing] = tx.select().from(category).where(eq(category.id, id)).all();
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }

    // Includes soft-deleted routines/tasks: the foreign key still points at
    // this category row until it's reassigned or nulled out, and SQLite
    // enforces that constraint on delete regardless of `deleted_at`.
    const referencingRoutines = tx.select().from(routine).where(eq(routine.categoryId, id)).all();
    const referencingTasks = tx.select().from(task).where(eq(task.categoryId, id)).all();
    const isReferenced = referencingRoutines.length > 0 || referencingTasks.length > 0;

    if (isReferenced) {
      if (!resolution) {
        throw new CategoryHasReferencesError(id);
      }

      let nextCategoryId: string | null = null;
      if (resolution.type === 'reassign') {
        const [target] = tx
          .select()
          .from(category)
          .where(eq(category.id, resolution.toCategoryId))
          .all();
        if (!target) {
          throw new CategoryNotFoundError(resolution.toCategoryId);
        }
        nextCategoryId = resolution.toCategoryId;
      }

      tx.update(routine).set({ categoryId: nextCategoryId }).where(eq(routine.categoryId, id)).run();
      tx.update(task).set({ categoryId: nextCategoryId }).where(eq(task.categoryId, id)).run();
    }

    tx.delete(category).where(eq(category.id, id)).run();
  });
}
