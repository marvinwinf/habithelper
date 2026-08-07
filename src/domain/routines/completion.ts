import type { RoutineEventType } from '../../data/db/schema';
import { addDaysToDateString } from '../dates';
import { getIsoWeekday, isOccurrenceDue, type MovedOccurrence, type RoutineSchedule } from './schedule';

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

// Which recorded event types actually decide an occurrence's outcome, most
// decisive first. Everything NOT listed here is bookkeeping that shares an
// occurrence_date with a real outcome without being one — `completion_undone`
// / `skip_undone` (audit markers for an undone misclick), `joker_earned` /
// `joker_consumed` / `joker_restored`, and `paused` / `reactivated`.
//
// Scanning by this precedence rather than taking the FIRST active event for
// the date is what keeps a re-completion visible: undoing a completion leaves
// an active `completion_undone` behind (it supersedes the completion, nothing
// supersedes it), so a day that was completed → undone → completed again holds
// both that marker and the newer `completed`. Picking the first row returned
// stranded such a day on 'pending' forever — the streak counted the
// completion, the card showed it as open, and tapping again did nothing
// because the completion write is idempotent.
const OUTCOME_PRECEDENCE: readonly Extract<
  RoutineEventType,
  'completed' | 'exceeded' | 'skipped' | 'missed'
>[] = ['completed', 'exceeded', 'skipped', 'missed'];

const OUTCOME_STATE: Record<(typeof OUTCOME_PRECEDENCE)[number], OccurrenceState> = {
  completed: 'completed',
  exceeded: 'exceeded',
  skipped: 'skipped',
  missed: 'missed',
};

/** The Monday–Sunday dates of the week containing `date`. */
function weekDatesOf(date: string): string[] {
  const monday = addDaysToDateString(date, 1 - getIsoWeekday(date));
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(monday, index));
}

/**
 * Whether a weekly-target routine already reached its target within the
 * Monday–Sunday week containing `date`, per docs/ROUTINE_RULES.md ("Once the
 * weekly target is reached, the routine remains visibly completed for the rest
 * of the week"). Counts every actual completion that week, including ones on
 * days the schedule did not suggest — the target is a count per week, not a
 * per-weekday obligation.
 */
function isWeeklyTargetMet(
  schedule: RoutineSchedule,
  date: string,
  events: readonly OccurrenceEvent[],
): boolean {
  if (schedule.type !== 'weekly_target') {
    return false;
  }
  const week = new Set(weekDatesOf(date));
  const completions = events.filter(
    (event) =>
      !event.supersededByEventId &&
      (event.eventType === 'completed' || event.eventType === 'exceeded') &&
      week.has(event.occurrenceDate),
  ).length;
  return completions >= schedule.targetCount;
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

  const activeEventTypes = new Set(
    events
      .filter((event) => !event.supersededByEventId && event.occurrenceDate === date)
      .map((event) => event.eventType),
  );
  const outcome = OUTCOME_PRECEDENCE.find((eventType) => activeEventTypes.has(eventType));
  if (outcome) {
    return OUTCOME_STATE[outcome];
  }

  if (!isOccurrenceDue(schedule, date, moves)) {
    return 'not_due';
  }

  if (date >= today) {
    return 'pending';
  }

  // An elapsed weekly-target day is only missed while that week's target is
  // still outstanding. Once the target is met, the remaining suggested
  // weekdays carry no obligation, so they must never be reconciled into
  // `missed` events — which would otherwise break the streak of any
  // weekly-target routine whose suggested weekdays outnumber its target
  // (the routine detail screen lets the two diverge freely).
  if (isWeeklyTargetMet(schedule, date, events)) {
    return 'not_due';
  }

  return 'missed';
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
