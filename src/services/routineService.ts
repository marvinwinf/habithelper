import { eq, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { BaseSQLiteDatabase, SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { appStreakCache, routine, routineEvent, routineStateCache } from '../data/db/schema';
import {
  RoutineNotFoundError,
  createRoutine as repoCreateRoutine,
  listRoutines,
  type Routine,
  type RoutineInput,
} from '../data/repositories/routineRepository';
import {
  buildRoutineEvent,
  listRoutineEvents,
  type RoutineEvent,
} from '../data/repositories/routineEventRepository';
import {
  buildRoutineStateCache,
  type RoutineStateCache,
} from '../data/repositories/routineStateCacheRepository';
import { APP_STREAK_CACHE_ID, buildAppStreakCache } from '../data/repositories/appStreakCacheRepository';
import { addDaysToDateString, todayDateString } from '../domain/dates';
import { requestConsciousSkip } from '../domain/routines/completion';
import { planRetroactiveCompletion } from '../domain/routines/retroactive';
import { isFirstCompletionOfDay } from '../domain/streaks/appStreak';
import { JOKER_EARN_THRESHOLD, replayRoutineStreak } from '../domain/streaks/replay';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
export type RoutineServiceSchema = {
  routine: typeof routine;
  routineEvent: typeof routineEvent;
  routineStateCache: typeof routineStateCache;
  appStreakCache: typeof appStreakCache;
};
export type RoutineServiceDb = BaseSQLiteDatabase<'sync', unknown, RoutineServiceSchema>;
export type RoutineServiceTx = SQLiteTransaction<
  'sync',
  unknown,
  RoutineServiceSchema,
  ExtractTablesWithRelations<RoutineServiceSchema>
>;

export { RoutineNotFoundError };
export type { Routine, RoutineEvent, RoutineStateCache };

/**
 * Recomputes a routine's streak/joker/level cache from its full event log
 * and persists it, per docs/ARCHITECTURE.md's Event and Cache Write
 * Atomicity — always called from inside the same transaction as the
 * `routine_event` write(s) that triggered it, never on its own.
 *
 * `reconciledThroughDateOverride` lets the reconciliation service (T038)
 * advance the watermark to the value it just computed, in the same
 * transaction as the events it wrote; direct user actions never pass it, so
 * `reconciled_through_date` is otherwise preserved from the existing cache
 * row untouched. The very first cache computation for a routine (no
 * existing row, no override) seeds it to the day before that routine's
 * earliest known event, so nothing before it is ever mistaken for already
 * reconciled.
 */
export function recomputeRoutineCacheTx(
  tx: RoutineServiceTx,
  routineId: string,
  reconciledThroughDateOverride?: string,
): RoutineStateCache {
  const events = tx.select().from(routineEvent).where(eq(routineEvent.routineId, routineId)).all();
  const state = replayRoutineStreak(events);

  const [existingCache] = tx
    .select()
    .from(routineStateCache)
    .where(eq(routineStateCache.routineId, routineId))
    .all();

  const earliestEventDate =
    events.length > 0
      ? events.reduce(
          (min: string, event) => (event.occurrenceDate < min ? event.occurrenceDate : min),
          events[0].occurrenceDate,
        )
      : todayDateString();
  const reconciledThroughDate =
    reconciledThroughDateOverride ??
    existingCache?.reconciledThroughDate ??
    addDaysToDateString(earliestEventDate, -1);

  const cache = buildRoutineStateCache(routineId, state, reconciledThroughDate);
  if (existingCache) {
    tx.update(routineStateCache).set(cache).where(eq(routineStateCache.routineId, routineId)).run();
  } else {
    tx.insert(routineStateCache).values(cache).run();
  }
  return cache;
}

/**
 * Recomputes the singleton app streak cache after an actual completion
 * (`completed`/`exceeded` only — docs/ROUTINE_RULES.md excludes skips and
 * joker-protected occurrences), per the same atomicity requirement as
 * `recomputeRoutineCacheTx`. Only ever extends the streak for a *new*, later
 * day's first completion: an already-accounted-for date, or one older than
 * the current watermark (a backdated/retroactive completion), is a no-op
 * here — correctly bridging a reconciliation-aware gap is the reconciliation
 * service's job (T038; see docs/IMPLEMENTATION_PLAN.md's Open Product
 * Questions), not a direct user action's.
 */
function recomputeAppStreakCacheOnCompletionTx(tx: RoutineServiceTx, occurrenceDate: string): void {
  const [existing] = tx
    .select()
    .from(appStreakCache)
    .where(eq(appStreakCache.id, APP_STREAK_CACHE_ID))
    .all();

  if (!existing) {
    const cache = buildAppStreakCache(1, occurrenceDate, addDaysToDateString(occurrenceDate, -1));
    tx.insert(appStreakCache).values(cache).run();
    return;
  }

  if (!isFirstCompletionOfDay(existing.lastIncrementedDate, occurrenceDate)) {
    return;
  }

  const cache = buildAppStreakCache(existing.currentStreak + 1, occurrenceDate, existing.reconciledThroughDate);
  tx.update(appStreakCache).set(cache).where(eq(appStreakCache.id, APP_STREAK_CACHE_ID)).run();
}

/**
 * Recomputes and persists a routine's cache on its own, outside any specific
 * event write — used to re-derive a cache row that was discarded (proving
 * the always-re-derivable guarantee, docs/DATA_MODEL.md) and, later, by the
 * reconciliation service (T038) after it writes missed/joker events.
 */
export async function recomputeRoutineCache(
  db: RoutineServiceDb,
  routineId: string,
): Promise<RoutineStateCache> {
  return db.transaction((tx) => recomputeRoutineCacheTx(tx, routineId));
}

export type CreateRoutineInput = Omit<RoutineInput, 'sortOrder'>;

/**
 * Creates a routine, per docs/ROUTINE_RULES.md ("a routine starts
 * immediately when created"). `sortOrder` is not caller-supplied — it's
 * assigned here, appended after every existing routine (including
 * soft-deleted ones, so a restored/undone delete never collides), so the
 * Routines screen's manual reorder (T032) has a stable starting position.
 */
export async function createRoutine(db: RoutineServiceDb, input: CreateRoutineInput): Promise<Routine> {
  const existing = await listRoutines(db, { includeDeleted: true });
  const maxSortOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1);
  return repoCreateRoutine(db, { ...input, sortOrder: maxSortOrder + 1 });
}

/**
 * Writes a joker_earned event immediately when a completion's resulting
 * jokerProgress crosses the earn threshold, per docs/ARCHITECTURE.md
 * ("joker_earned ... is written eagerly by the completion action itself, at
 * the same time as the completed/exceeded event"). Checked via a throwaway
 * replay of the event log as it stands right after the just-written
 * completion — replay itself never grants a joker from jokerProgress alone
 * (see replay.ts), so this is the one place that decision is made. Only
 * ever called from a direct completion; a retroactive completion (which can
 * insert into the middle of history) would need a forward walk similar to
 * reconciliation to backfill any joker_earned crossing correctly, which is
 * out of scope here and left as a known limitation.
 */
function maybeWriteJokerEarnedEventTx(
  tx: RoutineServiceTx,
  routineId: string,
  occurrenceDate: string,
): void {
  const events = tx.select().from(routineEvent).where(eq(routineEvent.routineId, routineId)).all();
  const state = replayRoutineStreak(events);
  if (state.jokerProgress === JOKER_EARN_THRESHOLD) {
    const jokerEarnedEvent = buildRoutineEvent({ routineId, occurrenceDate, eventType: 'joker_earned' });
    tx.insert(routineEvent).values(jokerEarnedEvent).run();
  }
}

export interface CompletionResult {
  readonly event: RoutineEvent;
  // Whether this specific completion crossed a 66-completion level boundary
  // (docs/ROUTINE_RULES.md's Levels section) — the signal T042's level-up
  // milestone animation fires on, exactly once, on the crossing completion.
  readonly leveledUp: boolean;
}

/**
 * Writes a completion event (`completed` or `exceeded`), any resulting
 * `joker_earned` event, and recomputes both the routine cache and (since
 * this is an actual completion) the app streak cache, all in one
 * transaction (docs/ARCHITECTURE.md's Event and Cache Write Atomicity).
 * `leveledUp` compares the cache's `levelRank` immediately before and after,
 * so it is true only for the one completion that actually crosses a
 * 66-completion boundary.
 */
function writeCompletionEventTx(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
  eventType: 'completed' | 'exceeded',
): CompletionResult {
  return db.transaction((tx) => {
    const [previousCache] = tx
      .select()
      .from(routineStateCache)
      .where(eq(routineStateCache.routineId, routineId))
      .all();

    const event = buildRoutineEvent({ routineId, occurrenceDate, eventType });
    tx.insert(routineEvent).values(event).run();
    maybeWriteJokerEarnedEventTx(tx, routineId, occurrenceDate);
    const newCache = recomputeRoutineCacheTx(tx, routineId);
    recomputeAppStreakCacheOnCompletionTx(tx, occurrenceDate);

    return { event, leveledUp: newCache.levelRank > (previousCache?.levelRank ?? 0) };
  });
}

/** Normal completion: counts as one successful completion (docs/ROUTINE_RULES.md). */
export async function completeRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<CompletionResult> {
  return writeCompletionEventTx(db, routineId, occurrenceDate, 'completed');
}

/** Exceeded completion: also counts as one successful completion, but with stronger feedback only — no extra streak/level progress. */
export async function exceedRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<CompletionResult> {
  return writeCompletionEventTx(db, routineId, occurrenceDate, 'exceeded');
}

/**
 * Conscious skip: rejected outright when the routine doesn't allow it (see
 * `requestConsciousSkip`), otherwise recorded without affecting streak,
 * jokers, or missed-occurrence status, per docs/ROUTINE_RULES.md. The
 * routine lookup, event write, and cache recompute all happen in one
 * transaction.
 */
export async function skipRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
  skipReason?: string,
): Promise<RoutineEvent> {
  return db.transaction((tx) => {
    const [target] = tx.select().from(routine).where(eq(routine.id, routineId)).all();
    if (!target) {
      throw new RoutineNotFoundError(routineId);
    }

    const request = requestConsciousSkip(target.allowConsciousSkip, occurrenceDate, skipReason);
    const event = buildRoutineEvent({
      routineId,
      occurrenceDate: request.occurrenceDate,
      eventType: 'skipped',
      skipReason: request.skipReason,
    });
    tx.insert(routineEvent).values(event).run();
    recomputeRoutineCacheTx(tx, routineId);
    return event;
  });
}

/**
 * Moves a planned occurrence to a new date. The original date is never
 * treated as missed; if the moved occurrence goes uncompleted on the new
 * date, normal missed-occurrence rules apply there instead (docs/ROUTINE_RULES.md).
 */
export async function moveRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  fromDate: string,
  toDate: string,
): Promise<RoutineEvent> {
  return db.transaction((tx) => {
    const event = buildRoutineEvent({
      routineId,
      occurrenceDate: fromDate,
      eventType: 'moved',
      movedToDate: toDate,
    });
    tx.insert(routineEvent).values(event).run();
    recomputeRoutineCacheTx(tx, routineId);
    return event;
  });
}

/**
 * Pauses a routine: removes it from active daily planning and freezes its
 * streak/level/total state (docs/ROUTINE_RULES.md). Writes the `paused`
 * event that domain logic (`derivePausePeriods`) replays, and flips the
 * denormalized `routine.isPaused` flag the Active/Paused tabs (T032) filter on.
 */
export async function pauseRoutine(
  db: RoutineServiceDb,
  routineId: string,
  date: string,
): Promise<void> {
  setPauseState(db, routineId, date, true);
}

/** Reactivates a paused routine, resuming from its preserved state (docs/ROUTINE_RULES.md). */
export async function reactivateRoutine(
  db: RoutineServiceDb,
  routineId: string,
  date: string,
): Promise<void> {
  setPauseState(db, routineId, date, false);
}

/**
 * Writes the pause/reactivate event and flips the `isPaused` flag in one
 * synchronous SQLite transaction, so a crash can never leave the event log
 * and the flag disagreeing (the same all-sync-inside-the-transaction rule
 * documented on categoryService.deleteCategory applies here).
 */
function setPauseState(
  db: RoutineServiceDb,
  routineId: string,
  date: string,
  isPaused: boolean,
): void {
  const event = buildRoutineEvent({
    routineId,
    occurrenceDate: date,
    eventType: isPaused ? 'paused' : 'reactivated',
  });
  const updatedAt = new Date().toISOString();

  db.transaction((tx) => {
    const [existing] = tx.select().from(routine).where(eq(routine.id, routineId)).all();
    if (!existing) {
      throw new RoutineNotFoundError(routineId);
    }
    tx.insert(routineEvent).values(event).run();
    tx.update(routine).set({ isPaused, updatedAt }).where(eq(routine.id, routineId)).run();
    recomputeRoutineCacheTx(tx, routineId);
  });
}

export interface RetroactiveCompletionResult {
  readonly writtenEvents: readonly RoutineEvent[];
  readonly jokerRestored: boolean;
  readonly requiresFullRecalculation: true;
  // Same signal as CompletionResult.leveledUp (T042) — a retroactive edit
  // genuinely adds a `completed` event too, so it can cross a level
  // boundary just like a direct completion.
  readonly leveledUp: boolean;
}

/**
 * Retroactively completes a past occurrence on its original `occurrenceDate`
 * (docs/ROUTINE_RULES.md). Plans the supersede chain via T027's pure domain
 * function, then persists it in one synchronous transaction: each new event
 * plus the `superseded_by_event_id` marks on the rows it replaces land
 * together or not at all — a partial write would leave two active events
 * for the same occurrence, which the replay logic cannot disambiguate.
 */
export async function retroactivelyCompleteOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<RetroactiveCompletionResult> {
  const priorEvents = await listRoutineEvents(db, routineId);
  const plan = planRetroactiveCompletion(occurrenceDate, priorEvents);

  const writtenEvents: RoutineEvent[] = [];
  let leveledUp = false;
  db.transaction((tx) => {
    const [previousCache] = tx
      .select()
      .from(routineStateCache)
      .where(eq(routineStateCache.routineId, routineId))
      .all();

    for (const eventToWrite of plan.eventsToWrite) {
      const written = buildRoutineEvent({
        routineId,
        occurrenceDate: eventToWrite.occurrenceDate,
        eventType: eventToWrite.eventType,
      });
      tx.insert(routineEvent).values(written).run();
      writtenEvents.push(written);

      for (const supersededId of eventToWrite.supersedesEventIds) {
        tx.update(routineEvent)
          .set({ supersededByEventId: written.id })
          .where(eq(routineEvent.id, supersededId))
          .run();
      }
    }

    const newCache = recomputeRoutineCacheTx(tx, routineId);
    leveledUp = newCache.levelRank > (previousCache?.levelRank ?? 0);
    // planRetroactiveCompletion always writes a 'completed' event for
    // occurrenceDate, so this occurrence is now (or remains) an actual
    // completion for the app streak's purposes.
    recomputeAppStreakCacheOnCompletionTx(tx, occurrenceDate);
  });

  return {
    writtenEvents,
    jokerRestored: plan.jokerRestored,
    requiresFullRecalculation: plan.requiresFullRecalculation,
    leveledUp,
  };
}
