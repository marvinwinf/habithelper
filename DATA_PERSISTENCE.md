# Data Persistence and Migration

## Core Requirement

User data must survive app updates, feature changes, schema changes, redesigns, and internal refactoring.

Users must never be required to recreate routines, restart streaks, or lose historical progress after an update.

## Persistent Data

Persistent data includes:

- local profile,
- routines,
- routine schedules,
- routine completion history,
- skip events,
- pause events,
- move events,
- joker usage,
- streak-relevant events,
- tasks,
- completed tasks,
- categories,
- level progress,
- settings,
- backup metadata.

## Versioned Migrations

Every database schema change must use an explicit versioned migration.

The production database must never be deleted or recreated solely because the schema changes.

Each migration must:

1. preserve existing data,
2. transform old data safely,
3. provide sensible defaults for new fields,
4. be idempotent where practical,
5. handle interrupted migration safely,
6. document source and target schema versions,
7. include automated migration tests.

## Source Events Over Derived Values

The app should store historical source events instead of only storing calculated values.

For example, routine completions, skips, pauses, moves, missed occurrences, joker usage, and retroactive edits should be stored as events.

Streaks, levels, totals, and progress bars should be derived from those events.

Derived values may be cached for performance, but the historical source must remain available for recalculation.

## Stable Identifiers

Persistent entities must use stable unique identifiers.

Identifiers must not depend on:

- list order,
- visible name,
- sorting,
- current screen state.

Renaming or reordering an item must not disconnect it from its history.

## Backup and Restore

The MVP must support:

- exporting one local backup file,
- importing one local backup file,
- automatically exporting a safety backup before import,
- validating backup compatibility,
- preserving data if an import fails.

## Migration Testing

Automated tests must cover at least:

- previous schema to current schema,
- routine preservation,
- task preservation,
- category preservation,
- event history preservation,
- streak recalculation,
- level recalculation,
- app startup after migration,
- failed import rollback behavior.
