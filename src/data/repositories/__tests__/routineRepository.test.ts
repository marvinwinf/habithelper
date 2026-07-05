import { eq } from 'drizzle-orm';
import { createDrizzleTestDb } from '../../db/testUtils';
import { routineEvent } from '../../db/schema';
import {
  RoutineNotFoundError,
  createRoutine,
  getRoutine,
  listRoutines,
  softDeleteRoutine,
  updateRoutine,
} from '../routineRepository';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `test-routine-id-${counter++}`),
  };
});

const baseInput = {
  name: 'Laufen',
  scheduleType: 'daily' as const,
  allowConsciousSkip: false,
  sortOrder: 0,
  colorVariantSeed: 0,
};

describe('routineRepository', () => {
  it('creates a routine with a generated id, active and not paused', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    const created = await createRoutine(db, baseInput);

    expect(created.id).toBe('test-routine-id-0');
    expect(created.name).toBe('Laufen');
    expect(created.isPaused).toBe(false);
    expect(created.deletedAt).toBeNull();
    expect(created.createdAt).toBe(created.updatedAt);

    sqlite.close();
  });

  it('reads a routine by id, and undefined for an unknown id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    expect(await getRoutine(db, created.id)).toEqual(created);
    expect(await getRoutine(db, 'does-not-exist')).toBeUndefined();

    sqlite.close();
  });

  it('lists routines, excluding soft-deleted ones by default', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const active = await createRoutine(db, { ...baseInput, name: 'Aktiv' });
    const deleted = await createRoutine(db, { ...baseInput, name: 'Geloescht' });
    await softDeleteRoutine(db, deleted.id);

    const listed = await listRoutines(db);
    expect(listed.map((r) => r.id)).toEqual([active.id]);

    const withDeleted = await listRoutines(db, { includeDeleted: true });
    expect(withDeleted.map((r) => r.id).sort()).toEqual([active.id, deleted.id].sort());

    sqlite.close();
  });

  it('updates editable fields, including isPaused, without changing id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    const updated = await updateRoutine(db, created.id, { name: 'Laufen (neu)', isPaused: true });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Laufen (neu)');
    expect(updated.isPaused).toBe(true);

    sqlite.close();
  });

  it('throws when updating an unknown routine', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(updateRoutine(db, 'does-not-exist', { name: 'X' })).rejects.toThrow(
      RoutineNotFoundError,
    );

    sqlite.close();
  });

  it('soft-deletes a routine, preserving its row and id', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    await softDeleteRoutine(db, created.id);

    const afterDelete = await getRoutine(db, created.id);
    expect(afterDelete?.id).toBe(created.id);
    expect(afterDelete?.deletedAt).not.toBeNull();

    sqlite.close();
  });

  it('throws when soft-deleting an unknown routine', async () => {
    const { db, sqlite } = await createDrizzleTestDb();

    await expect(softDeleteRoutine(db, 'does-not-exist')).rejects.toThrow(RoutineNotFoundError);

    sqlite.close();
  });

  it('renaming a routine does not change its id, and existing routine_event.routine_id references remain valid', async () => {
    const { db, sqlite } = await createDrizzleTestDb();
    const created = await createRoutine(db, baseInput);

    const now = new Date().toISOString();
    await db.insert(routineEvent).values({
      id: 'test-event-id',
      routineId: created.id,
      occurrenceDate: '2026-07-01',
      eventType: 'completed',
      recordedAt: now,
    });

    const renamed = await updateRoutine(db, created.id, { name: 'Joggen' });

    expect(renamed.id).toBe(created.id);

    const [linkedEvent] = await db
      .select()
      .from(routineEvent)
      .where(eq(routineEvent.id, 'test-event-id'));
    expect(linkedEvent.routineId).toBe(created.id);

    const routineViaEvent = await getRoutine(db, linkedEvent.routineId);
    expect(routineViaEvent?.name).toBe('Joggen');

    sqlite.close();
  });
});
