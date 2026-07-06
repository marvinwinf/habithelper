import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { routineStateCache } from '../db/schema';
import type { RoutineStreakState } from '../../domain/streaks/replay';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type RoutineStateCacheDb = BaseSQLiteDatabase<'sync', unknown, { routineStateCache: typeof routineStateCache }>;

export type RoutineStateCache = typeof routineStateCache.$inferSelect;

/**
 * Builds a full cache row from a replay result, without writing it — the
 * caller persists it inside the same transaction as the `routine_event`
 * write that triggered the recompute (see routineService's Event and Cache
 * Write Atomicity requirement, docs/ARCHITECTURE.md).
 */
export function buildRoutineStateCache(
  routineId: string,
  state: RoutineStreakState,
  reconciledThroughDate: string,
): RoutineStateCache {
  return {
    routineId,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    totalCompletions: state.totalCompletions,
    levelRank: state.levelRank,
    jokerInventory: state.jokerInventory,
    jokerProgress: state.jokerProgress,
    consecutiveMissedAfter66: state.consecutiveMissedAfter66,
    reconciledThroughDate,
    recalculatedAt: new Date().toISOString(),
  };
}

/** All cache rows at once — the Today screen reads streaks for every due routine in one query (T065). */
export async function listRoutineStateCaches(
  db: RoutineStateCacheDb,
): Promise<RoutineStateCache[]> {
  return db.select().from(routineStateCache);
}

/** Reads a routine's cache row, if it has ever been computed. */
export async function getRoutineStateCache(
  db: RoutineStateCacheDb,
  routineId: string,
): Promise<RoutineStateCache | undefined> {
  const [row] = await db
    .select()
    .from(routineStateCache)
    .where(eq(routineStateCache.routineId, routineId))
    .limit(1);
  return row;
}

/**
 * Discards a routine's cache row entirely. Always safe: the cache is purely
 * derived and must always be re-derivable from `routine_event` by replay
 * (docs/DATA_MODEL.md) — this is what makes that guarantee testable.
 */
export async function deleteRoutineStateCache(db: RoutineStateCacheDb, routineId: string): Promise<void> {
  await db.delete(routineStateCache).where(eq(routineStateCache.routineId, routineId));
}
