// "Never miss twice" — the recovery signal shown on Today the day after an
// occurrence went unfulfilled.
//
// The app already implements the mechanic: jokers absorb the first misses, and
// after streak 66 up to three missed occurrences are tolerated
// (docs/ROUTINE_RULES.md). It just never said so. A user who missed yesterday
// saw a streak quietly sitting where it was and no acknowledgement at all,
// which is the moment "Die 1%-Methode" identifies as decisive: missing once is
// an accident, missing twice is the start of a new habit.
//
// This is presentation only — it reads events, changes nothing, and never
// alters a streak, joker, or level.

import type { RoutineEvent } from '../../data/repositories/routineEventRepository';

/** Outcomes that mean an occurrence elapsed without being fulfilled. */
const UNFULFILLED_TYPES = new Set(['missed', 'joker_protected']);

/**
 * Whether any routine's occurrence on `date` elapsed unfulfilled.
 *
 * Deliberately excludes:
 *
 * - `skipped` — a conscious skip is a recorded decision the user is entitled
 *   to make, not a lapse, and nagging about it would punish exactly the
 *   feature that exists to prevent punishment;
 * - `moved` — the occurrence was rescheduled, not dropped;
 * - superseded events — an occurrence completed retroactively is no longer a
 *   miss, so the note disappears once the user fixes the day from the
 *   calendar.
 */
export function hasUnfulfilledOccurrence(events: readonly RoutineEvent[], date: string): boolean {
  return events.some(
    (event) =>
      event.occurrenceDate === date &&
      UNFULFILLED_TYPES.has(event.eventType) &&
      event.supersededByEventId === null,
  );
}
