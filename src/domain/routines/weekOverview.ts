import { addDaysToDateString } from '../dates';
import { classifyOccurrence, type OccurrenceEvent, type OccurrenceState } from './completion';
import { scheduleFromRoutineRow, type IsoWeekday, type RoutineScheduleRow } from './schedule';

/** ISO weekday (1 = Monday … 7 = Sunday) of a `YYYY-MM-DD` date string. */
function isoWeekdayOf(dateString: string): IsoWeekday {
  const [year, month, day] = dateString.split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay(); // 0 = Sunday … 6 = Saturday
  return (jsDay === 0 ? 7 : jsDay) as IsoWeekday;
}

/** The Monday–Sunday `YYYY-MM-DD` dates of the week containing `today`. */
export function currentWeekDates(today: string): string[] {
  const monday = addDaysToDateString(today, 1 - isoWeekdayOf(today));
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(monday, index));
}

// The Plan screen's week overview shows only three states per day, per
// docs/SCREEN_SPECIFICATIONS.md's Plan Screen section — a lighter-weight
// summary than the full OccurrenceState set the routine detail calendar
// uses: completed/exceeded collapse to one filled state, and every
// unresolved-but-not-missed case (pending, skipped, moved, paused-via-not_due)
// reads as the same hollow "nothing to show" dot.
export type DotState = 'completed' | 'missed' | 'not_due';

function toDotState(state: OccurrenceState): DotState {
  if (state === 'completed' || state === 'exceeded') {
    return 'completed';
  }
  if (state === 'missed') {
    return 'missed';
  }
  return 'not_due';
}

export interface RoutineForWeekOverview extends RoutineScheduleRow {
  readonly id: string;
  readonly name: string;
}

export interface RoutineWeekRow {
  readonly routineId: string;
  readonly routineName: string;
  readonly days: readonly DotState[];
}

/**
 * Builds one row per routine, each with one dot state per day of the given
 * week — the Plan screen's weekly completion overview
 * (docs/SCREEN_SPECIFICATIONS.md). Pure: takes already-loaded events, does
 * no data fetching.
 */
export function buildRoutineWeekRows(
  routines: readonly RoutineForWeekOverview[],
  eventsByRoutineId: Readonly<Record<string, readonly OccurrenceEvent[]>>,
  weekDates: readonly string[],
  today: string,
): RoutineWeekRow[] {
  return routines.map((routine) => {
    const schedule = scheduleFromRoutineRow(routine);
    const events = eventsByRoutineId[routine.id] ?? [];
    const days = weekDates.map((date) => toDotState(classifyOccurrence(schedule, date, events, today)));
    return { routineId: routine.id, routineName: routine.name, days };
  });
}
