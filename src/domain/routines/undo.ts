import type { RoutineEventType } from '../../data/db/schema';

// A previously recorded routine_event row this module reads. Already
// superseded rows are ignored, mirroring src/domain/routines/retroactive.ts.
export interface RecordedOccurrenceEvent {
  readonly id: string;
  readonly occurrenceDate: string;
  readonly eventType: RoutineEventType;
  readonly supersededByEventId?: string | null;
}

export interface UndoEventToWrite {
  readonly eventType: 'completion_undone';
  readonly occurrenceDate: string;
  // IDs of prior active events this new event supersedes — the caller
  // writes the new event, then sets supersededByEventId to its id on each
  // of these rows, per docs/DATA_MODEL.md (full history is never deleted).
  readonly supersedesEventIds: readonly string[];
}

export interface UndoCompletionPlan {
  readonly occurrenceDate: string;
  readonly eventsToWrite: readonly UndoEventToWrite[];
  // Mirrors RetroactiveCompletionPlan's requiresFullRecalculation: undoing a
  // completion always invalidates the routine's cached streak/level/joker
  // state, so the caller must recompute from the full event log.
  readonly requiresFullRecalculation: true;
}

export class NoCompletionToUndoError extends Error {
  constructor(occurrenceDate: string) {
    super(`No active completion to undo for ${occurrenceDate}`);
    this.name = 'NoCompletionToUndoError';
  }
}

/**
 * Plans undoing a misclicked completion on `occurrenceDate`: supersedes the
 * active `completed`/`exceeded` event for that date, and — since
 * `maybeWriteJokerEarnedEventTx` writes it "at the same time as the
 * completed/exceeded event" (src/services/routineService.ts) — any
 * `joker_earned` event for the same date too, so a joker that only exists
 * because of this completion doesn't survive undoing it. Throws if there is
 * nothing active to undo (defensive: the UI only offers this action on an
 * already-completed/exceeded card).
 */
export function planUndoCompletion(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): UndoCompletionPlan {
  const activePriorEvents = priorEvents.filter(
    (event) => !event.supersededByEventId && event.occurrenceDate === occurrenceDate,
  );

  // Supersede *every* active completion for the day, not just the first.
  // Idempotent completion (src/services/routineService.ts) prevents new
  // duplicates, but a single undo must still fully clear the occurrence —
  // including any duplicate `completed`/`exceeded` (and their `joker_earned`)
  // events an earlier build's non-idempotent double-tap may have left in a
  // user's local history — so replay sees no active completion for the date
  // and recomputes the streak from the ordered log with the day removed.
  const completionEvents = activePriorEvents.filter(
    (event) => event.eventType === 'completed' || event.eventType === 'exceeded',
  );
  if (completionEvents.length === 0) {
    throw new NoCompletionToUndoError(occurrenceDate);
  }

  const jokerEarnedEvents = activePriorEvents.filter((event) => event.eventType === 'joker_earned');

  return {
    occurrenceDate,
    eventsToWrite: [
      {
        eventType: 'completion_undone',
        occurrenceDate,
        supersedesEventIds: [
          ...completionEvents.map((event) => event.id),
          ...jokerEarnedEvents.map((event) => event.id),
        ],
      },
    ],
    requiresFullRecalculation: true,
  };
}
