import { replayRoutineStreak, type StreakReplayEvent } from '../replay';

function events(...entries: [string, StreakReplayEvent['eventType'], string?][]): StreakReplayEvent[] {
  return entries.map(([occurrenceDate, eventType, supersededByEventId]) => ({
    occurrenceDate,
    eventType,
    supersededByEventId,
  }));
}

function completions(count: number, startDate = '2026-01-01'): StreakReplayEvent[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    return { occurrenceDate: date.toISOString().slice(0, 10), eventType: 'completed' as const };
  });
}

describe('replayRoutineStreak', () => {
  it('starts from all-zero state on an empty log', () => {
    expect(replayRoutineStreak([])).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
      levelRank: 0,
      jokerInventory: 0,
      jokerProgress: 0,
      consecutiveMissedAfter66: 0,
    });
  });

  describe('streak calculation', () => {
    it('increments current and best streak on completions and exceeded completions alike', () => {
      const log = events(['2026-01-01', 'completed'], ['2026-01-02', 'exceeded'], ['2026-01-03', 'completed']);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(3);
      expect(state.bestStreak).toBe(3);
      expect(state.totalCompletions).toBe(3);
    });

    it('resets current streak on a plain miss but preserves the best streak record', () => {
      const log = events(['2026-01-01', 'completed'], ['2026-01-02', 'completed'], ['2026-01-03', 'missed']);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(0);
      expect(state.bestStreak).toBe(2);
    });

    it('folds events in occurrenceDate order regardless of array order', () => {
      const log = events(['2026-01-03', 'missed'], ['2026-01-01', 'completed'], ['2026-01-02', 'completed']);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(0);
      expect(state.bestStreak).toBe(2);
    });

    it('ignores superseded events', () => {
      const log = events(['2026-01-01', 'missed', 'evt-2'], ['2026-01-01', 'completed']);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(1);
      expect(state.totalCompletions).toBe(1);
    });

    it('does not change the streak on a conscious skip', () => {
      const log = events(['2026-01-01', 'completed'], ['2026-01-02', 'skipped'], ['2026-01-03', 'completed']);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(2);
      expect(state.totalCompletions).toBe(2);
    });

    it('does not change the streak on moved, paused, or reactivated events', () => {
      const log = events(
        ['2026-01-01', 'completed'],
        ['2026-01-02', 'moved'],
        ['2026-01-03', 'paused'],
        ['2026-01-04', 'reactivated'],
      );
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(1);
    });
  });

  describe('joker earning', () => {
    it('accrues joker progress with each completion before streak 66', () => {
      const log = completions(4);
      expect(replayRoutineStreak(log).jokerProgress).toBe(4);
    });

    it('resets joker progress and grants a joker on a joker_earned event', () => {
      const log = [...completions(5), { occurrenceDate: '2026-01-05', eventType: 'joker_earned' as const }];
      const state = replayRoutineStreak(log);
      expect(state.jokerProgress).toBe(0);
      expect(state.jokerInventory).toBe(1);
    });

    it('caps joker inventory at 2', () => {
      const log: StreakReplayEvent[] = [
        { occurrenceDate: '2026-01-01', eventType: 'joker_earned' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_earned' },
        { occurrenceDate: '2026-01-03', eventType: 'joker_earned' },
      ];
      expect(replayRoutineStreak(log).jokerInventory).toBe(2);
    });

    it('stops accruing joker progress once the streak has reached 66', () => {
      const log = completions(70);
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(70);
      // Progress accrued up to the 65th completion (streak < 66), then froze.
      expect(state.jokerProgress).toBe(65);
    });
  });

  describe('joker consumption', () => {
    it('decrements inventory on joker_consumed without breaking the streak', () => {
      const log: StreakReplayEvent[] = [
        ...completions(2),
        { occurrenceDate: '2026-01-05', eventType: 'joker_earned' },
        { occurrenceDate: '2026-01-06', eventType: 'joker_protected' },
        { occurrenceDate: '2026-01-06', eventType: 'joker_consumed' },
        { occurrenceDate: '2026-01-07', eventType: 'completed' },
      ];
      const state = replayRoutineStreak(log);
      expect(state.jokerInventory).toBe(0);
      // The protected day did not break the streak: 2 completions + 1 more.
      expect(state.currentStreak).toBe(3);
    });

    it('never drops inventory below 0', () => {
      const log: StreakReplayEvent[] = [{ occurrenceDate: '2026-01-01', eventType: 'joker_consumed' }];
      expect(replayRoutineStreak(log).jokerInventory).toBe(0);
    });
  });

  describe('joker restoration', () => {
    it('restores inventory to what it was before consumption, once the consuming event is superseded', () => {
      const beforeConsumption: StreakReplayEvent[] = [
        { occurrenceDate: '2026-01-01', eventType: 'joker_earned' },
      ];
      const inventoryBeforeConsumption = replayRoutineStreak(beforeConsumption).jokerInventory;

      const afterRetroactiveCompletion: StreakReplayEvent[] = [
        { occurrenceDate: '2026-01-01', eventType: 'joker_earned' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_protected', supersededByEventId: 'evt-completed' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_consumed', supersededByEventId: 'evt-restore' },
        { occurrenceDate: '2026-01-02', eventType: 'completed' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_restored' },
      ];

      expect(replayRoutineStreak(afterRetroactiveCompletion).jokerInventory).toBe(inventoryBeforeConsumption);
    });

    it('does not double-credit inventory beyond what exclusion of the consumed event already restores', () => {
      const log: StreakReplayEvent[] = [
        { occurrenceDate: '2026-01-01', eventType: 'joker_earned' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_consumed', supersededByEventId: 'evt-restore' },
        { occurrenceDate: '2026-01-02', eventType: 'joker_restored' },
      ];
      expect(replayRoutineStreak(log).jokerInventory).toBe(1);
    });
  });

  describe('66-completion protection', () => {
    function streakAt66(): StreakReplayEvent[] {
      return completions(66);
    }

    it('tolerates up to 3 consecutive misses once the streak has reached 66', () => {
      const log = [
        ...streakAt66(),
        { occurrenceDate: '2026-03-08', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-09', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-10', eventType: 'missed' as const },
      ];
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(66);
      expect(state.consecutiveMissedAfter66).toBe(3);
    });

    it('resets the streak on the 4th consecutive miss after 66', () => {
      const log = [
        ...streakAt66(),
        { occurrenceDate: '2026-03-08', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-09', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-10', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-11', eventType: 'missed' as const },
      ];
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(0);
      expect(state.consecutiveMissedAfter66).toBe(0);
      // Best streak and total completions remain preserved across the reset.
      expect(state.bestStreak).toBe(66);
      expect(state.totalCompletions).toBe(66);
    });

    it('resets the tolerated-miss counter on an intervening completion', () => {
      const log = [
        ...streakAt66(),
        { occurrenceDate: '2026-03-08', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-09', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-10', eventType: 'completed' as const },
        { occurrenceDate: '2026-03-11', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-12', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-13', eventType: 'missed' as const },
      ];
      const state = replayRoutineStreak(log);
      // Not reset: only 3 consecutive misses since the last completion.
      expect(state.currentStreak).toBe(67);
      expect(state.consecutiveMissedAfter66).toBe(3);
    });

    it('re-enters the pre-66 joker regime once a post-reset streak is rebuilding', () => {
      const log = [
        ...streakAt66(),
        { occurrenceDate: '2026-03-08', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-09', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-10', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-11', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-12', eventType: 'completed' as const },
      ];
      const state = replayRoutineStreak(log);
      expect(state.currentStreak).toBe(1);
      expect(state.jokerProgress).toBe(1);
    });
  });

  describe('level progression', () => {
    it('stays at level 0 below the first 66-completion boundary', () => {
      expect(replayRoutineStreak(completions(65)).levelRank).toBe(0);
    });

    it('advances to level 1 at exactly 66 completions', () => {
      expect(replayRoutineStreak(completions(66)).levelRank).toBe(1);
    });

    it('advances to level 2 at 132 completions', () => {
      expect(replayRoutineStreak(completions(132)).levelRank).toBe(2);
    });

    it('preserves level rank and total completions across a later streak reset', () => {
      const log = [
        ...completions(66),
        { occurrenceDate: '2026-03-08', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-09', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-10', eventType: 'missed' as const },
        { occurrenceDate: '2026-03-11', eventType: 'missed' as const },
      ];
      const state = replayRoutineStreak(log);
      expect(state.levelRank).toBe(1);
      expect(state.totalCompletions).toBe(66);
      expect(state.currentStreak).toBe(0);
    });
  });
});
