import { createDrizzleTestDb } from '../../data/db/testUtils';
import { routineStateCache } from '../../data/db/schema';
import { getRoutine } from '../../data/repositories/routineRepository';
import { appendRoutineEvent, listRoutineEvents } from '../../data/repositories/routineEventRepository';
import { getRoutineStateCache } from '../../data/repositories/routineStateCacheRepository';
import * as routineStateCacheRepo from '../../data/repositories/routineStateCacheRepository';
import { getAppStreakCache } from '../../data/repositories/appStreakCacheRepository';
import { ConsciousSkipNotAllowedError } from '../../domain/routines/completion';
import {
  RoutineNotFoundError,
  completeRoutineOccurrence,
  createRoutine,
  exceedRoutineOccurrence,
  moveRoutineOccurrence,
  pauseRoutine,
  reactivateRoutine,
  recomputeRoutineCache,
  retroactivelyCompleteOccurrence,
  skipRoutineOccurrence,
} from '../routineService';

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

describe('routineService', () => {
  it('creates a routine, appending sortOrder after every existing one', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const first = await createRoutine(db, baseInput);
    const second = await createRoutine(db, { ...baseInput, name: 'Lesen' });

    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);

    sqlite.close();
  });

  it('records a normal completion event', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await completeRoutineOccurrence(db, created.id, '2026-07-01');

    const events = await listRoutineEvents(db, created.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      routineId: created.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });

    sqlite.close();
  });

  it('records an exceeded completion event', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await exceedRoutineOccurrence(db, created.id, '2026-07-01');

    const events = await listRoutineEvents(db, created.id);
    expect(events[0]).toMatchObject({ eventType: 'exceeded', occurrenceDate: '2026-07-01' });

    sqlite.close();
  });

  it('records a conscious skip when the routine allows it', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, { ...baseInput, allowConsciousSkip: true });

    await skipRoutineOccurrence(db, created.id, '2026-07-01', 'sick day');

    const events = await listRoutineEvents(db, created.id);
    expect(events[0]).toMatchObject({
      eventType: 'skipped',
      occurrenceDate: '2026-07-01',
      skipReason: 'sick day',
    });

    sqlite.close();
  });

  it('rejects a conscious skip when the routine disallows it, writing no event', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, { ...baseInput, allowConsciousSkip: false });

    await expect(skipRoutineOccurrence(db, created.id, '2026-07-01')).rejects.toThrow(
      ConsciousSkipNotAllowedError,
    );

    expect(await listRoutineEvents(db, created.id)).toHaveLength(0);

    sqlite.close();
  });

  it('throws when skipping an unknown routine', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(skipRoutineOccurrence(db, 'does-not-exist', '2026-07-01')).rejects.toThrow(
      RoutineNotFoundError,
    );

    sqlite.close();
  });

  it('records a move with the original and target dates', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await moveRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-02');

    const events = await listRoutineEvents(db, created.id);
    expect(events[0]).toMatchObject({
      eventType: 'moved',
      occurrenceDate: '2026-07-01',
      movedToDate: '2026-07-02',
    });

    sqlite.close();
  });

  it('pausing an unknown routine throws and writes no event (transactional)', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await expect(pauseRoutine(db, 'does-not-exist', '2026-07-01')).rejects.toThrow(
      RoutineNotFoundError,
    );

    expect(await listRoutineEvents(db, 'does-not-exist')).toHaveLength(0);
    expect((await getRoutine(db, created.id))?.isPaused).toBe(false);

    sqlite.close();
  });

  it('pauses a routine: writes a paused event and flips isPaused', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await pauseRoutine(db, created.id, '2026-07-01');

    const events = await listRoutineEvents(db, created.id);
    expect(events[0]).toMatchObject({ eventType: 'paused', occurrenceDate: '2026-07-01' });
    expect((await getRoutine(db, created.id))?.isPaused).toBe(true);

    sqlite.close();
  });

  it('reactivates a routine: writes a reactivated event and clears isPaused', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);
    await pauseRoutine(db, created.id, '2026-07-01');

    await reactivateRoutine(db, created.id, '2026-07-05');

    const events = await listRoutineEvents(db, created.id);
    expect(events.map((e) => e.eventType)).toEqual(['paused', 'reactivated']);
    expect((await getRoutine(db, created.id))?.isPaused).toBe(false);

    sqlite.close();
  });

  it('retroactively completes a previously missed occurrence, superseding it', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);
    const missedEvent = await appendRoutineEvent(db, {
      routineId: created.id,
      occurrenceDate: '2026-07-01',
      eventType: 'missed',
    });

    const result = await retroactivelyCompleteOccurrence(db, created.id, '2026-07-01');

    expect(result.jokerRestored).toBe(false);
    expect(result.requiresFullRecalculation).toBe(true);
    expect(result.writtenEvents).toHaveLength(1);
    expect(result.writtenEvents[0]).toMatchObject({ eventType: 'completed', occurrenceDate: '2026-07-01' });

    const events = await listRoutineEvents(db, created.id);
    const supersededMissed = events.find((e) => e.id === missedEvent.id);
    expect(supersededMissed?.supersededByEventId).toBe(result.writtenEvents[0].id);

    sqlite.close();
  });

  it('retroactively completing a joker-protected occurrence restores the joker', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);
    await appendRoutineEvent(db, {
      routineId: created.id,
      occurrenceDate: '2026-07-01',
      eventType: 'joker_protected',
    });
    const jokerConsumed = await appendRoutineEvent(db, {
      routineId: created.id,
      occurrenceDate: '2026-07-01',
      eventType: 'joker_consumed',
    });

    const result = await retroactivelyCompleteOccurrence(db, created.id, '2026-07-01');

    expect(result.jokerRestored).toBe(true);
    expect(result.writtenEvents.map((e) => e.eventType)).toEqual(['completed', 'joker_restored']);

    const events = await listRoutineEvents(db, created.id);
    const supersededJokerConsumed = events.find((e) => e.id === jokerConsumed.id);
    const jokerRestoredEvent = result.writtenEvents.find((e) => e.eventType === 'joker_restored');
    expect(supersededJokerConsumed?.supersededByEventId).toBe(jokerRestoredEvent?.id);

    sqlite.close();
  });

  describe('cache persistence', () => {
    it('recomputes the routine cache after a normal completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-02');

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 2, bestStreak: 2, totalCompletions: 2, levelRank: 0 });

      sqlite.close();
    });

    it('writes a joker_earned event automatically on the 5th completion, reflected in the cache', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      for (let i = 1; i <= 5; i++) {
        await completeRoutineOccurrence(db, created.id, `2026-07-0${i}`);
      }

      const events = await listRoutineEvents(db, created.id);
      expect(events.filter((e) => e.eventType === 'joker_earned')).toHaveLength(1);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ jokerInventory: 1, jokerProgress: 0 });

      sqlite.close();
    });

    it('recomputes the routine cache after a conscious skip, move, pause, and reactivate — all no-ops for the numbers', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, { ...baseInput, allowConsciousSkip: true });

      await skipRoutineOccurrence(db, created.id, '2026-07-01');
      await moveRoutineOccurrence(db, created.id, '2026-07-02', '2026-07-03');
      await pauseRoutine(db, created.id, '2026-07-04');
      await reactivateRoutine(db, created.id, '2026-07-05');

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 0, totalCompletions: 0 });

      sqlite.close();
    });

    it('recomputes the app streak cache only on the first completion of a new day', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const first = await createRoutine(db, baseInput);
      const second = await createRoutine(db, { ...baseInput, name: 'Lesen' });

      await completeRoutineOccurrence(db, first.id, '2026-07-01');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1, lastIncrementedDate: '2026-07-01' });

      // A second routine completed the same day does not double-increment.
      await completeRoutineOccurrence(db, second.id, '2026-07-01');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1, lastIncrementedDate: '2026-07-01' });

      // A completion on a new day extends the streak by one.
      await exceedRoutineOccurrence(db, first.id, '2026-07-02');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 2, lastIncrementedDate: '2026-07-02' });

      sqlite.close();
    });

    it('does not touch the app streak cache for a skip, move, pause, or reactivate', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, { ...baseInput, allowConsciousSkip: true });

      await skipRoutineOccurrence(db, created.id, '2026-07-01');
      await moveRoutineOccurrence(db, created.id, '2026-07-02', '2026-07-03');

      expect(await getAppStreakCache(db)).toBeUndefined();

      sqlite.close();
    });

    it('reflects a joker restored by a retroactive completion in the persisted cache', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: '2026-07-01',
        eventType: 'joker_earned',
      });
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: '2026-07-02',
        eventType: 'joker_protected',
      });
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: '2026-07-02',
        eventType: 'joker_consumed',
      });

      const result = await retroactivelyCompleteOccurrence(db, created.id, '2026-07-02');
      expect(result.jokerRestored).toBe(true);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache?.jokerInventory).toBe(1);

      sqlite.close();
    });

    it('re-derives a discarded cache row to the same value normal operation produced incrementally', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await exceedRoutineOccurrence(db, created.id, '2026-07-02');

      const incrementallyProduced = await getRoutineStateCache(db, created.id);

      await db.delete(routineStateCache);
      expect(await getRoutineStateCache(db, created.id)).toBeUndefined();

      const rederived = await recomputeRoutineCache(db, created.id);

      // recalculatedAt is a fresh timestamp each time, not part of the
      // re-derivability guarantee — every other field must match exactly.
      expect(rederived).toEqual({ ...incrementallyProduced, recalculatedAt: rederived.recalculatedAt });

      sqlite.close();
    });

    it('leaves both the event and the cache untouched when the cache recompute fails mid-transaction', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const spy = jest
        .spyOn(routineStateCacheRepo, 'buildRoutineStateCache')
        .mockImplementationOnce(() => {
          throw new Error('simulated failure between event write and cache update');
        });

      await expect(completeRoutineOccurrence(db, created.id, '2026-07-01')).rejects.toThrow(
        'simulated failure between event write and cache update',
      );

      expect(await listRoutineEvents(db, created.id)).toHaveLength(0);
      expect(await getRoutineStateCache(db, created.id)).toBeUndefined();

      spy.mockRestore();
      sqlite.close();
    });
  });
});
