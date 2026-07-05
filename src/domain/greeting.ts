// Time-based greeting for the Today screen header
// (docs/SCREEN_SPECIFICATIONS.md: "Time-based greeting, for example 'Guten
// Morgen, Marvin'."). Takes an explicit hour rather than reading the clock
// itself, so the boundary behavior is unit-testable (T048).

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const GREETING_BY_TIME_OF_DAY: Record<TimeOfDay, string> = {
  morning: 'Guten Morgen',
  afternoon: 'Guten Tag',
  evening: 'Guten Abend',
};

/** Maps an hour of day (0-23) to a coarse time-of-day bucket. */
export function timeOfDayForHour(hour: number): TimeOfDay {
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

/** Builds the full greeting text for a given hour and display name. */
export function getGreeting(hour: number, displayName: string): string {
  return `${GREETING_BY_TIME_OF_DAY[timeOfDayForHour(hour)]}, ${displayName}`;
}
