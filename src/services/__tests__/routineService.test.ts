import { createDrizzleTestDb } from '../../data/db/testUtils';
import { routineStateCache } from '../../data/db/schema';
import { getRoutine } from '../../data/repositories/routineRepository';
import { appendRoutineEvent, listRoutineEvents } from '../../data/repositories/routineEventRepository';
import { getRoutineStateCache } from '../../data/repositories/routineStateCacheRepository';
import * as routineStateCacheRepo from '../../data/repositories/routineStateCacheRepository';
import { getAppStreakCache } from '../../data/repositories/appStreakCacheRepository';
import { ConsciousSkipNotAllowedError, classifyOccurrence } from '../../domain/routines/completion';
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
  undoRoutineCompletion,
  undoRoutineSkip,
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

    it('counts each completed calendar day once, extending the app streak on a new day', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const first = await createRoutine(db, baseInput);
      const second = await createRoutine(db, { ...baseInput, name: 'Lesen' });

      await completeRoutineOccurrence(db, first.id, '2026-07-01', '2026-07-01');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1, lastIncrementedDate: '2026-07-01' });

      // A second routine completed the same day does not double-count it.
      await completeRoutineOccurrence(db, second.id, '2026-07-01', '2026-07-01');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1, lastIncrementedDate: '2026-07-01' });

      // A completion on the next day extends the streak by one.
      await exceedRoutineOccurrence(db, first.id, '2026-07-02', '2026-07-02');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 2, lastIncrementedDate: '2026-07-02' });

      sqlite.close();
    });

    it('lifts the app streak when a past gap is filled by a retroactive completion', async () => {
      // The exact regression this change fixes: a routine streak built up by
      // retroactively completing earlier days used to leave the global streak
      // behind, because the incremental update ignored backdated completions.
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      // Today is 2026-07-05. The daily routine's 07-03 and 07-04 elapsed
      // missed; only today is completed live, so the global streak is 1.
      await completeRoutineOccurrence(db, created.id, '2026-07-05', '2026-07-05');
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1 });

      // Filling in the two missed days retroactively makes 07-03..07-05 a
      // consecutive run — the global streak must climb to 3.
      await retroactivelyCompleteOccurrence(db, created.id, '2026-07-04', '2026-07-05');
      await retroactivelyCompleteOccurrence(db, created.id, '2026-07-03', '2026-07-05');

      expect(await getAppStreakCache(db)).toMatchObject({
        currentStreak: 3,
        lastIncrementedDate: '2026-07-05',
      });

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

  describe('streak before/after a completion', () => {
    it('reports the streak growing by one per consecutive completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const first = await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      expect(first.previousStreak).toBe(0);
      expect(first.currentStreak).toBe(1);

      const second = await exceedRoutineOccurrence(db, created.id, '2026-07-02', '2026-07-02');
      expect(second.previousStreak).toBe(1);
      expect(second.currentStreak).toBe(2);

      sqlite.close();
    });

    it('reports an unchanged streak for a repeated completion of the same occurrence', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      const repeat = await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      expect(repeat.previousStreak).toBe(1);
      expect(repeat.currentStreak).toBe(1);

      sqlite.close();
    });
  });

  describe('leveledUp signal', () => {
    it('fires only on the specific completion that crosses a 66-completion boundary', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const start = new Date('2026-01-01T00:00:00Z');
      for (let i = 0; i < 65; i++) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + i);
        const result = await completeRoutineOccurrence(db, created.id, date.toISOString().slice(0, 10));
        expect(result.leveledUp).toBe(false);
      }

      const boundaryDate = new Date(start);
      boundaryDate.setUTCDate(boundaryDate.getUTCDate() + 65);
      const boundaryResult = await completeRoutineOccurrence(
        db,
        created.id,
        boundaryDate.toISOString().slice(0, 10),
      );
      expect(boundaryResult.leveledUp).toBe(true);

      const afterDate = new Date(start);
      afterDate.setUTCDate(afterDate.getUTCDate() + 66);
      const afterResult = await completeRoutineOccurrence(db, created.id, afterDate.toISOString().slice(0, 10));
      expect(afterResult.leveledUp).toBe(false);

      sqlite.close();
    });

    it('does not fire for an exceeded completion that does not cross a boundary', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const result = await exceedRoutineOccurrence(db, created.id, '2026-07-01');

      expect(result.leveledUp).toBe(false);

      sqlite.close();
    });

    it('fires on a retroactive completion that crosses a boundary', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const start = new Date('2026-01-01T00:00:00Z');
      for (let i = 0; i < 65; i++) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + i);
        await completeRoutineOccurrence(db, created.id, date.toISOString().slice(0, 10));
      }
      // The 66th occurrence was missed, then completed retroactively.
      const boundaryDate = new Date(start);
      boundaryDate.setUTCDate(boundaryDate.getUTCDate() + 65);
      const boundaryDateString = boundaryDate.toISOString().slice(0, 10);
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: boundaryDateString,
        eventType: 'missed',
      });

      const result = await retroactivelyCompleteOccurrence(db, created.id, boundaryDateString);

      expect(result.leveledUp).toBe(true);

      sqlite.close();
    });
  });

  describe('undoRoutineCompletion', () => {
    it('supersedes the completed event and reverts the routine cache', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-02');

      const result = await undoRoutineCompletion(db, created.id, '2026-07-02');

      expect(result.writtenEvents).toHaveLength(1);
      expect(result.writtenEvents[0]).toMatchObject({
        eventType: 'completion_undone',
        occurrenceDate: '2026-07-02',
      });

      const events = await listRoutineEvents(db, created.id);
      const supersededCompletion = events.find(
        (e) => e.occurrenceDate === '2026-07-02' && e.eventType === 'completed',
      );
      expect(supersededCompletion?.supersededByEventId).toBe(result.writtenEvents[0].id);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 1, totalCompletions: 1 });

      sqlite.close();
    });

    it('works the same for an exceeded completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await exceedRoutineOccurrence(db, created.id, '2026-07-01');

      await undoRoutineCompletion(db, created.id, '2026-07-01');

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 0, totalCompletions: 0 });

      sqlite.close();
    });

    it('also supersedes the joker_earned event from the same completion, reverting the joker', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      for (let i = 1; i <= 5; i++) {
        await completeRoutineOccurrence(db, created.id, `2026-07-0${i}`);
      }
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({ jokerInventory: 1 });

      await undoRoutineCompletion(db, created.id, '2026-07-05');

      const events = await listRoutineEvents(db, created.id);
      const jokerEarned = events.find((e) => e.eventType === 'joker_earned');
      expect(jokerEarned?.supersededByEventId).toBeTruthy();

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ jokerInventory: 0, jokerProgress: 4, totalCompletions: 4 });

      sqlite.close();
    });

    // Idempotent rather than throwing: a rapid second tap on an
    // already-undone card must not reject from a fire-and-forget promise (see
    // undoRoutineCompletion).
    it('is a no-op when there is nothing active to undo', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const result = await undoRoutineCompletion(db, created.id, '2026-07-01');

      expect(result.writtenEvents).toEqual([]);
      expect(await listRoutineEvents(db, created.id)).toEqual([]);

      sqlite.close();
    });

    it('leaves a repeated undo of the same occurrence a no-op', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');
      const second = await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');

      expect(second.writtenEvents).toEqual([]);
      const undoneMarkers = (await listRoutineEvents(db, created.id)).filter(
        (event) => event.eventType === 'completion_undone',
      );
      expect(undoneMarkers).toHaveLength(1);

      sqlite.close();
    });

    it('reverts the app streak cache when undoing the day\'s sole completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-02', '2026-07-02');
      expect(await getAppStreakCache(db)).toMatchObject({
        currentStreak: 2,
        lastIncrementedDate: '2026-07-02',
      });

      await undoRoutineCompletion(db, created.id, '2026-07-02', '2026-07-02');

      expect(await getAppStreakCache(db)).toMatchObject({
        currentStreak: 1,
        lastIncrementedDate: '2026-07-01',
      });

      sqlite.close();
    });

    it('discards the app streak cache entirely when undoing the very first completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');

      expect(await getAppStreakCache(db)).toBeUndefined();

      sqlite.close();
    });

    it('leaves the app streak cache untouched when another routine also completed that day', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const first = await createRoutine(db, baseInput);
      const second = await createRoutine(db, { ...baseInput, name: 'Lesen' });
      await completeRoutineOccurrence(db, first.id, '2026-07-01', '2026-07-01');
      await completeRoutineOccurrence(db, second.id, '2026-07-01', '2026-07-01');

      await undoRoutineCompletion(db, first.id, '2026-07-01', '2026-07-01');

      expect(await getAppStreakCache(db)).toMatchObject({
        currentStreak: 1,
        lastIncrementedDate: '2026-07-01',
      });

      sqlite.close();
    });

    it('breaks the app streak when undoing a past completion the streak was built on', async () => {
      // Undo is a current-day action in the UI (docs/ROUTINE_RULES.md), but
      // the service still recomputes correctly if a past day is undone: that
      // day becomes missed, which breaks the run. Replaying the whole log is
      // what makes this fall out for free — the old incremental undo left the
      // streak wrongly intact at 2.
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-02', '2026-07-02');

      await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-02');

      expect(await getAppStreakCache(db)).toMatchObject({
        currentStreak: 1,
        lastIncrementedDate: '2026-07-02',
      });

      sqlite.close();
    });
  });

  describe('idempotent completion', () => {
    it('completing the same occurrence twice writes only one event and counts once', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      const first = await completeRoutineOccurrence(db, created.id, '2026-07-01');
      const second = await completeRoutineOccurrence(db, created.id, '2026-07-01');

      // The second call is a no-op that returns the completion already on
      // record — same event id, never a spurious level-up.
      expect(second.event.id).toBe(first.event.id);
      expect(second.leveledUp).toBe(false);

      const events = await listRoutineEvents(db, created.id);
      expect(events.filter((e) => e.eventType === 'completed')).toHaveLength(1);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 1, totalCompletions: 1, jokerProgress: 1 });

      sqlite.close();
    });

    it('exceeding an already-completed occurrence is a no-op (single effective completion per day)', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await exceedRoutineOccurrence(db, created.id, '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(events.filter((e) => e.eventType === 'completed' || e.eventType === 'exceeded')).toHaveLength(1);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 1, totalCompletions: 1 });

      sqlite.close();
    });

    it('complete, undo, then complete again leaves exactly one active completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await undoRoutineCompletion(db, created.id, '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      const activeCompletions = events.filter(
        (e) => !e.supersededByEventId && e.eventType === 'completed',
      );
      expect(activeCompletions).toHaveLength(1);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 1, totalCompletions: 1 });

      sqlite.close();
    });

    it('repeated taps do not earn a joker early', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      // Four distinct days, each "double-tapped" — jokerProgress must land on
      // exactly 4, not race past the 5-completion earn threshold.
      for (let i = 1; i <= 4; i++) {
        const date = `2026-07-0${i}`;
        await completeRoutineOccurrence(db, created.id, date);
        await completeRoutineOccurrence(db, created.id, date);
      }

      const events = await listRoutineEvents(db, created.id);
      expect(events.filter((e) => e.eventType === 'joker_earned')).toHaveLength(0);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ totalCompletions: 4, jokerProgress: 4, jokerInventory: 0 });

      sqlite.close();
    });

    it('undo clears legacy duplicate completions from a single day, fully reverting the streak', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      // Simulate history a pre-idempotency build could have written: a second
      // active `completed` event for the same day. Replay double-counts it.
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: '2026-07-01',
        eventType: 'completed',
      });
      await recomputeRoutineCache(db, created.id);
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({ currentStreak: 2, totalCompletions: 2 });

      await undoRoutineCompletion(db, created.id, '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(events.filter((e) => !e.supersededByEventId && e.eventType === 'completed')).toHaveLength(0);

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 0, totalCompletions: 0 });

      sqlite.close();
    });

    it('two timestamps on the same local calendar day count as one successful day', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      // Both taps resolve to the same occurrence_date (YYYY-MM-DD), the unit
      // streaks are measured in — so the second cannot count as a new day.
      await completeRoutineOccurrence(db, created.id, '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-01');

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ currentStreak: 1, totalCompletions: 1 });

      sqlite.close();
    });
  });
  describe('misclick recovery round trips', () => {
    const daily = { type: 'daily' as const };

    // The exact interaction the completion control offers: tap to complete,
    // tap again to undo, tap a third time to complete after all. The undo
    // marker stays in the log forever, so the re-completion has to remain
    // visible past it — otherwise the card renders pending while the streak
    // already counts the day, and further taps do nothing (the completion
    // write is idempotent).
    it('check, uncheck, check again leaves the occurrence completed exactly once', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(classifyOccurrence(daily, '2026-07-01', events, '2026-07-01')).toBe('completed');
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({
        currentStreak: 1,
        totalCompletions: 1,
      });
      expect(await getAppStreakCache(db)).toMatchObject({ currentStreak: 1 });

      sqlite.close();
    });

    it('survives several check/uncheck rounds without accumulating state', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      for (let round = 0; round < 4; round++) {
        await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
        await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');
      }
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(classifyOccurrence(daily, '2026-07-01', events, '2026-07-01')).toBe('completed');
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({
        currentStreak: 1,
        totalCompletions: 1,
        jokerProgress: 1,
      });

      sqlite.close();
    });

    it('an undone exceeded completion can be redone as a normal completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      await exceedRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');
      await undoRoutineCompletion(db, created.id, '2026-07-01', '2026-07-01');
      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(classifyOccurrence(daily, '2026-07-01', events, '2026-07-01')).toBe('completed');

      sqlite.close();
    });
  });

  describe('undoRoutineSkip', () => {
    const daily = { type: 'daily' as const };
    const skippable = { ...baseInput, allowConsciousSkip: true };

    it('returns a mis-tapped conscious skip to pending so it can be completed', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, skippable);
      await skipRoutineOccurrence(db, created.id, '2026-07-01');

      await undoRoutineSkip(db, created.id, '2026-07-01', '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(classifyOccurrence(daily, '2026-07-01', events, '2026-07-01')).toBe('pending');
      expect(events.find((e) => e.eventType === 'skipped')?.supersededByEventId).toBe(
        events.find((e) => e.eventType === 'skip_undone')?.id,
      );

      sqlite.close();
    });

    it('lets the occurrence be completed normally afterwards', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, skippable);
      await skipRoutineOccurrence(db, created.id, '2026-07-01');
      await undoRoutineSkip(db, created.id, '2026-07-01', '2026-07-01');

      await completeRoutineOccurrence(db, created.id, '2026-07-01', '2026-07-01');

      const events = await listRoutineEvents(db, created.id);
      expect(classifyOccurrence(daily, '2026-07-01', events, '2026-07-01')).toBe('completed');
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({
        currentStreak: 1,
        totalCompletions: 1,
      });

      sqlite.close();
    });

    it('is a no-op when nothing is skipped', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, skippable);

      const result = await undoRoutineSkip(db, created.id, '2026-07-01', '2026-07-01');

      expect(result.writtenEvents).toEqual([]);
      expect(await listRoutineEvents(db, created.id)).toEqual([]);

      sqlite.close();
    });
  });

  describe('joker earning', () => {
    it('earns a joker on the fifth successful completion', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      for (let day = 1; day <= 5; day++) {
        const date = `2026-07-0${day}`;
        await completeRoutineOccurrence(db, created.id, date, date);
      }

      expect(await getRoutineStateCache(db, created.id)).toMatchObject({
        jokerInventory: 1,
        jokerProgress: 0,
      });

      sqlite.close();
    });

    // A retroactive completion adds to jokerProgress without ever writing the
    // joker_earned that resets it, so the counter can overshoot 5. A strict
    // `=== 5` check then never matched again and the routine stopped earning
    // jokers permanently; the threshold check must heal instead.
    it('still earns a joker after a retroactive completion pushed progress past the threshold', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const created = await createRoutine(db, baseInput);

      // 2026-07-01 is missed; 07-02..07-05 are completed directly.
      await appendRoutineEvent(db, {
        routineId: created.id,
        occurrenceDate: '2026-07-01',
        eventType: 'missed',
      });
      for (let day = 2; day <= 5; day++) {
        const date = `2026-07-0${day}`;
        await completeRoutineOccurrence(db, created.id, date, date);
      }
      // Filling the gap retroactively takes the run to five completions
      // without a joker_earned event, so jokerProgress lands on 5 unreset.
      await retroactivelyCompleteOccurrence(db, created.id, '2026-07-01', '2026-07-05');
      expect(await getRoutineStateCache(db, created.id)).toMatchObject({ jokerInventory: 0 });

      await completeRoutineOccurrence(db, created.id, '2026-07-06', '2026-07-06');

      const cache = await getRoutineStateCache(db, created.id);
      expect(cache).toMatchObject({ jokerInventory: 1, jokerProgress: 0 });

      sqlite.close();
    });
  });
});
