import type { RoutineEventType } from '../../data/db/schema';
import { isOccurrenceDue, type MovedOccurrence, type RoutineSchedule } from './schedule';

// States a single occurrence can be classified into by this module.
// docs/ROUTINE_RULES.md lists two further states — protected by joker and
// paused — which are out of scope here (jokers land in Phase 6, pause in
// T028) and are never produced by classifyOccurrence.
export type OccurrenceState =
  | 'not_due'
  | 'pending'
  | 'completed'
  | 'exceeded'
  | 'skipped'
  | 'moved'
  | 'missed';

// The minimal shape of a routine_event row this module reads. A
// supersededByEventId set on a row means a later retroactive edit replaced
// it (docs/DATA_MODEL.md), so it is excluded from classification.
export interface OccurrenceEvent {
  readonly occurrenceDate: string;
  readonly eventType: RoutineEventType;
  readonly movedToDate?: string | null;
  readonly supersededByEventId?: string | null;
}

function activeMoves(events: readonly OccurrenceEvent[]): MovedOccurrence[] {
  return events
    .filter((event) => !event.supersededByEventId && event.eventType === 'moved' && event.movedToDate)
    .map((event) => ({ fromDate: event.occurrenceDate, toDate: event.movedToDate as string }));
}

/**
 * Classifies what happened to a routine's occurrence on `date`, given its
 * schedule, its full event history, and today's date (needed to tell an
 * elapsed unaccounted-for occurrence — missed — from one still pending).
 */
export function classifyOccurrence(
  schedule: RoutineSchedule,
  date: string,
  events: readonly OccurrenceEvent[],
  today: string,
): OccurrenceState {
  const moves = activeMoves(events);

  if (moves.some((move) => move.fromDate === date)) {
    return 'moved';
  }

  const activeEvent = events.find((event) => !event.supersededByEventId && event.occurrenceDate === date);
  if (activeEvent) {
    switch (activeEvent.eventType) {
      case 'completed':
        return 'completed';
      case 'exceeded':
        return 'exceeded';
      case 'skipped':
        return 'skipped';
      case 'missed':
        return 'missed';
      default:
        break;
    }
  }

  if (!isOccurrenceDue(schedule, date, moves)) {
    return 'not_due';
  }

  return date < today ? 'missed' : 'pending';
}

export class ConsciousSkipNotAllowedError extends Error {
  constructor() {
    super('This routine does not allow conscious skipping');
    this.name = 'ConsciousSkipNotAllowedError';
  }
}

export interface ConsciousSkipRequest {
  readonly occurrenceDate: string;
  readonly skipReason?: string;
}

/**
 * Validates and builds a conscious-skip request. Rejects it outright when
 * the routine doesn't allow conscious skipping, per docs/ROUTINE_RULES.md.
 */
export function requestConsciousSkip(
  allowConsciousSkip: boolean,
  occurrenceDate: string,
  skipReason?: string,
): ConsciousSkipRequest {
  if (!allowConsciousSkip) {
    throw new ConsciousSkipNotAllowedError();
  }
  return { occurrenceDate, skipReason };
}
