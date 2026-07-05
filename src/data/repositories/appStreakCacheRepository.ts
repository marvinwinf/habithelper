import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { appStreakCache } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type AppStreakCacheDb = BaseSQLiteDatabase<'sync', unknown, { appStreakCache: typeof appStreakCache }>;

export type AppStreakCache = typeof appStreakCache.$inferSelect;

// Single row, constant id (docs/DATA_MODEL.md's app_streak_cache table).
export const APP_STREAK_CACHE_ID = 'app_streak_cache';

/** Builds the singleton app streak cache row, without writing it. */
export function buildAppStreakCache(
  currentStreak: number,
  lastIncrementedDate: string,
  reconciledThroughDate: string,
): AppStreakCache {
  return {
    id: APP_STREAK_CACHE_ID,
    currentStreak,
    lastIncrementedDate,
    reconciledThroughDate,
    recalculatedAt: new Date().toISOString(),
  };
}

/** Reads the singleton app streak cache row, if it has ever been computed. */
export async function getAppStreakCache(db: AppStreakCacheDb): Promise<AppStreakCache | undefined> {
  const [row] = await db.select().from(appStreakCache).where(eq(appStreakCache.id, APP_STREAK_CACHE_ID)).limit(1);
  return row;
}

/** Discards the app streak cache row entirely — re-derivable, same guarantee as routine_state_cache. */
export async function deleteAppStreakCache(db: AppStreakCacheDb): Promise<void> {
  await db.delete(appStreakCache).where(eq(appStreakCache.id, APP_STREAK_CACHE_ID));
}
