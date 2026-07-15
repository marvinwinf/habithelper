// The overall app streak (docs/ROUTINE_RULES.md's Overall App Streak
// section) is derived from a day-by-day walk across ALL routines at once,
// unlike a single routine's replay — so this is a separate, small pure
// function rather than an extension of replay.ts.

import { addDaysToDateString } from '../dates';
import { classifyOccurrence, type OccurrenceEvent } from '../routines/completion';
import { derivePausePeriods, isDatePaused } from '../routines/pause';
import type { RoutineSchedule } from '../routines/schedule';

export interface AppStreakDayInput {
  readonly date: string;
  // Whether any active (unpaused) routine had a due occurrence on this day,
  // regardless of outcome — a day with none never breaks the streak.
  readonly hasScheduledOccurrence: boolean;
  // Whether any routine was actually completed (completed/exceeded) on this
  // day — conscious skips and joker-protected occurrences don't count
  // (docs/ROUTINE_RULES.md).
  readonly hasActualCompletion: boolean;
}

export interface AppStreakState {
  readonly currentStreak: number;
  readonly lastIncrementedDate: string | null;
}

/**
 * Folds a chronological day-by-day walk into the overall app streak, per
 * docs/ROUTINE_RULES.md and the provisional reset-on-fully-missed-day
 * assumption documented in docs/IMPLEMENTATION_PLAN.md's Open Product
 * Questions (not yet confirmed with the product owner): a day with at least
 * one actual completion extends the streak by one; a day with scheduled
 * occurrences and zero completions resets it to 0; a day with no scheduled
 * occurrences at all leaves it unchanged either way.
 */
export function reconcileAppStreakDays(
  days: readonly AppStreakDayInput[],
  initialState: AppStreakState,
): AppStreakState {
  return days.reduce((state, day) => {
    if (day.hasActualCompletion) {
      if (state.lastIncrementedDate !== null && day.date <= state.lastIncrementedDate) {
        return state;
      }
      return { currentStreak: state.currentStreak + 1, lastIncrementedDate: day.date };
    }
    if (day.hasScheduledOccurrence) {
      return { ...state, currentStreak: 0 };
    }
    return state;
  }, initialState);
}

/** One routine's schedule and full event history, the inputs a day-by-day
 * app-streak walk needs to classify each of its occurrences. */
export interface AppStreakRoutineContext {
  readonly schedule: RoutineSchedule;
  readonly events: readonly OccurrenceEvent[];
}

/** The earliest non-superseded occurrence date across every routine, or null
 * if nothing has been recorded yet — the day the app-streak walk starts. */
function earliestOccurrenceDate(contexts: readonly AppStreakRoutineContext[]): string | null {
  let earliest: string | null = null;
  for (const { events } of contexts) {
    for (const event of events) {
      if (!event.supersededByEventId && (earliest === null || event.occurrenceDate < earliest)) {
        earliest = event.occurrenceDate;
      }
    }
  }
  return earliest;
}

/** Whether any of a routine's events on `date` mark it paused, so a paused
 * day is excluded from the app streak the same way it is from daily planning
 * (docs/ROUTINE_RULES.md's Pause section). */
function isRoutinePausedOn(events: readonly OccurrenceEvent[], date: string): boolean {
  const pausePeriods = derivePausePeriods(
    events.filter(
      (event): event is OccurrenceEvent & { eventType: 'paused' | 'reactivated' } =>
        event.eventType === 'paused' || event.eventType === 'reactivated',
    ),
  );
  return isDatePaused(date, pausePeriods);
}

/**
 * Recomputes the overall app streak from scratch by replaying every routine's
 * full event log day by day, per docs/DATA_MODEL.md (`app_streak_cache` is a
 * cache that "must always be re-derivable from routine_event by replay"). This
 * is the single source of truth for the global streak: every completion, undo,
 * retroactive calendar edit, and startup reconciliation funnels through it, so
 * a backdated completion that fills a past gap (which an incremental +1 could
 * never see) correctly lifts the global streak, and a missed day correctly
 * breaks it.
 *
 * The walk runs from the earliest recorded occurrence up to and including
 * `today`, folding each day with `reconcileAppStreakDays`. `today` itself is
 * still in progress, so it can only *extend* the streak (when something was
 * actually completed) and never reset it just because the day's routines are
 * still pending — every earlier day applies the normal reset-on-fully-missed
 * rule.
 */
export function computeAppStreak(
  contexts: readonly AppStreakRoutineContext[],
  today: string,
): AppStreakState {
  const earliest = earliestOccurrenceDate(contexts);
  if (earliest === null) {
    return { currentStreak: 0, lastIncrementedDate: null };
  }

  const days: AppStreakDayInput[] = [];
  for (let cursor = earliest; cursor <= today; cursor = addDaysToDateString(cursor, 1)) {
    let hasScheduledOccurrence = false;
    let hasActualCompletion = false;

    for (const { schedule, events } of contexts) {
      const outcome = classifyOccurrence(schedule, cursor, events, today);
      if (outcome === 'not_due' || isRoutinePausedOn(events, cursor)) {
        continue;
      }
      hasScheduledOccurrence = true;
      if (outcome === 'completed' || outcome === 'exceeded') {
        hasActualCompletion = true;
      }
    }

    // Today is not over: never let a still-pending today reset the streak.
    // It only appears in the walk when it actually carries a completion.
    if (cursor === today && !hasActualCompletion) {
      break;
    }
    days.push({ date: cursor, hasScheduledOccurrence, hasActualCompletion });
  }

  return reconcileAppStreakDays(days, { currentStreak: 0, lastIncrementedDate: null });
}

/**
 * Whether writing an actual completion for `occurrenceDate` would be the
 * first one recorded for that calendar day, given the app streak cache's
 * current `lastIncrementedDate` — the same forward-only comparison
 * `src/services/routineService.ts`'s cache update uses to decide whether to
 * extend the streak, reused here as the UI's signal for exactly when to
 * play the first-completion-of-day burst animation (T041): once per day,
 * on whichever completion happens to land first.
 */
export function isFirstCompletionOfDay(
  lastIncrementedDate: string | null | undefined,
  occurrenceDate: string,
): boolean {
  return !lastIncrementedDate || occurrenceDate > lastIncrementedDate;
}
