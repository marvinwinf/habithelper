import { reconcileMissedOccurrences } from '../reconcile';
import type { OccurrenceEvent } from '../completion';
import type { DailySchedule } from '../schedule';

const daily: DailySchedule = { type: 'daily' };

describe('reconcileMissedOccurrences', () => {
  it('never reconciles today itself, only fully-elapsed days', () => {
    const plan = reconcileMissedOccurrences(daily, [], '2026-06-29', '2026-07-01');
    // Only 2026-06-30 has elapsed; 2026-07-01 (today) is left untouched.
    expect(plan.eventsToWrite).toEqual([{ occurrenceDate: '2026-06-30', eventType: 'missed' }]);
    expect(plan.reconciledThroughDate).toBe('2026-06-30');
  });

  it('is a no-op when already reconciled through yesterday', () => {
    const plan = reconcileMissedOccurrences(daily, [], '2026-06-29', '2026-07-01');
    const secondPass = reconcileMissedOccurrences(daily, [], plan.reconciledThroughDate, '2026-07-01');
    expect(secondPass.eventsToWrite).toEqual([]);
    expect(secondPass.reconciledThroughDate).toBe('2026-06-30');
  });

  it('never moves reconciledThroughDate backwards', () => {
    const plan = reconcileMissedOccurrences(daily, [], '2026-07-01', '2026-07-01');
    expect(plan.reconciledThroughDate).toBe('2026-07-01');
    expect(plan.eventsToWrite).toEqual([]);
  });

  it('produces no event for a non-scheduled day', () => {
    const mondayOnly = { type: 'weekdays' as const, weekdays: [1 as const] };
    // 2026-07-03 is a Friday, 2026-07-04 a Saturday — neither is a Monday.
    const plan = reconcileMissedOccurrences(mondayOnly, [], '2026-07-02', '2026-07-05');
    expect(plan.eventsToWrite).toEqual([]);
    expect(plan.reconciledThroughDate).toBe('2026-07-04');
  });

  it('produces no event for an already-completed, skipped, or moved occurrence', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: '2026-07-01', eventType: 'completed' },
      { occurrenceDate: '2026-07-02', eventType: 'skipped' },
      { occurrenceDate: '2026-07-03', eventType: 'moved', movedToDate: '2026-07-10' },
    ];
    const plan = reconcileMissedOccurrences(daily, events, '2026-06-30', '2026-07-04');
    expect(plan.eventsToWrite).toEqual([]);
  });

  it('mixes joker-protected and plain-missed days in chronological order', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: '2026-07-01', eventType: 'completed' },
      { occurrenceDate: '2026-07-02', eventType: 'completed' },
      { occurrenceDate: '2026-07-03', eventType: 'completed' },
      { occurrenceDate: '2026-07-04', eventType: 'completed' },
      { occurrenceDate: '2026-07-05', eventType: 'completed' },
      { occurrenceDate: '2026-07-05', eventType: 'joker_earned' },
    ];
    // 07-06 unaccounted (1 joker available -> protected), 07-07 unaccounted
    // (joker now spent -> plain missed).
    const plan = reconcileMissedOccurrences(daily, events, '2026-07-05', '2026-07-08');
    expect(plan.eventsToWrite).toEqual([
      { occurrenceDate: '2026-07-06', eventType: 'joker_protected' },
      { occurrenceDate: '2026-07-06', eventType: 'joker_consumed' },
      { occurrenceDate: '2026-07-07', eventType: 'missed' },
    ]);
  });

  it('stops using jokers once the streak has already reached 66, even with jokers left in inventory', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const events: OccurrenceEvent[] = Array.from({ length: 66 }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      return { occurrenceDate: date.toISOString().slice(0, 10), eventType: 'completed' as const };
    });
    events.push({ occurrenceDate: '2026-01-01', eventType: 'joker_earned' });
    events.push({ occurrenceDate: '2026-01-06', eventType: 'joker_earned' });

    // Streak of 66 runs 2026-01-01..2026-03-07; 03-08 is unaccounted.
    const plan = reconcileMissedOccurrences(daily, events, '2026-03-07', '2026-03-09');
    expect(plan.eventsToWrite).toEqual([{ occurrenceDate: '2026-03-08', eventType: 'missed' }]);
  });

  it('produces no events for dates inside a paused period', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: '2026-07-02', eventType: 'paused' },
      { occurrenceDate: '2026-07-06', eventType: 'reactivated' },
    ];
    // Walk covers 07-02..07-05, all inside the pause (reactivation lands on
    // 07-06, which is "today" here and so is never walked anyway).
    const plan = reconcileMissedOccurrences(daily, events, '2026-07-01', '2026-07-06');
    expect(plan.eventsToWrite).toEqual([]);
    expect(plan.reconciledThroughDate).toBe('2026-07-05');
  });

  it('reconciles days before and after a paused period but not inside it', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: '2026-07-02', eventType: 'paused' },
      { occurrenceDate: '2026-07-04', eventType: 'reactivated' },
    ];
    // 07-01 unaccounted (before pause), 07-02..07-03 paused, 07-04 onward active again.
    const plan = reconcileMissedOccurrences(daily, events, '2026-06-30', '2026-07-05');
    expect(plan.eventsToWrite).toEqual([
      { occurrenceDate: '2026-07-01', eventType: 'missed' },
      { occurrenceDate: '2026-07-04', eventType: 'missed' },
    ]);
  });

  it('skips a moved occurrence on its original date but reconciles the moved-to date if left incomplete', () => {
    // Wednesday-only schedule: 2026-07-01 (Wed) is due, 2026-07-02 (Thu) is
    // not, so the moved-to date (07-03, Fri) is due only because of the move.
    const wednesdayOnly = { type: 'weekdays' as const, weekdays: [3 as const] };
    const events: OccurrenceEvent[] = [
      { occurrenceDate: '2026-07-01', eventType: 'moved', movedToDate: '2026-07-03' },
    ];
    const plan = reconcileMissedOccurrences(wednesdayOnly, events, '2026-06-30', '2026-07-04');
    expect(plan.eventsToWrite).toEqual([{ occurrenceDate: '2026-07-03', eventType: 'missed' }]);
  });
});
