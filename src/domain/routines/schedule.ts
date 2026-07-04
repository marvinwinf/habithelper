import type { ScheduleType } from '../../data/db/schema';

// ISO 8601 weekday numbering: 1 = Monday ... 7 = Sunday.
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DailySchedule {
  readonly type: Extract<ScheduleType, 'daily'>;
}

export interface WeekdaySchedule {
  readonly type: Extract<ScheduleType, 'weekdays'>;
  readonly weekdays: readonly IsoWeekday[];
}

export interface WeeklyTargetSchedule {
  readonly type: Extract<ScheduleType, 'weekly_target'>;
  // The current (possibly user-adjusted) suggested weekdays, per
  // docs/DATA_MODEL.md's routine.scheduled_weekdays note.
  readonly weekdays: readonly IsoWeekday[];
  readonly targetCount: number;
}

export type RoutineSchedule = DailySchedule | WeekdaySchedule | WeeklyTargetSchedule;

// A single occurrence moved from its originally scheduled date to a new one
// (a routine_event row with event_type 'moved'), per docs/ROUTINE_RULES.md's
// Move to Tomorrow section.
export interface MovedOccurrence {
  readonly fromDate: string;
  readonly toDate: string;
}

function getIsoWeekday(date: string): IsoWeekday {
  const [year, month, day] = date.split('-').map(Number);
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return (jsWeekday === 0 ? 7 : jsWeekday) as IsoWeekday;
}

function isDueBySchedule(schedule: RoutineSchedule, date: string): boolean {
  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
    case 'weekly_target':
      return schedule.weekdays.includes(getIsoWeekday(date));
  }
}

/**
 * Whether a routine has a due occurrence on `date`, accounting for any
 * occurrences moved to or from that date. A moved occurrence is due only on
 * its new date, never on both the original and new date.
 */
export function isOccurrenceDue(
  schedule: RoutineSchedule,
  date: string,
  movedOccurrences: readonly MovedOccurrence[] = [],
): boolean {
  if (movedOccurrences.some((moved) => moved.fromDate === date)) {
    return false;
  }
  if (movedOccurrences.some((moved) => moved.toDate === date)) {
    return true;
  }
  return isDueBySchedule(schedule, date);
}

/**
 * Generates the suggested weekdays for a weekly-target routine, evenly
 * spaced across the Monday-Sunday week so the suggestion isn't clustered.
 * The user may edit the result afterwards (docs/ROUTINE_RULES.md).
 */
export function generateSuggestedWeeklyTargetWeekdays(targetCount: number): IsoWeekday[] {
  if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 7) {
    throw new RangeError('targetCount must be an integer between 1 and 7');
  }
  const weekdays = new Set<IsoWeekday>();
  for (let i = 0; i < targetCount; i++) {
    const position = Math.round((i * 7) / targetCount);
    weekdays.add((position + 1) as IsoWeekday);
  }
  return Array.from(weekdays).sort((a, b) => a - b);
}
