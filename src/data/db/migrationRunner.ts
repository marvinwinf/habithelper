// Applies pending migrations and records each as it applies, tracked via the
// app's own `schema_migrations` table (docs/DATA_MODEL.md's Schema
// Versioning section) rather than Drizzle's internal migration tracker —
// `version` must match the numeric prefix of the migration file so it can
// later back the backup manifest's `schemaVersion` (docs/ARCHITECTURE.md).
//
// Driven through a small driver interface (not expo-sqlite directly) so this
// logic can be unit-tested against a real SQLite engine in Jest: expo-sqlite
// cannot run under Jest (see docs/TEST_STRATEGY.md and migrate.test.ts).

export interface MigrationDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: (string | number)[]): Promise<void>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface MigrationsData {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
}

export async function runPendingMigrations(
  driver: MigrationDriver,
  migrationsData: MigrationsData,
): Promise<void> {
  const applied = await getAppliedVersions(driver);
  const entries = [...migrationsData.journal.entries].sort((a, b) => a.idx - b.idx);

  for (const entry of entries) {
    const version = entry.idx;
    if (applied.has(version)) {
      continue;
    }

    const key = `m${String(entry.idx).padStart(4, '0')}`;
    const sql = migrationsData.migrations[key];
    if (!sql) {
      throw new Error(`Missing migration SQL for ${entry.tag}`);
    }

    const statements = sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);

    // One transaction per migration: a crash mid-migration rolls back only
    // this migration, and it is retried whole on the next launch.
    await driver.withTransactionAsync(async () => {
      for (const statement of statements) {
        await driver.execAsync(statement);
      }
      await driver.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        version,
        new Date().toISOString(),
      ]);
    });
  }
}

async function getAppliedVersions(driver: MigrationDriver): Promise<Set<number>> {
  const tables = await driver.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
  );
  if (tables.length === 0) {
    // First-ever launch: schema_migrations doesn't exist until migration 0
    // creates it, so no migration can have been recorded yet.
    return new Set();
  }

  const rows = await driver.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations',
  );
  return new Set(rows.map((row) => row.version));
}
