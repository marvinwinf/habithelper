import { isOccurrenceDue, type MovedOccurrence, type RoutineSchedule } from './schedule';

// A closed or open-ended window during which a routine was paused, derived
// from its 'paused'/'reactivated' event history. `pausedFrom` is the first
// paused day (inclusive); `reactivatedOn`, if present, is the first day the
// routine is active again (exclusive end) — an absent `reactivatedOn` means
// the routine is still paused.
export interface PausePeriod {
  readonly pausedFrom: string;
  readonly reactivatedOn?: string;
}

export interface PauseOccurrenceEvent {
  readonly occurrenceDate: string;
  readonly eventType: 'paused' | 'reactivated';
  readonly supersededByEventId?: string | null;
}

/**
 * Reconstructs a routine's pause periods from its 'paused'/'reactivated'
 * event history, pairing each pause with the reactivation that follows it
 * (if any). Already-superseded events and out-of-turn duplicates (e.g. two
 * 'paused' events with no 'reactivated' between them) are ignored.
 */
export function derivePausePeriods(events: readonly PauseOccurrenceEvent[]): PausePeriod[] {
  const relevant = events
    .filter((event) => !event.supersededByEventId)
    .slice()
    .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));

  const periods: PausePeriod[] = [];
  let openPauseDate: string | undefined;

  for (const event of relevant) {
    if (event.eventType === 'paused' && openPauseDate === undefined) {
      openPauseDate = event.occurrenceDate;
    } else if (event.eventType === 'reactivated' && openPauseDate !== undefined) {
      periods.push({ pausedFrom: openPauseDate, reactivatedOn: event.occurrenceDate });
      openPauseDate = undefined;
    }
  }

  if (openPauseDate !== undefined) {
    periods.push({ pausedFrom: openPauseDate });
  }

  return periods;
}

export function isDatePaused(date: string, pausePeriods: readonly PausePeriod[]): boolean {
  return pausePeriods.some((period) => {
    if (date < period.pausedFrom) {
      return false;
    }
    if (period.reactivatedOn !== undefined && date >= period.reactivatedOn) {
      return false;
    }
    return true;
  });
}

/**
 * Whether a routine has a due occurrence on `date`, accounting for pause
 * periods — a paused routine is excluded from active daily planning
 * entirely, per docs/ROUTINE_RULES.md's Pause section.
 */
export function isOccurrenceDueConsideringPause(
  schedule: RoutineSchedule,
  date: string,
  pausePeriods: readonly PausePeriod[],
  movedOccurrences: readonly MovedOccurrence[] = [],
): boolean {
  if (isDatePaused(date, pausePeriods)) {
    return false;
  }
  return isOccurrenceDue(schedule, date, movedOccurrences);
}

export interface RoutineProgressState {
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalCompletions: number;
  readonly levelRank: number;
}

/**
 * The routine's streak/level/total state while paused: frozen, i.e.
 * returned completely unchanged, per docs/ROUTINE_RULES.md ("freezes the
 * active streak", "preserves level rank", "preserves total completions").
 * Reactivating continues from this exact preserved state, so no separate
 * "resume" transformation exists — the same state simply becomes subject to
 * normal calculation again once active.
 */
export function freezeProgressDuringPause(state: RoutineProgressState): RoutineProgressState {
  return state;
}
