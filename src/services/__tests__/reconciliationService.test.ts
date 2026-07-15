import { createDrizzleTestDb } from '../../data/db/testUtils';
import { getRoutineStateCache } from '../../data/repositories/routineStateCacheRepository';
import { getAppStreakCache } from '../../data/repositories/appStreakCacheRepository';
import { listRoutineEvents } from '../../data/repositories/routineEventRepository';
import { addDaysToDateString } from '../../domain/dates';
import { completeRoutineOccurrence, createRoutine } from '../routineService';
import { reconcileAllActiveRoutines, reconcileRoutine } from '../reconciliationService';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-id-${counter++}`),
  };
});

const baseInput = {
  name: 'Laufen',
  scheduleType: 'daily' as const,
  allowConsciousSkip: false,
  colorVariantSeed: 0,
};

async function completeConsecutiveDays(
  db: Parameters<typeof completeRoutineOccurrence>[0],
  routineId: string,
  startDate: string,
  count: number,
): Promise<string> {
  let date = startDate;
  for (let i = 0; i < count; i++) {
    // Each completion is recorded as if that day were "today", so the app
    // streak replay treats it as an in-progress completion rather than a
    // long-elapsed one.
    await completeRoutineOccurrence(db, routineId, date, date);
    date = addDaysToDateString(date, 1);
  }
  return date;
}

describe('reconciliationService', () => {
  it('consumes a joker to protect an elapsed missed day after 5 completions earned one', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    const nextDue = await completeConsecutiveDays(db, created.id, '2026-06-25', 5);
    // nextDue ('2026-06-30') is left uncompleted, then elapses.
    const today = addDaysToDateString(nextDue, 1);

    const cacheBefore = await getRoutineStateCache(db, created.id);
    expect(cacheBefore).toMatchObject({ jokerInventory: 1, currentStreak: 5 });

    await reconcileRoutine(db, created.id, today);

    const events = await listRoutineEvents(db, created.id);
    expect(events.map((e) => e.eventType)).toContain('joker_protected');
    expect(events.map((e) => e.eventType)).toContain('joker_consumed');

    const cacheAfter = await getRoutineStateCache(db, created.id);
    expect(cacheAfter).toMatchObject({
      jokerInventory: 0,
      currentStreak: 5,
      totalCompletions: 5,
      reconciledThroughDate: addDaysToDateString(today, -1),
    });

    sqlite.close();
  });

  it('tolerates 3 consecutive misses after streak 66, then resets on the 4th', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    const nextDue = await completeConsecutiveDays(db, created.id, '2026-01-01', 66);
    // 4 elapsed unaccounted days follow: 3 tolerated, the 4th resets.
    const today = addDaysToDateString(nextDue, 4);

    await reconcileRoutine(db, created.id, today);

    const cache = await getRoutineStateCache(db, created.id);
    expect(cache).toMatchObject({
      currentStreak: 0,
      bestStreak: 66,
      totalCompletions: 66,
      levelRank: 1,
      consecutiveMissedAfter66: 0,
    });

    sqlite.close();
  });

  it('does not reset the streak with only 3 tolerated misses after streak 66', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    const nextDue = await completeConsecutiveDays(db, created.id, '2026-01-01', 66);
    const today = addDaysToDateString(nextDue, 3);

    await reconcileRoutine(db, created.id, today);

    const cache = await getRoutineStateCache(db, created.id);
    expect(cache).toMatchObject({ currentStreak: 66, consecutiveMissedAfter66: 3 });

    sqlite.close();
  });

  it('resets the app streak on a fully-missed scheduled day, once reconciled', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
    expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1 });
    // 2026-07-02 is left uncompleted for this daily routine.

    await reconcileAllActiveRoutines(db, '2026-07-03');

    expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 0 });

    sqlite.close();
  });

  it('reconciles every non-deleted routine at once via reconcileAllActiveRoutines', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const first = await createRoutine(db, baseInput);
    const second = await createRoutine(db, { ...baseInput, name: 'Lesen' });

    await completeConsecutiveDays(db, first.id, '2026-06-25', 5);
    await completeConsecutiveDays(db, second.id, '2026-06-25', 5);

    await reconcileAllActiveRoutines(db, '2026-07-01');

    expect(await getRoutineStateCache(db, first.id)).toMatchObject({ jokerInventory: 0 });
    expect(await getRoutineStateCache(db, second.id)).toMatchObject({ jokerInventory: 0 });

    sqlite.close();
  });
});
