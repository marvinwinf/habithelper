import { createDrizzleTestDb } from '../../db/testUtils';
import { createRoutine } from '../routineRepository';
import {
  appendRoutineEvent,
  listRoutineEvents,
  listRoutineEventsInRange,
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
});
