import {
  classifyOccurrence,
  ConsciousSkipNotAllowedError,
  requestConsciousSkip,
  type OccurrenceEvent,
} from '../completion';
import type { DailySchedule } from '../schedule';

const daily: DailySchedule = { type: 'daily' };

const YESTERDAY = '2026-07-03';
const TODAY = '2026-07-04';
const TOMORROW = '2026-07-05';

describe('classifyOccurrence', () => {
  it('classifies a normal completion', () => {
    const events: OccurrenceEvent[] = [{ occurrenceDate: TODAY, eventType: 'completed' }];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('completed');
  });

  it('classifies an exceeded completion', () => {
    const events: OccurrenceEvent[] = [{ occurrenceDate: TODAY, eventType: 'exceeded' }];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('exceeded');
  });

  it('classifies a conscious skip', () => {
    const events: OccurrenceEvent[] = [{ occurrenceDate: TODAY, eventType: 'skipped' }];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('skipped');
  });

  it('classifies an elapsed due occurrence with no event as missed', () => {
    expect(classifyOccurrence(daily, YESTERDAY, [], TODAY)).toBe('missed');
  });

  it('classifies a due occurrence today or in the future with no event as pending', () => {
    expect(classifyOccurrence(daily, TODAY, [], TODAY)).toBe('pending');
    expect(classifyOccurrence(daily, TOMORROW, [], TODAY)).toBe('pending');
  });

  it('classifies a non-scheduled date as not due', () => {
    const mondayOnly = { type: 'weekdays' as const, weekdays: [1 as const] };
    // 2026-07-03 is a Friday.
    expect(classifyOccurrence(mondayOnly, YESTERDAY, [], TODAY)).toBe('not_due');
  });

  it('classifies a moved-away occurrence as moved, not missed, on its original date', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: YESTERDAY, eventType: 'moved', movedToDate: TODAY },
    ];
    expect(classifyOccurrence(daily, YESTERDAY, events, TODAY)).toBe('moved');
  });

  it('applies normal missed rules to the moved-to date when left incomplete', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: YESTERDAY, eventType: 'moved', movedToDate: TODAY },
    ];
    // The moved-to date (TODAY) has itself since elapsed with nothing recorded.
    expect(classifyOccurrence(daily, TODAY, events, TOMORROW)).toBe('missed');
    // The original date is still moved, not missed.
    expect(classifyOccurrence(daily, YESTERDAY, events, TOMORROW)).toBe('moved');
  });

  it('applies normal completed rules to the moved-to date when completed there', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: YESTERDAY, eventType: 'moved', movedToDate: TODAY },
      { occurrenceDate: TODAY, eventType: 'completed' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('completed');
  });

  it('ignores a superseded event in favor of the current outcome', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: YESTERDAY, eventType: 'missed', supersededByEventId: 'evt-2' },
      { occurrenceDate: YESTERDAY, eventType: 'completed' },
    ];
    expect(classifyOccurrence(daily, YESTERDAY, events, TODAY)).toBe('completed');
  });
});

describe('requestConsciousSkip', () => {
  it('allows a conscious skip when the routine permits it', () => {
    expect(requestConsciousSkip(true, TODAY, 'not feeling it')).toEqual({
      occurrenceDate: TODAY,
      skipReason: 'not feeling it',
    });
  });

  it('rejects a conscious skip when the routine disallows it', () => {
    expect(() => requestConsciousSkip(false, TODAY)).toThrow(ConsciousSkipNotAllowedError);
  });
});
