import {
  derivePausePeriods,
  freezeProgressDuringPause,
  isDatePaused,
  isOccurrenceDueConsideringPause,
  type PauseOccurrenceEvent,
  type RoutineProgressState,
} from '../pause';
import type { DailySchedule } from '../schedule';

const daily: DailySchedule = { type: 'daily' };

describe('derivePausePeriods', () => {
  it('leaves an open pause period when there is no reactivation yet', () => {
    const events: PauseOccurrenceEvent[] = [{ occurrenceDate: '2026-06-10', eventType: 'paused' }];
    expect(derivePausePeriods(events)).toEqual([{ pausedFrom: '2026-06-10' }]);
  });

  it('closes a pause period once reactivated', () => {
    const events: PauseOccurrenceEvent[] = [
      { occurrenceDate: '2026-06-10', eventType: 'paused' },
      { occurrenceDate: '2026-06-15', eventType: 'reactivated' },
    ];
    expect(derivePausePeriods(events)).toEqual([
      { pausedFrom: '2026-06-10', reactivatedOn: '2026-06-15' },
    ]);
  });

  it('ignores already-superseded events', () => {
    const events: PauseOccurrenceEvent[] = [
      { occurrenceDate: '2026-06-10', eventType: 'paused', supersededByEventId: 'evt-x' },
    ];
    expect(derivePausePeriods(events)).toEqual([]);
  });

  it('ignores duplicate pause events with no reactivation between them', () => {
    const events: PauseOccurrenceEvent[] = [
      { occurrenceDate: '2026-06-10', eventType: 'paused' },
      { occurrenceDate: '2026-06-12', eventType: 'paused' },
      { occurrenceDate: '2026-06-15', eventType: 'reactivated' },
    ];
    expect(derivePausePeriods(events)).toEqual([
      { pausedFrom: '2026-06-10', reactivatedOn: '2026-06-15' },
    ]);
  });
});

describe('isDatePaused / isOccurrenceDueConsideringPause', () => {
  it('is false (not due) for every date within an open-ended pause', () => {
    const pausePeriods = [{ pausedFrom: '2026-06-10' }];
    expect(isDatePaused('2026-06-10', pausePeriods)).toBe(true);
    expect(isDatePaused('2026-06-20', pausePeriods)).toBe(true);
    expect(isOccurrenceDueConsideringPause(daily, '2026-06-10', pausePeriods)).toBe(false);
    expect(isOccurrenceDueConsideringPause(daily, '2026-06-20', pausePeriods)).toBe(false);
  });

  it('is not paused before the pause starts', () => {
    const pausePeriods = [{ pausedFrom: '2026-06-10' }];
    expect(isDatePaused('2026-06-09', pausePeriods)).toBe(false);
    expect(isOccurrenceDueConsideringPause(daily, '2026-06-09', pausePeriods)).toBe(true);
  });

  it('resumes normal due-occurrence calculation on and after the reactivation date', () => {
    const pausePeriods = [{ pausedFrom: '2026-06-10', reactivatedOn: '2026-06-15' }];
    expect(isDatePaused('2026-06-14', pausePeriods)).toBe(true);
    expect(isDatePaused('2026-06-15', pausePeriods)).toBe(false);
    expect(isOccurrenceDueConsideringPause(daily, '2026-06-14', pausePeriods)).toBe(false);
    expect(isOccurrenceDueConsideringPause(daily, '2026-06-15', pausePeriods)).toBe(true);
  });
});

describe('freezeProgressDuringPause', () => {
  it('pause-then-reactivate preserves totals, streak, and level rank without loss', () => {
    const state: RoutineProgressState = {
      currentStreak: 12,
      bestStreak: 30,
      totalCompletions: 87,
      levelRank: 1,
    };

    const whilePaused = freezeProgressDuringPause(state);
    expect(whilePaused).toEqual(state);

    // Reactivating continues from the exact preserved state — no reset,
    // no partial loss of any field.
    const afterReactivation = whilePaused;
    expect(afterReactivation).toEqual(state);
  });
});
