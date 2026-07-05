// Dev-only seed script (T047). Run via `npm run seed:dev`. Populates a
// fresh SQLite file with representative routines (including one just
// short of a joker and one just short of a level-up) and tasks across all
// five Tasks-screen sections, for fast manual testing on an emulator.
//
// This file is invoked directly via tsx, never imported by any app runtime
// code — it structurally cannot ship in a release build (see TASKS.md's
// T047), so it intentionally bypasses the repository/service layer's
// `expo-crypto`-based id generation (unavailable outside the Expo runtime)
// in favor of Node's own `crypto.randomUUID`, and reads the migration SQL
// straight off disk instead of importing the Metro-bundled
// `migrations/migrations.js` (whose `.sql` imports rely on a bundler-only
// loader that plain Node/tsx doesn't have).

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '../src/data/db/schema';
import { runPendingMigrations, type MigrationDriver, type MigrationsData } from '../src/data/db/migrationRunner';
import { addDaysToDateString, todayDateString } from '../src/domain/dates';
import { generateSuggestedWeeklyTargetWeekdays } from '../src/domain/routines/schedule';
import { JOKER_EARN_THRESHOLD, LEVEL_SEGMENT_SIZE, replayRoutineStreak } from '../src/domain/streaks/replay';

const ANDROID_PACKAGE = 'com.habithelper.app';
const DB_FILE_NAME = 'habithelper.db';
const OUTPUT_PATH = resolve(__dirname, '../.dev-seed', DB_FILE_NAME);
const MIGRATIONS_DIR = resolve(__dirname, '../migrations');

function loadMigrationsData(): MigrationsData {
  const journal = JSON.parse(readFileSync(resolve(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'));
  const migrations: Record<string, string> = {};
  for (const entry of journal.entries as { idx: number; tag: string }[]) {
    const key = `m${String(entry.idx).padStart(4, '0')}`;
    migrations[key] = readFileSync(resolve(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8');
  }
  return { journal, migrations };
}

// Mirrors src/data/db/testUtils.ts's driver, the one place that already
// adapts better-sqlite3 to this interface for Jest — duplicated here (not
// imported) because that file lives under a path Jest resolves but which
// pulls in no bundler-only assets, whereas this script must avoid the
// migrations.js import for the reason explained above.
function createDriver(sqlite: Database.Database): MigrationDriver {
  return {
    execAsync: async (sql) => {
      sqlite.exec(sql);
    },
    runAsync: async (sql, params) => {
      sqlite.prepare(sql).run(...params);
    },
    getAllAsync: async <T>(sql: string) => sqlite.prepare(sql).all() as T[],
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

function nowIso(): string {
  return new Date().toISOString();
}

function insertCategory(db: SeedDb, name: string, baseColor: string): typeof schema.category.$inferSelect {
  const timestamp = nowIso();
  const row = { id: randomUUID(), name, baseColor, createdAt: timestamp, updatedAt: timestamp };
  db.insert(schema.category).values(row).run();
  return row;
}

interface RoutineSeed {
  name: string;
  categoryId: string | null;
  scheduleType: schema.ScheduleType;
  scheduledWeekdays?: number[] | null;
  weeklyTargetCount?: number | null;
  isPaused?: boolean;
  createdAt: string;
}

function insertRoutine(db: SeedDb, seed: RoutineSeed): typeof schema.routine.$inferSelect {
  const timestamp = nowIso();
  const row: typeof schema.routine.$inferSelect = {
    id: randomUUID(),
    name: seed.name,
    categoryId: seed.categoryId,
    scheduleType: seed.scheduleType,
    scheduledWeekdays: seed.scheduledWeekdays ?? null,
    weeklyTargetCount: seed.weeklyTargetCount ?? null,
    timeOfDay: null,
    reason: null,
    allowConsciousSkip: true,
    isPaused: seed.isPaused ?? false,
    sortOrder: 0,
    colorVariantSeed: Math.floor(Math.random() * 1000),
    createdAt: seed.createdAt,
    updatedAt: timestamp,
    deletedAt: null,
  };
  db.insert(schema.routine).values(row).run();
  return row;
}

function insertRoutineEvent(
  db: SeedDb,
  routineId: string,
  occurrenceDate: string,
  eventType: schema.RoutineEventType,
): typeof schema.routineEvent.$inferSelect {
  const row: typeof schema.routineEvent.$inferSelect = {
    id: randomUUID(),
    routineId,
    occurrenceDate,
    eventType,
    recordedAt: nowIso(),
    movedToDate: null,
    skipReason: null,
    supersededByEventId: null,
  };
  db.insert(schema.routineEvent).values(row).run();
  return row;
}

/**
 * Seeds a daily routine with `completionCount` consecutive completions
 * ending on `endDate` (inclusive), plus the `joker_earned` events the real
 * completion action (src/services/routineService.ts) would have written
 * along the way — since this script bypasses that service (see module
 * comment), it replays the same threshold check itself. Finishes by
 * persisting the routine's cache directly, matching what app-startup
 * reconciliation (T038) would independently derive, so the seeded state is
 * correct immediately on first open, not just after a reconcile pass.
 */
function seedDailyRoutineWithStreak(
  db: SeedDb,
  options: { name: string; categoryId: string | null; completionCount: number; endDate: string },
): void {
  const startDate = addDaysToDateString(options.endDate, -(options.completionCount - 1));
  const routine = insertRoutine(db, {
    name: options.name,
    categoryId: options.categoryId,
    scheduleType: 'daily',
    createdAt: new Date(`${startDate}T08:00:00.000Z`).toISOString(),
  });

  const events: { occurrenceDate: string; eventType: schema.RoutineEventType }[] = [];
  for (let i = 0; i < options.completionCount; i++) {
    const date = addDaysToDateString(startDate, i);
    events.push({ occurrenceDate: date, eventType: 'completed' });
    insertRoutineEvent(db, routine.id, date, 'completed');

    const state = replayRoutineStreak(events);
    if (state.jokerProgress === JOKER_EARN_THRESHOLD && state.currentStreak < LEVEL_SEGMENT_SIZE) {
      events.push({ occurrenceDate: date, eventType: 'joker_earned' });
      insertRoutineEvent(db, routine.id, date, 'joker_earned');
    }
  }

  const finalState = replayRoutineStreak(events);
  const cache: typeof schema.routineStateCache.$inferSelect = {
    routineId: routine.id,
    currentStreak: finalState.currentStreak,
    bestStreak: finalState.bestStreak,
    totalCompletions: finalState.totalCompletions,
    levelRank: finalState.levelRank,
    jokerInventory: finalState.jokerInventory,
    jokerProgress: finalState.jokerProgress,
    consecutiveMissedAfter66: finalState.consecutiveMissedAfter66,
    reconciledThroughDate: options.endDate,
    recalculatedAt: nowIso(),
  };
  db.insert(schema.routineStateCache).values(cache).run();
}

function insertTask(
  db: SeedDb,
  options: {
    title: string;
    categoryId?: string | null;
    date?: string | null;
    timeOfDay?: string | null;
    isCompleted?: boolean;
    completedAt?: string | null;
  },
): void {
  const timestamp = nowIso();
  const row: typeof schema.task.$inferSelect = {
    id: randomUUID(),
    title: options.title,
    categoryId: options.categoryId ?? null,
    date: options.date ?? null,
    timeOfDay: options.timeOfDay ?? null,
    description: null,
    isCompleted: options.isCompleted ?? false,
    completedAt: options.completedAt ?? null,
    sortOrder: 0,
    colorVariantSeed: Math.floor(Math.random() * 1000),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  db.insert(schema.task).values(row).run();
}

async function main(): Promise<void> {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  if (existsSync(OUTPUT_PATH)) {
    unlinkSync(OUTPUT_PATH);
  }

  const sqlite = new Database(OUTPUT_PATH);
  sqlite.pragma('foreign_keys = ON');
  await runPendingMigrations(createDriver(sqlite), loadMigrationsData());

  const db = drizzle(sqlite, { schema });

  const sport = insertCategory(db, 'Sport', '#8FBFA0');
  const household = insertCategory(db, 'Haushalt', '#A9A0D6');
  const work = insertCategory(db, 'Arbeit', '#F0A868');

  const today = todayDateString();
  const yesterday = addDaysToDateString(today, -1);

  // One completion short of earning a joker (5th completion).
  seedDailyRoutineWithStreak(db, {
    name: 'Laufen',
    categoryId: sport.id,
    completionCount: 4,
    endDate: yesterday,
  });

  // One completion short of leveling up (66th completion, "Stabil").
  seedDailyRoutineWithStreak(db, {
    name: 'Meditieren',
    categoryId: null,
    completionCount: LEVEL_SEGMENT_SIZE - 1,
    endDate: yesterday,
  });

  // Schedule-type variety, no history needed.
  insertRoutine(db, {
    name: 'Yoga',
    categoryId: sport.id,
    scheduleType: 'weekdays',
    scheduledWeekdays: [1, 3, 5],
    createdAt: nowIso(),
  });
  const weeklyTargetCount = 3;
  insertRoutine(db, {
    name: 'Lesen',
    categoryId: household.id,
    scheduleType: 'weekly_target',
    scheduledWeekdays: generateSuggestedWeeklyTargetWeekdays(weeklyTargetCount),
    weeklyTargetCount,
    createdAt: nowIso(),
  });
  insertRoutine(db, {
    name: 'Journaling',
    categoryId: null,
    scheduleType: 'daily',
    isPaused: true,
    createdAt: nowIso(),
  });

  // Tasks across all five Tasks-screen sections.
  insertTask(db, { title: 'Rechnung bezahlen', categoryId: work.id, date: addDaysToDateString(today, -3) });
  insertTask(db, { title: 'Einkaufen', categoryId: household.id, date: today, timeOfDay: '17:00' });
  insertTask(db, { title: 'Zahnarzttermin', date: addDaysToDateString(today, 5), timeOfDay: '09:30' });
  insertTask(db, { title: 'Buch zu Ende lesen', categoryId: household.id });
  insertTask(db, {
    title: 'Müll rausbringen',
    date: addDaysToDateString(today, -1),
    isCompleted: true,
    completedAt: new Date(`${addDaysToDateString(today, -1)}T20:00:00.000Z`).toISOString(),
  });

  sqlite.close();

  console.log(`Seed database written to ${OUTPUT_PATH}`);
  console.log('');
  console.log('Push it onto a running emulator/device (debug build only) with:');
  console.log(`  adb push "${OUTPUT_PATH}" /data/local/tmp/${DB_FILE_NAME}`);
  console.log(`  adb shell run-as ${ANDROID_PACKAGE} mkdir -p files/SQLite`);
  console.log(
    `  adb shell run-as ${ANDROID_PACKAGE} cp /data/local/tmp/${DB_FILE_NAME} files/SQLite/${DB_FILE_NAME}`,
  );
  console.log('Then force-stop and reopen the app.');
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});
