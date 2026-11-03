import { addDaysToDateString } from '../dates';
import { classifyOccurrence, type OccurrenceEvent, type OccurrenceState } from './completion';
import { getIsoWeekday, scheduleFromRoutineRow, type RoutineScheduleRow } from './schedule';

/** The Monday–Sunday `YYYY-MM-DD` dates of the week containing `today`. */
export function currentWeekDates(today: string): string[] {
  const monday = addDaysToDateString(today, 1 - getIsoWeekday(today));
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(monday, index));
}

/** The Progress screen's selectable horizons (T091). */
export type ProgressRange = 'week' | '30d' | 'all';

function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  return Math.round((endMs - startMs) / 86_400_000);
}

/**
 * The `YYYY-MM-DD` dates covered by `range`, ending on `today`:
 * - `week`: the Monday–Sunday week containing `today` (see `currentWeekDates`).
 * - `30d`: the trailing 30 days including `today`.
 * - `all`: from `earliestDate` (the oldest event the user has, or `today` when
 *   there is none yet) through `today`, inclusive.
 */
export function rangeDates(
  today: string,
  range: ProgressRange,
  earliestDate?: string,
): string[] {
  if (range === 'week') {
    return currentWeekDates(today);
  }
  if (range === '30d') {
    return Array.from({ length: 30 }, (_, index) => addDaysToDateString(today, index - 29));
  }
  const start = earliestDate ?? today;
  const span = Math.max(0, daysBetween(start, today));
  return Array.from({ length: span + 1 }, (_, index) => addDaysToDateString(start, index));
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
