import { planRetroactiveCompletion, type RecordedOccurrenceEvent } from '../retroactive';

const DATE = '2026-06-20';
const OTHER_DATE = '2026-06-21';

describe('planRetroactiveCompletion', () => {
  it('retroactively completes a previously missed occurrence', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'missed' },
    ];

    const plan = planRetroactiveCompletion(DATE, priorEvents);

    expect(plan.occurrenceDate).toBe(DATE);
    expect(plan.requiresFullRecalculation).toBe(true);
    expect(plan.jokerRestored).toBe(false);
    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completed', occurrenceDate: DATE, supersedesEventIds: ['e1'] },
    ]);
  });

  it('restores a joker when retroactively completing a previously joker-protected occurrence', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'joker_protected' },
      { id: 'e2', occurrenceDate: DATE, eventType: 'joker_consumed' },
    ];

    const plan = planRetroactiveCompletion(DATE, priorEvents);

    expect(plan.jokerRestored).toBe(true);
    expect(plan.requiresFullRecalculation).toBe(true);
    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completed', occurrenceDate: DATE, supersedesEventIds: ['e1', 'e2'] },
      { eventType: 'joker_restored', occurrenceDate: DATE, supersedesEventIds: ['e2'] },
    ]);
  });

  it('supersedes no events when completing a date with no prior history', () => {
    const plan = planRetroactiveCompletion(DATE, []);

    expect(plan.jokerRestored).toBe(false);
    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completed', occurrenceDate: DATE, supersedesEventIds: [] },
    ]);
  });

  it('ignores events for other occurrence dates', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: OTHER_DATE, eventType: 'missed' },
    ];

    const plan = planRetroactiveCompletion(DATE, priorEvents);

    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completed', occurrenceDate: DATE, supersedesEventIds: [] },
    ]);
  });

  it('ignores events already superseded by a prior edit', () => {
    const priorEvents: RecordedOccurrenceEvent[] = [
      { id: 'e1', occurrenceDate: DATE, eventType: 'missed', supersededByEventId: 'e2' },
      { id: 'e2', occurrenceDate: DATE, eventType: 'skipped' },
    ];

    const plan = planRetroactiveCompletion(DATE, priorEvents);

    expect(plan.eventsToWrite).toEqual([
      { eventType: 'completed', occurrenceDate: DATE, supersedesEventIds: ['e2'] },
    ]);
  });
});
