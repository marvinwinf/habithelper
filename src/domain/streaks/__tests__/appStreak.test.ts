import {
  computeAppStreak,
  isFirstCompletionOfDay,
  reconcileAppStreakDays,
  type AppStreakDayInput,
  type AppStreakRoutineContext,
  type AppStreakState,
} from '../appStreak';
import type { OccurrenceEvent } from '../../routines/completion';
import type { RoutineSchedule } from '../../routines/schedule';

const DAILY: RoutineSchedule = { type: 'daily' };

function completed(date: string): OccurrenceEvent {
  return { occurrenceDate: date, eventType: 'completed' };
}

function ctx(events: OccurrenceEvent[], schedule: RoutineSchedule = DAILY): AppStreakRoutineContext {
  return { schedule, events };
}

const EMPTY_STATE: AppStreakState = { currentStreak: 0, lastIncrementedDate: null };

function day(overrides: Partial<AppStreakDayInput> & { date: string }): AppStreakDayInput {
  return { hasScheduledOccurrence: true, hasActualCompletion: false, ...overrides };
}

describe('reconcileAppStreakDays', () => {
  it('extends the streak by one for each day with an actual completion', () => {
    const days = [
      day({ date: '2026-07-01', hasActualCompletion: true }),
      day({ date: '2026-07-02', hasActualCompletion: true }),
    ];
    expect(reconcileAppStreakDays(days, EMPTY_STATE)).toEqual({
      currentStreak: 2,
      lastIncrementedDate: '2026-07-02',
    });
  });

  it('resets the streak to 0 on a day with scheduled occurrences and no completion', () => {
    const days = [
      day({ date: '2026-07-01', hasActualCompletion: true }),
      day({ date: '2026-07-02', hasActualCompletion: false }),
    ];
    expect(reconcileAppStreakDays(days, EMPTY_STATE)).toEqual({
      currentStreak: 0,
      lastIncrementedDate: '2026-07-01',
    });
  });

  it('leaves the streak unchanged on a day with no scheduled occurrences at all', () => {
    const days = [
      day({ date: '2026-07-01', hasActualCompletion: true }),
      day({ date: '2026-07-02', hasScheduledOccurrence: false, hasActualCompletion: false }),
      day({ date: '2026-07-03', hasActualCompletion: true }),
    ];
    expect(reconcileAppStreakDays(days, EMPTY_STATE)).toEqual({
      currentStreak: 2,
      lastIncrementedDate: '2026-07-03',
    });
  });

  it('does not double-increment a day already accounted for by the initial state', () => {
    const initialState: AppStreakState = { currentStreak: 3, lastIncrementedDate: '2026-07-02' };
    const days = [day({ date: '2026-07-02', hasActualCompletion: true })];
    expect(reconcileAppStreakDays(days, initialState)).toEqual(initialState);
  });

  it('continues extending the streak from a preserved initial state', () => {
    const initialState: AppStreakState = { currentStreak: 3, lastIncrementedDate: '2026-07-02' };
    const days = [day({ date: '2026-07-03', hasActualCompletion: true })];
    expect(reconcileAppStreakDays(days, initialState)).toEqual({
      currentStreak: 4,
      lastIncrementedDate: '2026-07-03',
    });
  });
});

describe('computeAppStreak', () => {
  it('returns an empty streak when nothing has ever been recorded', () => {
    expect(computeAppStreak([], '2026-07-05')).toEqual({
      currentStreak: 0,
      lastIncrementedDate: null,
    });
  });

  it('counts consecutive completed days up to and including today', () => {
    const contexts = [ctx([completed('2026-07-03'), completed('2026-07-04'), completed('2026-07-05')])];
    expect(computeAppStreak(contexts, '2026-07-05')).toEqual({
      currentStreak: 3,
      lastIncrementedDate: '2026-07-05',
    });
  });

  it('does not reset the streak just because today is still pending', () => {
    // 07-05 is today and the daily routine is not yet done — the streak from
    // the previous days stands rather than resetting to 0.
    const contexts = [ctx([completed('2026-07-03'), completed('2026-07-04')])];
    expect(computeAppStreak(contexts, '2026-07-05')).toEqual({
      currentStreak: 2,
      lastIncrementedDate: '2026-07-04',
    });
  });

  it('breaks the streak on an elapsed fully-missed day', () => {
    // 07-04 was a due day for this daily routine with no completion, so the
    // run through 07-05 is only the single latest day.
    const contexts = [ctx([completed('2026-07-03'), completed('2026-07-05')])];
    expect(computeAppStreak(contexts, '2026-07-05')).toEqual({
      currentStreak: 1,
      lastIncrementedDate: '2026-07-05',
    });
  });

  it('reflects a past gap once it is filled retroactively — the core global-streak fix', () => {
    const withGap = [ctx([completed('2026-07-03'), completed('2026-07-05')])];
    expect(computeAppStreak(withGap, '2026-07-05').currentStreak).toBe(1);

    const gapFilled = [ctx([completed('2026-07-03'), completed('2026-07-04'), completed('2026-07-05')])];
    expect(computeAppStreak(gapFilled, '2026-07-05')).toEqual({
      currentStreak: 3,
      lastIncrementedDate: '2026-07-05',
    });
  });

  it('counts a day where any single routine was completed', () => {
    const contexts = [
      ctx([completed('2026-07-04')]),
      ctx([completed('2026-07-05')]),
    ];
    // 07-04: first routine completed (second not yet due-missed? it is daily
    // and missed) — a fully-missed routine on a day another completed still
    // counts the day as completed for the app streak.
    expect(computeAppStreak(contexts, '2026-07-05')).toEqual({
      currentStreak: 2,
      lastIncrementedDate: '2026-07-05',
    });
  });
});

describe('isFirstCompletionOfDay', () => {
  it('is true when the app streak has never been incremented before', () => {
    expect(isFirstCompletionOfDay(null, '2026-07-01')).toBe(true);
    expect(isFirstCompletionOfDay(undefined, '2026-07-01')).toBe(true);
  });

  it('is true for the first completion of a new, later day', () => {
    expect(isFirstCompletionOfDay('2026-07-01', '2026-07-02')).toBe(true);
  });

  it('is false for a second completion on the same already-incremented day', () => {
    expect(isFirstCompletionOfDay('2026-07-02', '2026-07-02')).toBe(false);
  });

  it('is false for a backdated completion older than the current watermark', () => {
    expect(isFirstCompletionOfDay('2026-07-05', '2026-07-01')).toBe(false);
  });
});
