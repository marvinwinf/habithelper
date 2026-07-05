import type { IsoWeekday, RoutineSchedule } from './schedule';

// Human-readable schedule labels for routine cards (T065), per the design
// reference mockup's subtitle line ("Jeden Tag", "3x pro Woche", ...).

const WEEKDAY_SHORT_NAMES: Record<IsoWeekday, string> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
  7: 'So',
};

/** German short label for a routine's schedule, e.g. "Jeden Tag", "Mo, Mi, Fr", "3x pro Woche". */
export function scheduleLabel(schedule: RoutineSchedule): string {
  switch (schedule.type) {
    case 'daily':
      return 'Jeden Tag';
    case 'weekdays':
      return [...schedule.weekdays]
        .sort((a, b) => a - b)
        .map((day) => WEEKDAY_SHORT_NAMES[day])
        .join(', ');
    case 'weekly_target':
      return `${schedule.targetCount}x pro Woche`;
  }
}
