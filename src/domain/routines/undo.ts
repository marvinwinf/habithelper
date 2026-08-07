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
  readonly eventType: 'completion_undone' | 'skip_undone';
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

export class NoSkipToUndoError extends Error {
  constructor(occurrenceDate: string) {
    super(`No active conscious skip to undo for ${occurrenceDate}`);
    this.name = 'NoSkipToUndoError';
  }
}

/** A routine's non-superseded events for one occurrence date. */
function activeEventsOn(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): RecordedOccurrenceEvent[] {
  return priorEvents.filter(
    (event) => !event.supersededByEventId && event.occurrenceDate === occurrenceDate,
  );
}

/**
 * Whether `occurrenceDate` currently holds an active `completed`/`exceeded`
 * event — what makes an undo meaningful. Exported so the service can treat a
 * repeated undo (a second tap landing before the screen reloads) as a no-op
 * instead of throwing: the completion write is idempotent for exactly the same
 * reason, and an unhandled rejection from a fire-and-forget undo left the row
 * rendered as completed with no reload to correct it.
 */
export function hasCompletionToUndo(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): boolean {
  return activeEventsOn(occurrenceDate, priorEvents).some(
    (event) => event.eventType === 'completed' || event.eventType === 'exceeded',
  );
}

/** Whether `occurrenceDate` currently holds an active `skipped` event. */
export function hasSkipToUndo(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): boolean {
  return activeEventsOn(occurrenceDate, priorEvents).some((event) => event.eventType === 'skipped');
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
  const activePriorEvents = activeEventsOn(occurrenceDate, priorEvents);

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

/**
 * Plans undoing a misclicked conscious skip on `occurrenceDate`: supersedes
 * the active `skipped` event(s) for that date with a `skip_undone` marker, so
 * the occurrence classifies as pending again and its completion control
 * becomes tappable. A skip has no streak/joker effect of its own
 * (docs/ROUTINE_RULES.md's Conscious Skip section), so nothing else has to be
 * reverted — but the caller still recomputes from the full log, since an
 * occurrence that stops being skipped becomes reconcilable again.
 */
export function planUndoSkip(
  occurrenceDate: string,
  priorEvents: readonly RecordedOccurrenceEvent[],
): UndoCompletionPlan {
  const skipEvents = activeEventsOn(occurrenceDate, priorEvents).filter(
    (event) => event.eventType === 'skipped',
  );
  if (skipEvents.length === 0) {
    throw new NoSkipToUndoError(occurrenceDate);
  }

  return {
    occurrenceDate,
    eventsToWrite: [
      {
        eventType: 'skip_undone',
        occurrenceDate,
        supersedesEventIds: skipEvents.map((event) => event.id),
      },
    ],
    requiresFullRecalculation: true,
  };
}
