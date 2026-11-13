// Weekly look-back (T096): a gentle Monday card on the Today screen
// summarizing the week that just ended. docs/DESIGN_SYSTEM.md's Gamification
// section lists "weekly completion summaries" as in scope; this is that
// summary, derived entirely from existing routine events — no schema change,
// no stored aggregate. Copy celebrates what happened and never lists what
// did not.

import { addDaysToDateString } from '../dates';
import { getIsoWeekday } from '../routines/schedule';

/** Minimal event shape the recap needs (a subset of RoutineEvent). */
export interface RecapEvent {
  occurrenceDate: string;
  eventType: string;
  supersededByEventId: string | null;
}

export interface RecapRoutine {
  id: string;
  name: string;
}

export interface WeeklyRecap {
  /** Completed or exceeded occurrences across all routines. */
  completions: number;
  /** Distinct days of the week with at least one completion (0–7). */
  activeDays: number;
  /** The routine completed most often, ties broken by list order. */
  steadiest: { name: string; count: number } | null;
}

/** The recap card shows on Mondays — the first look at a fresh week. */
export function isWeeklyRecapDay(today: string): boolean {
  return getIsoWeekday(today) === 1;
}

/** The seven Monday–Sunday dates of the week before `today`'s week. */
export function previousWeekDates(today: string): string[] {
  const thisMonday = addDaysToDateString(today, 1 - getIsoWeekday(today));
  const lastMonday = addDaysToDateString(thisMonday, -7);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(lastMonday, index));
}

function isActiveCompletion(event: RecapEvent): boolean {
  // A superseded event was undone (docs/DATA_MODEL.md's undo semantics);
  // it never counts.
  return (
    !event.supersededByEventId &&
    (event.eventType === 'completed' || event.eventType === 'exceeded')
  );
}

/**
 * Summarizes the given week. Returns null when nothing was completed: an
 * empty week gets no card at all rather than a "0" that reads as a verdict.
 */
export function buildWeeklyRecap(
  routines: readonly RecapRoutine[],
  eventsByRoutineId: Readonly<Record<string, readonly RecapEvent[]>>,
  weekDates: readonly string[],
): WeeklyRecap | null {
  const inWeek = new Set(weekDates);
  const activeDates = new Set<string>();
  let completions = 0;
  let steadiest: WeeklyRecap['steadiest'] = null;

  for (const routine of routines) {
    // One completion per routine per day at most (docs/MVP_SCOPE.md), so
    // distinct dates are the honest count even if stray duplicates exist.
    const dates = new Set(
      (eventsByRoutineId[routine.id] ?? [])
        .filter((event) => inWeek.has(event.occurrenceDate) && isActiveCompletion(event))
        .map((event) => event.occurrenceDate),
    );
    completions += dates.size;
    dates.forEach((date) => activeDates.add(date));
    if (dates.size > 0 && (steadiest === null || dates.size > steadiest.count)) {
      steadiest = { name: routine.name, count: dates.size };
    }
  }

  if (completions === 0) {
    return null;
  }
  return { completions, activeDays: activeDates.size, steadiest };
}

/** One warm closing sentence, scaled to how the week went — never a grade. */
export function weeklyRecapMessage(recap: WeeklyRecap): string {
  if (recap.activeDays >= 7) {
    return 'Jeden einzelnen Tag drangeblieben. Stark.';
  }
  if (recap.activeDays >= 5) {
    return 'Eine richtig beständige Woche.';
  }
  if (recap.activeDays >= 3) {
    return 'Du bist gut in Bewegung geblieben.';
  }
  return 'Jeder Schritt zählt — schön, dass du dabei bist.';
}
