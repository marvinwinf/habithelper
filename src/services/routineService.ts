import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { routine, routineEvent } from '../data/db/schema';
import {
  RoutineNotFoundError,
  createRoutine as repoCreateRoutine,
  getRoutine,
  listRoutines,
  updateRoutine,
  type Routine,
  type RoutineInput,
} from '../data/repositories/routineRepository';
import {
  appendRoutineEvent,
  listRoutineEvents,
  supersedeRoutineEvent,
  type RoutineEvent,
} from '../data/repositories/routineEventRepository';
import { requestConsciousSkip } from '../domain/routines/completion';
import { planRetroactiveCompletion } from '../domain/routines/retroactive';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type RoutineServiceDb = BaseSQLiteDatabase<
  'sync',
  unknown,
  { routine: typeof routine; routineEvent: typeof routineEvent }
>;

export { RoutineNotFoundError };
export type { Routine, RoutineEvent };

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

/** Normal completion: counts as one successful completion (docs/ROUTINE_RULES.md). */
export async function completeRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<RoutineEvent> {
  return appendRoutineEvent(db, { routineId, occurrenceDate, eventType: 'completed' });
}

/** Exceeded completion: also counts as one successful completion, but with stronger feedback only — no extra streak/level progress. */
export async function exceedRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<RoutineEvent> {
  return appendRoutineEvent(db, { routineId, occurrenceDate, eventType: 'exceeded' });
}

/**
 * Conscious skip: rejected outright when the routine doesn't allow it (see
 * `requestConsciousSkip`), otherwise recorded without affecting streak,
 * jokers, or missed-occurrence status, per docs/ROUTINE_RULES.md.
 */
export async function skipRoutineOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
  skipReason?: string,
): Promise<RoutineEvent> {
  const target = await getRoutine(db, routineId);
  if (!target) {
    throw new RoutineNotFoundError(routineId);
  }

  const request = requestConsciousSkip(target.allowConsciousSkip, occurrenceDate, skipReason);
  return appendRoutineEvent(db, {
    routineId,
    occurrenceDate: request.occurrenceDate,
    eventType: 'skipped',
    skipReason: request.skipReason,
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
  return appendRoutineEvent(db, {
    routineId,
    occurrenceDate: fromDate,
    eventType: 'moved',
    movedToDate: toDate,
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
  await appendRoutineEvent(db, { routineId, occurrenceDate: date, eventType: 'paused' });
  await updateRoutine(db, routineId, { isPaused: true });
}

/** Reactivates a paused routine, resuming from its preserved state (docs/ROUTINE_RULES.md). */
export async function reactivateRoutine(
  db: RoutineServiceDb,
  routineId: string,
  date: string,
): Promise<void> {
  await appendRoutineEvent(db, { routineId, occurrenceDate: date, eventType: 'reactivated' });
  await updateRoutine(db, routineId, { isPaused: false });
}

export interface RetroactiveCompletionResult {
  readonly writtenEvents: readonly RoutineEvent[];
  readonly jokerRestored: boolean;
  readonly requiresFullRecalculation: true;
}

/**
 * Retroactively completes a past occurrence on its original `occurrenceDate`
 * (docs/ROUTINE_RULES.md). Plans the supersede chain via T027's pure domain
 * function, then persists it: writes each new event, then marks every event
 * it supersedes (including a prior `joker_consumed` event, if any — restored
 * via a `joker_restored` event) rather than deleting anything.
 */
export async function retroactivelyCompleteOccurrence(
  db: RoutineServiceDb,
  routineId: string,
  occurrenceDate: string,
): Promise<RetroactiveCompletionResult> {
  const priorEvents = await listRoutineEvents(db, routineId);
  const plan = planRetroactiveCompletion(occurrenceDate, priorEvents);

  const writtenEvents: RoutineEvent[] = [];
  for (const eventToWrite of plan.eventsToWrite) {
    const written = await appendRoutineEvent(db, {
      routineId,
      occurrenceDate: eventToWrite.occurrenceDate,
      eventType: eventToWrite.eventType,
    });
    writtenEvents.push(written);

    for (const supersededId of eventToWrite.supersedesEventIds) {
      await supersedeRoutineEvent(db, supersededId, written.id);
    }
  }

  return {
    writtenEvents,
    jokerRestored: plan.jokerRestored,
    requiresFullRecalculation: plan.requiresFullRecalculation,
  };
}
