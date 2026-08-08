import { createDrizzleTestDb } from '../../db/testUtils';
import { createRoutine } from '../routineRepository';
import {
  appendRoutineEvent,
  listRoutineEvents,
  listRoutineEventsInRange,
  listRoutineEventsInRangeForRoutines,
  supersedeRoutineEvent,
} from '../routineEventRepository';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-id-${counter++}`),
  };
});

const routineInput = {
  name: 'Lesen',
  scheduleType: 'daily' as const,
  allowConsciousSkip: false,
  sortOrder: 0,
  colorVariantSeed: 0,
};

describe('routineEventRepository', () => {
  it('appends an event with a generated id and recordedAt', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, routineInput);

    const event = await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });

    expect(event.id).toBeTruthy();
    expect(event.routineId).toBe(routine.id);
    expect(event.occurrenceDate).toBe('2026-07-01');
    expect(event.eventType).toBe('completed');
    expect(event.recordedAt).toBeTruthy();
    expect(event.supersededByEventId).toBeNull();

    sqlite.close();
  });

  it('lists a routine\'s events ordered by occurrence date', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, routineInput);

    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-03',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-02',
      eventType: 'missed',
    });

    const events = await listRoutineEvents(db, routine.id);

    expect(events.map((e) => e.occurrenceDate)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);

    sqlite.close();
  });

  it('only returns another routine\'s events when queried by its own id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routineA = await createRoutine(db, { ...routineInput, name: 'A' });
    const routineB = await createRoutine(db, { ...routineInput, name: 'B' });

    await appendRoutineEvent(db, {
      routineId: routineA.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routineB.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });

    const eventsForA = await listRoutineEvents(db, routineA.id);
    expect(eventsForA).toHaveLength(1);
    expect(eventsForA[0].routineId).toBe(routineA.id);

    sqlite.close();
  });

  it('lists events within a date range, inclusive of both ends', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, routineInput);

    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-06-30',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-05',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-06',
      eventType: 'completed',
    });

    const inRange = await listRoutineEventsInRange(db, routine.id, '2026-07-01', '2026-07-05');

    expect(inRange.map((e) => e.occurrenceDate)).toEqual(['2026-07-01', '2026-07-05']);

    sqlite.close();
  });

  it('never updates an existing event row in place when new events are appended', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, routineInput);

    const first = await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });
    await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-02',
      eventType: 'missed',
    });

    const events = await listRoutineEvents(db, routine.id);
    const stillFirst = events.find((e) => e.id === first.id);

    expect(stillFirst).toEqual(first);

    sqlite.close();
  });

  it('marks a prior event as superseded without altering its other fields', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const routine = await createRoutine(db, routineInput);

    const original = await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'missed',
    });
    const supersedingEvent = await appendRoutineEvent(db, {
      routineId: routine.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
    });

    await supersedeRoutineEvent(db, original.id, supersedingEvent.id);

    const events = await listRoutineEvents(db, routine.id);
    const supersededRow = events.find((e) => e.id === original.id);

    expect(supersededRow).toEqual({ ...original, supersededByEventId: supersedingEvent.id });

    sqlite.close();
  });

  describe('listRoutineEventsInRangeForRoutines', () => {
    it('groups events by routine in a single query', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const first = await createRoutine(db, routineInput);
      const second = await createRoutine(db, { ...routineInput, name: 'Laufen' });

      await appendRoutineEvent(db, {
        routineId: first.id,
        occurrenceDate: '2026-07-02',
        eventType: 'completed',
      });
      await appendRoutineEvent(db, {
        routineId: second.id,
        occurrenceDate: '2026-07-02',
        eventType: 'skipped',
      });

      const grouped = await listRoutineEventsInRangeForRoutines(
        db,
        [first.id, second.id],
        '2026-07-01',
        '2026-07-03',
      );

      expect(grouped[first.id].map((e) => e.eventType)).toEqual(['completed']);
      expect(grouped[second.id].map((e) => e.eventType)).toEqual(['skipped']);

      sqlite.close();
    });

    it('returns an empty array for a routine with no events in range', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const routine = await createRoutine(db, routineInput);
      await appendRoutineEvent(db, {
        routineId: routine.id,
        occurrenceDate: '2026-06-01',
        eventType: 'completed',
      });

      const grouped = await listRoutineEventsInRangeForRoutines(
        db,
        [routine.id],
        '2026-07-01',
        '2026-07-03',
      );

      // Callers index straight into the result, so every requested id must be
      // present even when it has nothing in range.
      expect(grouped[routine.id]).toEqual([]);

      sqlite.close();
    });

    it('excludes routines that were not requested', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const requested = await createRoutine(db, routineInput);
      const other = await createRoutine(db, { ...routineInput, name: 'Laufen' });
      await appendRoutineEvent(db, {
        routineId: other.id,
        occurrenceDate: '2026-07-02',
        eventType: 'completed',
      });

      const grouped = await listRoutineEventsInRangeForRoutines(
        db,
        [requested.id],
        '2026-07-01',
        '2026-07-03',
      );

      expect(Object.keys(grouped)).toEqual([requested.id]);

      sqlite.close();
    });

    it('respects the date range boundaries inclusively', async () => {
      const { db, sqlite } = await createDrizzleTestDb();
      const routine = await createRoutine(db, routineInput);
      for (const occurrenceDate of ['2026-06-30', '2026-07-01', '2026-07-03', '2026-07-04']) {
        await appendRoutineEvent(db, { routineId: routine.id, occurrenceDate, eventType: 'completed' });
      }

      const grouped = await listRoutineEventsInRangeForRoutines(
        db,
        [routine.id],
        '2026-07-01',
        '2026-07-03',
      );

      expect(grouped[routine.id].map((e) => e.occurrenceDate)).toEqual(['2026-07-01', '2026-07-03']);

      sqlite.close();
    });

    it('returns an empty grouping without querying for an empty id list', async () => {
      const { db, sqlite } = await createDrizzleTestDb();

      expect(await listRoutineEventsInRangeForRoutines(db, [], '2026-07-01', '2026-07-03')).toEqual(
        {},
      );

      sqlite.close();
    });
  });
});
