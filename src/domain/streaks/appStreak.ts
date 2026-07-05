// The overall app streak (docs/ROUTINE_RULES.md's Overall App Streak
// section) is derived from a day-by-day walk across ALL routines at once,
// unlike a single routine's replay — so this is a separate, small pure
// function rather than an extension of replay.ts.

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
