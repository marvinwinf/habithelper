import type { RoutineEvent } from '../../../data/repositories/routineEventRepository';
import { hasUnfulfilledOccurrence } from '../recovery';

let counter = 0;

function event(overrides: Partial<RoutineEvent> & { occurrenceDate: string }): RoutineEvent {
  counter += 1;
  return {
    id: `event-${counter}`,
    routineId: 'routine-1',
    eventType: 'missed',
    recordedAt: `${overrides.occurrenceDate}T23:00:00.000Z`,
    movedToDate: null,
    skipReason: null,
    supersededByEventId: null,
    ...overrides,
  };
}

const YESTERDAY = '2026-08-07';

describe('hasUnfulfilledOccurrence', () => {
  it('is false with no events at all', () => {
    expect(hasUnfulfilledOccurrence([], YESTERDAY)).toBe(false);
  });

  it('is true for a missed occurrence', () => {
    expect(hasUnfulfilledOccurrence([event({ occurrenceDate: YESTERDAY })], YESTERDAY)).toBe(true);
  });

  it('is true for a joker-protected occurrence', () => {
    // A joker absorbed the streak damage, but the routine still did not
    // happen — which is the thing worth gently naming.
    const events = [event({ occurrenceDate: YESTERDAY, eventType: 'joker_protected' })];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(true);
  });

  it('is false for a conscious skip', () => {
    // A recorded decision, not a lapse. Nagging here would punish the very
    // feature that exists to avoid punishment.
    const events = [event({ occurrenceDate: YESTERDAY, eventType: 'skipped' })];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(false);
  });

  it('is false for a moved occurrence', () => {
    const events = [
      event({ occurrenceDate: YESTERDAY, eventType: 'moved', movedToDate: '2026-08-08' }),
    ];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(false);
  });

  it('is false for a completed occurrence', () => {
    const events = [event({ occurrenceDate: YESTERDAY, eventType: 'completed' })];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(false);
  });

  it('is false once the miss has been completed retroactively', () => {
    const events = [
      event({ occurrenceDate: YESTERDAY, supersededByEventId: 'retro-1' }),
      event({ occurrenceDate: YESTERDAY, eventType: 'completed', id: 'retro-1' }),
    ];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(false);
  });

  it('ignores misses on other dates', () => {
    const events = [event({ occurrenceDate: '2026-08-05' })];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(false);
  });

  it('is true when any one of several routines missed', () => {
    const events = [
      event({ occurrenceDate: YESTERDAY, eventType: 'completed', routineId: 'routine-1' }),
      event({ occurrenceDate: YESTERDAY, routineId: 'routine-2' }),
    ];

    expect(hasUnfulfilledOccurrence(events, YESTERDAY)).toBe(true);
  });
});
