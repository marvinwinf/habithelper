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

  it('classifies an undone completion as pending again', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: TODAY, eventType: 'completed', supersededByEventId: 'evt-2' },
      { occurrenceDate: TODAY, eventType: 'completion_undone' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('pending');
  });

  // The check → uncheck → check misclick-recovery loop. The `completion_undone`
  // marker stays active forever (nothing supersedes it) and is listed before
  // the newer completion, so taking the first active event for the date left
  // the re-completed occurrence stranded on 'pending'.
  it('classifies a re-completion after an undo as completed, not pending', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: TODAY, eventType: 'completed', supersededByEventId: 'evt-2' },
      { occurrenceDate: TODAY, eventType: 'completion_undone' },
      { occurrenceDate: TODAY, eventType: 'completed' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('completed');
  });

  it('classifies a re-exceeded occurrence after an undo as exceeded', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: TODAY, eventType: 'exceeded', supersededByEventId: 'evt-2' },
      { occurrenceDate: TODAY, eventType: 'completion_undone' },
      { occurrenceDate: TODAY, eventType: 'exceeded' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('exceeded');
  });

  it('classifies an undone conscious skip as pending again', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: TODAY, eventType: 'skipped', supersededByEventId: 'evt-2' },
      { occurrenceDate: TODAY, eventType: 'skip_undone' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('pending');
  });

  it('is not shadowed by a joker_earned event recorded on the completion day', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: TODAY, eventType: 'joker_earned' },
      { occurrenceDate: TODAY, eventType: 'completed' },
    ];
    expect(classifyOccurrence(daily, TODAY, events, TODAY)).toBe('completed');
  });
});

describe('classifyOccurrence for weekly-target routines', () => {
  // 2026-07-01 is a Wednesday, so this week runs Mon 2026-06-29 – Sun 2026-07-05.
  const twicePerWeek = {
    type: 'weekly_target' as const,
    weekdays: [1 as const, 3 as const, 5 as const],
    targetCount: 2,
  };
  const MONDAY = '2026-06-29';
  const WEDNESDAY = '2026-07-01';
  const FRIDAY = '2026-07-03';
  const NEXT_MONDAY = '2026-07-06';

  it('classifies an elapsed suggested weekday as missed while the target is outstanding', () => {
    const events: OccurrenceEvent[] = [{ occurrenceDate: MONDAY, eventType: 'completed' }];
    expect(classifyOccurrence(twicePerWeek, WEDNESDAY, events, FRIDAY)).toBe('missed');
  });

  // The suggested weekdays may outnumber the target (the routine detail
  // screen lets them diverge), so the leftover days must not be reconciled
  // into misses that break the streak.
  it('does not classify a leftover suggested weekday as missed once the target is met', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: MONDAY, eventType: 'completed' },
      { occurrenceDate: WEDNESDAY, eventType: 'exceeded' },
    ];
    expect(classifyOccurrence(twicePerWeek, FRIDAY, events, NEXT_MONDAY)).toBe('not_due');
  });

  it('counts a completion on an unsuggested weekday towards the target', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: MONDAY, eventType: 'completed' },
      // Tuesday, not one of the suggested weekdays.
      { occurrenceDate: '2026-06-30', eventType: 'completed' },
    ];
    expect(classifyOccurrence(twicePerWeek, WEDNESDAY, events, FRIDAY)).toBe('not_due');
  });

  it('keeps a met target from carrying into the following week', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: MONDAY, eventType: 'completed' },
      { occurrenceDate: WEDNESDAY, eventType: 'completed' },
    ];
    expect(classifyOccurrence(twicePerWeek, NEXT_MONDAY, events, '2026-07-08')).toBe('missed');
  });

  it('still allows completing another occurrence after the target is met', () => {
    const events: OccurrenceEvent[] = [
      { occurrenceDate: MONDAY, eventType: 'completed' },
      { occurrenceDate: WEDNESDAY, eventType: 'completed' },
    ];
    // FRIDAY is today: still offered, so an extra completion stays possible
    // (docs/ROUTINE_RULES.md — "each successful completion increases the
    // streak by one").
    expect(classifyOccurrence(twicePerWeek, FRIDAY, events, FRIDAY)).toBe('pending');
  });

  it('does not suppress misses for a plain weekdays routine', () => {
    const mondayWednesday = { type: 'weekdays' as const, weekdays: [1 as const, 3 as const] };
    const events: OccurrenceEvent[] = [{ occurrenceDate: MONDAY, eventType: 'completed' }];
    expect(classifyOccurrence(mondayWednesday, WEDNESDAY, events, FRIDAY)).toBe('missed');
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
