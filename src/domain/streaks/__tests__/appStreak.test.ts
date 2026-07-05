import { reconcileAppStreakDays, type AppStreakDayInput, type AppStreakState } from '../appStreak';

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
