import { createDrizzleTestDb } from '../../db/testUtils';
import { routineStateCache } from '../../db/schema';
import { createRoutine } from '../routineRepository';
import {
  buildRoutineStateCache,
  deleteRoutineStateCache,
  getRoutineStateCache,
} from '../routineStateCacheRepository';
import type { RoutineStreakState } from '../../../domain/streaks/replay';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-id-${counter++}`),
  };
});

const baseRoutineInput = {
  name: 'Laufen',
  scheduleType: 'daily' as const,
  allowConsciousSkip: false,
  sortOrder: 0,
  colorVariantSeed: 0,
};

const zeroState: RoutineStreakState = {
  currentStreak: 0,
  bestStreak: 0,
  totalCompletions: 0,
  levelRank: 0,
  jokerInventory: 0,
  jokerProgress: 0,
  consecutiveMissedAfter66: 0,
};

describe('routineStateCacheRepository', () => {
  it('returns undefined for a routine with no cache row yet', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, baseRoutineInput);

    expect(await getRoutineStateCache(db, routine.id)).toBeUndefined();

    sqlite.close();
  });

  it('builds a cache row from replay state without writing it', () => {
    const state: RoutineStreakState = { ...zeroState, currentStreak: 3, bestStreak: 3, totalCompletions: 3 };
    const cache = buildRoutineStateCache('routine-1', state, '2026-06-30');

    expect(cache).toMatchObject({
      routineId: 'routine-1',
      currentStreak: 3,
      bestStreak: 3,
      totalCompletions: 3,
      reconciledThroughDate: '2026-06-30',
    });
    expect(cache.recalculatedAt).toEqual(expect.any(String));
  });

  it('discards a cache row so it can be re-derived, per the always-re-derivable guarantee', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, baseRoutineInput);
    await db.insert(routineStateCache).values(buildRoutineStateCache(routine.id, zeroState, '2026-06-30'));

    expect(await getRoutineStateCache(db, routine.id)).toBeDefined();

    await deleteRoutineStateCache(db, routine.id);

    expect(await getRoutineStateCache(db, routine.id)).toBeUndefined();

    sqlite.close();
  });
});
