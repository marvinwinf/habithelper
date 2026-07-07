import { NoCompletionToUndoError, planUndoCompletion, type RecordedOccurrenceEvent } from '../undo';

const DATE = '2026-06-20';
const OTHER_DATE = '2026-06-21';

describe('planUndoCompletion', () => {
  it('supersedes a plain completed event', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'completed' },
    ];

    const plan = planUndoCompletion(DATE, priorEvents);

    expect(plan.occurrenceDate).toBe(DATE);
    expect(plan.requiresFullRecalculation).toBe(true);
    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completion_undone', occurrenceDate: DATE, supersedesEventIds: ['e1'] },
    ]);
  });

  it('supersedes an exceeded event the same way as a completed one', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'exceeded' },
    ];

    const plan = planUndoCompletion(DATE, priorEvents);

    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completion_undone', occurrenceDate: DATE, supersedesEventIds: ['e1'] },
    ]);
  });

  it('also supersedes a joker_earned event written by the same completion', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'completed' },
      { id: 'e2', occurrenceDate: DATE, eventType: 'joker_earned' },
    ];

    const plan = planUndoCompletion(DATE, priorEvents);

    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completion_undone', occurrenceDate: DATE, supersedesEventIds: ['e1', 'e2'] },
    ]);
  });

  it('throws when there is no active completion for the date', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'missed' },
    ];

    expect(() => planUndoCompletion(DATE, priorEvents)).toThrow(NoCompletionToUndoError);
  });

  it('throws when the only completion for the date was already superseded', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'completed', supersededByEventId: 'e2' },
      { id: 'e2', occurrenceDate: DATE, eventType: 'completion_undone' },
    ];

    expect(() => planUndoCompletion(DATE, priorEvents)).toThrow(NoCompletionToUndoError);
  });

  it('ignores events for other occurrence dates', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'completed' },
      { id: 'e2', occurrenceDate: OTHER_DATE, eventType: 'joker_earned' },
    ];

    const plan = planUndoCompletion(DATE, priorEvents);

    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completion_undone', occurrenceDate: DATE, supersedesEventIds: ['e1'] },
    ]);
  });
});
