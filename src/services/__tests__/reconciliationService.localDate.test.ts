import { eq } from 'drizzle-orm';
import { createDrizzleTestDb } from '../../data/db/testUtils';
import { routine } from '../../data/db/schema';
import { listRoutineEvents } from '../../data/repositories/routineEventRepository';
import { createRoutine } from '../routineService';
import { reconcileRoutine } from '../reconciliationService';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-id-${counter++}`),
  };
});

// Jest pins the process timezone to UTC, so a real non-UTC device cannot be
// reproduced by setting process.env.TZ inside a test. Instead only the local-
// date conversion `reconciliationService` depends on is stubbed, shifting it
// two hours east of UTC — exactly the device a Central European user has in
// summer. Everything else in the module keeps its real behavior (the internal
// calls inside `addDaysToDateString`/`todayDateString` bind to the real
// implementation, not this stub).
const HOURS_EAST_OF_UTC = 2;

jest.mock('../../domain/dates', () => {
  const actual = jest.requireActual('../../domain/dates');
  return {
    ...actual,
    toLocalDateString: (date: Date) =>
      actual.toLocalDateString(new Date(date.getTime() + HOURS_EAST_OF_UTC * 60 * 60 * 1000)),
  };
});

const baseInput = {
  name: 'Laufen',
  scheduleType: 'daily' as const,
  allowConsciousSkip: false,
  colorVariantSeed: 0,
};

async function createRoutineCreatedAt(
  db: Awaited<ReturnType<typeof createDrizzleTestDb>>['db'],
  createdAt: string,
): Promise<string> {
  const created = await createRoutine(db, baseInput);
  await db.update(routine).set({ createdAt }).where(eq(routine.id, created.id));
  return created.id;
}

// `created_at` is stored as a UTC timestamp, but every routine rule is about
// the user's LOCAL calendar day (docs/DATA_MODEL.md: "created_at date is the
// start"). Seeding the reconciliation watermark by slicing the UTC date part
// out of it was a day early for anyone east of UTC who created a routine just
// after local midnight: the first reconciliation invented a `missed` event for
// a day the routine did not exist on, breaking its streak before the first
// completion — and invisibly, since the detail calendar renders days before
// the start date as not_due.
describe('reconcileRoutine on a device east of UTC', () => {
  it('never reconciles a day before the routine\'s local creation date', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    // 23:30Z on 2026-07-02 is already 2026-07-03 locally.
    const routineId = await createRoutineCreatedAt(db, '2026-07-02T23:30:00.000Z');

    await reconcileRoutine(db, routineId, '2026-07-04');

    const events = await listRoutineEvents(db, routineId);
    expect(events.map((event) => event.occurrenceDate)).toEqual(['2026-07-03']);

    sqlite.close();
  });

  it('still reconciles the local creation day itself once it has elapsed', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    // 08:00Z on 2026-07-02 is 2026-07-02 locally too — the ordinary case.
    const routineId = await createRoutineCreatedAt(db, '2026-07-02T08:00:00.000Z');

    await reconcileRoutine(db, routineId, '2026-07-04');

    const events = await listRoutineEvents(db, routineId);
    expect(events.map((event) => event.occurrenceDate)).toEqual(['2026-07-02', '2026-07-03']);

    sqlite.close();
  });
});
