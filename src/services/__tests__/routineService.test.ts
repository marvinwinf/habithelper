import { createDrizzleTestDb } from '../../data/db/testUtils';
import { getRoutine } from '../../data/repositories/routineRepository';
import { appendRoutineEvent, listRoutineEvents } from '../../data/repositories/routineEventRepository';
import { ConsciousSkipNotAllowedError } from '../../domain/routines/completion';
import {
  RoutineNotFoundError,
  completeRoutineOccurrence,
  createRoutine,
  exceedRoutineOccurrence,
  moveRoutineOccurrence,
  pauseRoutine,
  reactivateRoutine,
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
});
