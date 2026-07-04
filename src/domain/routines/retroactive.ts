import type { RoutineEventType } from '../../data/db/schema';

// A previously recorded routine_event row this module reads. Already
// superseded rows are ignored — see filtering below — since they no longer
// reflect the occurrence's current outcome.
export interface RecordedOccurrenceEvent {
  readonly id: string;
  readonly occurrenceDate: string;
  readonly eventType: RoutineEventType;
  readonly supersededByEventId?: string | null;
}

export interface EventToWrite {
  readonly eventType: 'completed' | 'joker_restored';
  readonly occurrenceDate: string;
  // IDs of prior active events this new event supersedes — the caller
  // writes the new event, then sets supersededByEventId to its id on each
  // of these rows, per docs/DATA_MODEL.md (full history is never deleted).
  readonly supersedesEventIds: readonly string[];
}

export interface RetroactiveCompletionPlan {
  readonly occurrenceDate: string;
  readonly eventsToWrite: readonly EventToWrite[];
  // Whether a prior joker_consumed event for this occurrence was found,
  // meaning a joker_restored event is included in eventsToWrite. Actual
  // joker inventory bookkeeping is Phase 6's concern (docs/ROUTINE_RULES.md)
  // — this only proves the signal/event chain is correct.
  readonly jokerRestored: boolean;
  // Retroactive completion always invalidates any cached streak/level/joker
  // state for the routine, per docs/ROUTINE_RULES.md's Retroactive
  // Completion section — the caller must recompute from the full event log.
  readonly requiresFullRecalculation: true;
}

/**
 * Plans a retroactive completion of a past occurrence on its original
 * `occurrenceDate`. Every prior active event for that date is superseded by
 * the new `completed` event; if one of them was a `joker_consumed` event, a
 * `joker_restored` event is planned to supersede it specifically.
 */
export function planRetroactiveCompletion(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): RetroactiveCompletionPlan {
  const activePriorEvents = priorEvents.filter(
    (event) => !event.supersededByEventId && event.occurrenceDate === occurrenceDate,
  );

  const jokerConsumedEvent = activePriorEvents.find((event) => event.eventType === 'joker_consumed');

  const eventsToWrite: EventToWrite[] = [
    {
      eventType: 'completed',
      occurrenceDate,
      supersedesEventIds: activePriorEvents.map((event) => event.id),
    },
  ];

  if (jokerConsumedEvent) {
    eventsToWrite.push({
      eventType: 'joker_restored',
      occurrenceDate,
      supersedesEventIds: [jokerConsumedEvent.id],
    });
  }

  return {
    occurrenceDate,
    eventsToWrite,
    jokerRestored: Boolean(jokerConsumedEvent),
    requiresFullRecalculation: true,
  };
}
