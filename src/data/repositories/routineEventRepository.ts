import { randomUUID } from 'expo-crypto';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { routineEvent, type RoutineEventType } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type RoutineEventDb = BaseSQLiteDatabase<'sync', unknown, { routineEvent: typeof routineEvent }>;

export type RoutineEvent = typeof routineEvent.$inferSelect;

export interface RoutineEventInput {
  routineId: string;
  occurrenceDate: string;
  eventType: RoutineEventType;
  movedToDate?: string | null;
  skipReason?: string | null;
}

/**
 * Appends a new routine event with a freshly generated, stable `id`. This is
 * the only way new event data enters `routine_event` — rows are never
 * updated in place once written (docs/DATA_MODEL.md); a retroactive edit
 * instead supersedes a prior row via `supersedeRoutineEvent` below, it never
 * rewrites this one.
 */
export async function appendRoutineEvent(
  db: RoutineEventDb,
  input: RoutineEventInput,
): Promise<RoutineEvent> {
  const created: RoutineEvent = {
    id: randomUUID(),
    routineId: input.routineId,
    occurrenceDate: input.occurrenceDate,
    eventType: input.eventType,
    recordedAt: new Date().toISOString(),
    movedToDate: input.movedToDate ?? null,
    skipReason: input.skipReason ?? null,
    supersededByEventId: null,
  };
  await db.insert(routineEvent).values(created);
  return created;
}

/**
 * Marks a prior event as superseded by a newly written one, per a
 * retroactive completion (see `src/domain/routines/retroactive.ts`). The one
 * narrow, documented exception to the append-only rule: it sets only
 * `supersededByEventId`, never the superseded row's original event data
 * (`eventType`, `occurrenceDate`, etc. are untouched).
 */
export async function supersedeRoutineEvent(
  db: RoutineEventDb,
  id: string,
  supersededByEventId: string,
): Promise<void> {
  await db.update(routineEvent).set({ supersededByEventId }).where(eq(routineEvent.id, id));
}

/** All events for a routine, ordered by the occurrence date they apply to. */
export async function listRoutineEvents(
  db: RoutineEventDb,
  routineId: string,
): Promise<RoutineEvent[]> {
  return db
    .select()
    .from(routineEvent)
    .where(eq(routineEvent.routineId, routineId))
    .orderBy(asc(routineEvent.occurrenceDate));
}

/** A routine's events whose `occurrenceDate` falls within `[startDate, endDate]` (inclusive), ordered ascending. */
export async function listRoutineEventsInRange(
  db: RoutineEventDb,
  routineId: string,
  startDate: string,
  endDate: string,
): Promise<RoutineEvent[]> {
  return db
    .select()
    .from(routineEvent)
    .where(
      and(
        eq(routineEvent.routineId, routineId),
        gte(routineEvent.occurrenceDate, startDate),
        lte(routineEvent.occurrenceDate, endDate),
      ),
    )
    .orderBy(asc(routineEvent.occurrenceDate));
}
