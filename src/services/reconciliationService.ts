import { eq, isNull } from 'drizzle-orm';
import { appStreakCache, routine, routineEvent, routineStateCache } from '../data/db/schema';
import { buildRoutineEvent } from '../data/repositories/routineEventRepository';
import { APP_STREAK_CACHE_ID, buildAppStreakCache } from '../data/repositories/appStreakCacheRepository';
import type { RoutineStateCache } from '../data/repositories/routineStateCacheRepository';
import { addDaysToDateString, todayDateString } from '../domain/dates';
import { classifyOccurrence, type OccurrenceEvent } from '../domain/routines/completion';
import { derivePausePeriods, isDatePaused } from '../domain/routines/pause';
import { reconcileMissedOccurrences } from '../domain/routines/reconcile';
import { scheduleFromRoutineRow, type RoutineSchedule } from '../domain/routines/schedule';
import { reconcileAppStreakDays, type AppStreakDayInput, type AppStreakState } from '../domain/streaks/appStreak';
import {
  RoutineNotFoundError,
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
 * Gathers, for each elapsed day in `(reconciledThroughDate, today)`, whether
 * any routine had a due occurrence that day (excluding paused periods) and
 * whether any routine was actually completed that day — the two facts
 * `reconcileAppStreakDays` needs per docs/ROUTINE_RULES.md's Overall App
 * Streak section.
 */
function computeAppStreakDayInputs(
  routinesWithEvents: readonly { schedule: RoutineSchedule; events: readonly OccurrenceEvent[] }[],
  reconciledThroughDate: string,
  today: string,
): AppStreakDayInput[] {
  const days: AppStreakDayInput[] = [];
  let cursor = addDaysToDateString(reconciledThroughDate, 1);

  while (cursor < today) {
    let hasScheduledOccurrence = false;
    let hasActualCompletion = false;

    for (const { schedule, events } of routinesWithEvents) {
      const outcome = classifyOccurrence(schedule, cursor, events, today);
      if (outcome === 'not_due') {
        continue;
      }

      const pausePeriods = derivePausePeriods(
        events.filter(
          (event): event is OccurrenceEvent & { eventType: 'paused' | 'reactivated' } =>
            event.eventType === 'paused' || event.eventType === 'reactivated',
        ),
      );
      if (isDatePaused(cursor, pausePeriods)) {
        continue;
      }

      hasScheduledOccurrence = true;
      if (outcome === 'completed' || outcome === 'exceeded') {
        hasActualCompletion = true;
      }
    }

    days.push({ date: cursor, hasScheduledOccurrence, hasActualCompletion });
    cursor = addDaysToDateString(cursor, 1);
  }

  return days;
}

/**
 * Reconciles the singleton app streak cache across every non-deleted
 * routine, using the provisional reset-on-fully-missed-day assumption
 * documented in docs/IMPLEMENTATION_PLAN.md's Open Product Questions (not
 * yet confirmed with the product owner). A cache row is created only once a
 * completion has actually been found — consistent with
 * routineService's completion-triggered app streak cache, which follows the
 * same convention.
 */
export async function reconcileAppStreak(
  db: RoutineServiceDb,
  today: string = todayDateString(),
): Promise<void> {
  db.transaction((tx: RoutineServiceTx) => {
    const routines = tx.select().from(routine).where(isNull(routine.deletedAt)).all();
    const routinesWithEvents = routines.map((r) => ({
      schedule: scheduleFromRoutineRow(r),
      events: tx.select().from(routineEvent).where(eq(routineEvent.routineId, r.id)).all(),
    }));

    const [existing] = tx.select().from(appStreakCache).where(eq(appStreakCache.id, APP_STREAK_CACHE_ID)).all();
    const yesterday = addDaysToDateString(today, -1);
    const reconciledThroughDate = existing?.reconciledThroughDate ?? yesterday;

    const days = computeAppStreakDayInputs(routinesWithEvents, reconciledThroughDate, today);
    const initialState: AppStreakState = {
      currentStreak: existing?.currentStreak ?? 0,
      lastIncrementedDate: existing?.lastIncrementedDate ?? null,
    };
    const finalState = reconcileAppStreakDays(days, initialState);

    if (!existing && finalState.lastIncrementedDate === null) {
      return;
    }

    const newReconciledThroughDate = reconciledThroughDate >= yesterday ? reconciledThroughDate : yesterday;
    const cache = buildAppStreakCache(
      finalState.currentStreak,
      finalState.lastIncrementedDate ?? (existing?.lastIncrementedDate as string),
      newReconciledThroughDate,
    );

    if (existing) {
      tx.update(appStreakCache).set(cache).where(eq(appStreakCache.id, APP_STREAK_CACHE_ID)).run();
    } else {
      tx.insert(appStreakCache).values(cache).run();
    }
  });
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
