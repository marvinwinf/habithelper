import { classifyOccurrence, type OccurrenceEvent } from './completion';
import { derivePausePeriods, isDatePaused } from './pause';
import type { RoutineSchedule } from './schedule';

// Per-day states shown in the routine detail calendar, per
// docs/SCREEN_SPECIFICATIONS.md's Calendar states list. Joker-protected
// styling is deferred to Phase 6 (see T034/T039 in TASKS.md), so it is not
// yet a distinct state here.
export type CalendarDayState =
  | 'not_due'
  | 'pending'
  | 'completed'
  | 'exceeded'
  | 'skipped'
  | 'moved'
  | 'missed'
  | 'paused';

/**
 * Classifies one calendar day for a routine's detail-screen history view.
 * Builds on classifyOccurrence (T026) and adds the two concerns specific to
 * the calendar: days before the routine existed are outside its history
 * (a routine "starts immediately when created", docs/DATA_MODEL.md), and
 * days inside a pause period show as paused rather than missed/pending
 * (pause "removes it from active daily planning", docs/ROUTINE_RULES.md).
 */
export function getCalendarDayState(
  schedule: RoutineSchedule,
  events: readonly OccurrenceEvent[],
  startDate: string,
  date: string,
  today: string,
): CalendarDayState {
  if (date < startDate) {
    return 'not_due';
  }

  const state = classifyOccurrence(schedule, date, events, today);
  // An explicit recorded outcome always wins, even inside a pause period.
  if (state === 'completed' || state === 'exceeded' || state === 'skipped' || state === 'moved') {
    return state;
  }

  const pausePeriods = derivePausePeriods(
    events.filter(
      (event): event is OccurrenceEvent & { eventType: 'paused' | 'reactivated' } =>
        event.eventType === 'paused' || event.eventType === 'reactivated',
    ),
  );
  if (state !== 'not_due' && isDatePaused(date, pausePeriods)) {
    return 'paused';
  }

  return state;
}

/** All dates (`YYYY-MM-DD`) of the given month, in order. `month` is 1-12. */
export function listMonthDates(year: number, month: number): string[] {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  return Array.from(
    { length: dayCount },
    (_, index) => `${monthPrefix}-${String(index + 1).padStart(2, '0')}`,
  );
}
