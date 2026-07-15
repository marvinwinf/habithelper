import { eq, isNull } from 'drizzle-orm';
import { routine, routineEvent, routineStateCache } from '../data/db/schema';
import { buildRoutineEvent } from '../data/repositories/routineEventRepository';
import type { RoutineStateCache } from '../data/repositories/routineStateCacheRepository';
import { addDaysToDateString, todayDateString } from '../domain/dates';
import { reconcileMissedOccurrences } from '../domain/routines/reconcile';
import { scheduleFromRoutineRow } from '../domain/routines/schedule';
import {
  RoutineNotFoundError,
  recomputeAppStreakCacheTx,
  recomputeRoutineCacheTx,
  type RoutineServiceDb,
  type RoutineServiceTx,
} from './routineService';

/**
 * Reconciles a single routine: materializes `missed`/`joker_protected`/
 * `joker_consumed` events for every due-but-unaccounted occurrence from the
 * day after its cache's `reconciled_through_date` up to yesterday (T036),
 * then recomputes and persists its cache with the advanced watermark — all
 * in one transaction, per docs/ARCHITECTURE.md's Event and Cache Write
 * Atomicity (which explicitly covers "a direct user action or a
 * reconciliation pass"). A routine with no cache row yet is seeded to the
 * day before its own `created_at` date, since "a routine starts immediately
 * when created" (docs/DATA_MODEL.md) — nothing earlier needs reconciling.
 */
export async function reconcileRoutine(
  db: RoutineServiceDb,
  routineId: string,
  today: string = todayDateString(),
): Promise<RoutineStateCache> {
  return db.transaction((tx) => {
    const [routineRow] = tx.select().from(routine).where(eq(routine.id, routineId)).all();
    if (!routineRow) {
      throw new RoutineNotFoundError(routineId);
    }

    const events = tx.select().from(routineEvent).where(eq(routineEvent.routineId, routineId)).all();
    const [existingCache] = tx
      .select()
      .from(routineStateCache)
      .where(eq(routineStateCache.routineId, routineId))
      .all();

    const schedule = scheduleFromRoutineRow(routineRow);
    const reconciledThroughDate =
      existingCache?.reconciledThroughDate ?? addDaysToDateString(routineRow.createdAt.slice(0, 10), -1);

    const plan = reconcileMissedOccurrences(schedule, events, reconciledThroughDate, today);
    for (const eventToWrite of plan.eventsToWrite) {
      const written = buildRoutineEvent({
        routineId,
        occurrenceDate: eventToWrite.occurrenceDate,
        eventType: eventToWrite.eventType,
      });
      tx.insert(routineEvent).values(written).run();
    }

    return recomputeRoutineCacheTx(tx, routineId, plan.reconciledThroughDate);
  });
}

/**
 * Reconciles the singleton app streak cache across every non-deleted routine
 * by fully re-deriving it from the event log (`recomputeAppStreakCacheTx`),
 * using the provisional reset-on-fully-missed-day assumption documented in
 * docs/IMPLEMENTATION_PLAN.md's Open Product Questions (not yet confirmed with
 * the product owner). A cache row exists only once a completion has actually
 * been recorded. Because the whole streak is replayed each time rather than
 * advanced from a watermark, a past day filled in retroactively (e.g. via the
 * calendar) is always reflected — the stale-watermark blind spot the old
 * incremental reconciliation had is gone.
 */
export async function reconcileAppStreak(
  db: RoutineServiceDb,
  today: string = todayDateString(),
): Promise<void> {
  db.transaction((tx: RoutineServiceTx) => recomputeAppStreakCacheTx(tx, today));
}

/**
 * Runs reconciliation for every non-deleted routine (paused routines
 * included — their due dates all fall inside a pause period, so this is a
 * correct, cheap no-op for them; see docs/ARCHITECTURE.md), then the app
 * streak. Called at app startup, before any routine's state is shown
 * anywhere (T038).
 */
export async function reconcileAllActiveRoutines(
  db: RoutineServiceDb,
  today: string = todayDateString(),
): Promise<void> {
  const routines = await db.select().from(routine).where(isNull(routine.deletedAt));
  for (const routineRow of routines) {
    await reconcileRoutine(db, routineRow.id, today);
  }
  await reconcileAppStreak(db, today);
}
