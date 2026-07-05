import type { RoutineEventType } from '../../data/db/schema';
import { addDaysToDateString } from '../dates';
import { LEVEL_SEGMENT_SIZE, replayRoutineStreak } from '../streaks/replay';
import { classifyOccurrence, type OccurrenceEvent } from './completion';
import { derivePausePeriods, isDatePaused } from './pause';
import type { RoutineSchedule } from './schedule';

// The only event types this walk ever produces — everything else
// (completed/exceeded/skipped/moved/paused/reactivated/joker_earned/
// joker_restored) is either a direct user action or a side effect of one,
// per docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation.
export interface EventToWrite {
  readonly occurrenceDate: string;
  readonly eventType: Extract<RoutineEventType, 'missed' | 'joker_protected' | 'joker_consumed'>;
}

export interface ReconciliationPlan {
  readonly eventsToWrite: readonly EventToWrite[];
  // Always the day before `today` (or the input reconciledThroughDate,
  // whichever is later) — today itself is never reconciled since it isn't
  // over yet, and this watermark never moves backwards.
  readonly reconciledThroughDate: string;
}

/**
 * Walks a routine's schedule one due occurrence at a time, from the day
 * after `reconciledThroughDate` up to (but excluding) `today`, and
 * materializes `missed` or `joker_protected`+`joker_consumed` events for any
 * due occurrence left unaccounted for by a direct user action. Occurrences
 * that are moved, consciously skipped, or fall within a paused period are
 * never classified missed. Processes strictly in chronological order, since
 * each decision depends on the joker/streak state produced by the ones
 * before it (docs/ARCHITECTURE.md, docs/ROUTINE_RULES.md). Pure — it does
 * not touch the database; the caller persists the returned events and
 * advances the cache accordingly.
 */
export function reconcileMissedOccurrences(
  schedule: RoutineSchedule,
  events: readonly OccurrenceEvent[],
  reconciledThroughDate: string,
  today: string,
): ReconciliationPlan {
  const yesterday = addDaysToDateString(today, -1);
  const newReconciledThroughDate = reconciledThroughDate >= yesterday ? reconciledThroughDate : yesterday;

  const pausePeriods = derivePausePeriods(
    events.filter(
      (event): event is OccurrenceEvent & { eventType: 'paused' | 'reactivated' } =>
        event.eventType === 'paused' || event.eventType === 'reactivated',
    ),
  );

  const eventsToWrite: EventToWrite[] = [];
  // Grows with each synthesized event so the next occurrence's decision sees
  // an up-to-date streak/joker state — classifyOccurrence below still reads
  // the original `events`, since only direct user actions affect its output.
  const replayLog: OccurrenceEvent[] = events.slice();

  let cursor = addDaysToDateString(reconciledThroughDate, 1);
  while (cursor < today) {
    const outcome = classifyOccurrence(schedule, cursor, events, today);
    const isUnaccountedMiss = outcome === 'missed' && !isDatePaused(cursor, pausePeriods);

    if (isUnaccountedMiss) {
      const state = replayRoutineStreak(replayLog);
      const dayEvents: EventToWrite[] =
        state.currentStreak < LEVEL_SEGMENT_SIZE && state.jokerInventory > 0
          ? [
              { occurrenceDate: cursor, eventType: 'joker_protected' },
              { occurrenceDate: cursor, eventType: 'joker_consumed' },
            ]
          : [{ occurrenceDate: cursor, eventType: 'missed' }];

      eventsToWrite.push(...dayEvents);
      replayLog.push(...dayEvents);
    }

    cursor = addDaysToDateString(cursor, 1);
  }

  return { eventsToWrite, reconciledThroughDate: newReconciledThroughDate };
}
