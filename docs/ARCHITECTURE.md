# Architecture

This document defines the technical architecture for the Android MVP. It implements the principles in `PROJECT_PRINCIPLES.md`, the persistence requirements in `DATA_PERSISTENCE.md`, and the scope in `MVP_SCOPE.md`. No application code is implied to exist yet; this is the target shape for `IMPLEMENTATION_PLAN.md` and `TASKS.md` to build toward.

## Application Structure

Single Expo-managed React Native project, TypeScript strict mode, single codebase (no platform-specific forks in the MVP beyond what Expo/RN already abstracts).

```
app/                        # Expo Router routes (screens only, thin)
  (tabs)/
    today.tsx
    routines.tsx
    tasks.tsx
    settings.tsx
  routine/[id].tsx           # Routine detail
  routine/create.tsx
  task/create.tsx
  category/create.tsx
  _layout.tsx
src/
  domain/                    # Pure business logic, no React, no RN imports
    routines/                # scheduling, streaks, jokers, levels
    tasks/
    categories/
    streaks/
  data/
    db/                      # SQLite client, schema, migrations
    repositories/            # CRUD + query surface over db, one per entity
    backup/                  # export/import/validate
  services/                  # orchestration layer between domain + repositories
  state/                     # app state (see State Management)
  ui/
    components/              # design-system primitives (Card, Button, ProgressBar…)
    theme/                   # tokens: color, spacing, radius, typography
    animation/
  utils/
  types/                     # shared TS types not owned by domain/data
docs/
migrations/                  # SQL or migration-object files, versioned, immutable once merged
__tests__/ or *.test.ts colocated (see TEST_STRATEGY.md)
```

Rule: `app/` (screens) may import from `src/state`, `src/ui`, `src/services`. Screens must not import `src/data/db` or write raw SQL directly. `src/domain` must not import React, React Native, or Expo modules — it stays pure TypeScript so it is trivially unit-testable and portable.

## Navigation

- **Library:** Expo Router (file-based, built on React Navigation). Maintained, first-party Expo integration, avoids hand-wiring React Navigation stacks.
- **Structure:** one bottom tab navigator (`Heute`, `Routinen`, `Aufgaben`, `Einstellungen`) per `SCREEN_SPECIFICATIONS.md`, plus modal/stack routes for create flows and routine detail pushed on top.
- The floating create button is a custom component rendered above the tab bar (not a fifth tab), opening a type-selection sheet, per spec.
- No deep linking, no universal links, no auth-gated routes in the MVP — navigation stays flat and fully local.

## State Management

Two distinct kinds of state, kept deliberately separate:

1. **Server/persisted state** (routines, tasks, categories, events): owned by repositories, exposed to the UI through a thin query layer using **TanStack Query** (React Query) with the SQLite repositories as the "fetcher." This gives caching, invalidation, and optimistic updates for free without inventing a bespoke store, and keeps screens declarative (`useRoutines()`, `useTasksForToday()`).
2. **Ephemeral UI state** (form drafts, sheet open/closed, selected tab filter): local `useState`/`useReducer` in components. No global client-state library (Redux/Zustand) is introduced for this in the MVP — there isn't enough cross-screen ephemeral state to justify it. If that changes, Zustand is the fallback (small, no boilerplate) — not a decision needed now.

Mutations (complete routine, create task, etc.) go through `src/services`, which call repositories and then invalidate the relevant React Query keys. This keeps recalculation (streaks, levels) server-side (in `src/domain`), not duplicated in UI state.

## Local Database Approach

- **Engine:** `expo-sqlite`, using its async API with **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) as the schema/query layer.
  - Rationale: Drizzle is lightweight, TypeScript-first, generates typed queries from a schema file (single source of truth for `DATA_MODEL.md` entities), and has first-class `expo-sqlite` support and a migration generator. It avoids hand-writing raw SQL for every query while staying far lighter than a full ORM like WatermelonDB, and it does not lock the project into a sync engine we don't need.
  - Alternative considered: raw `expo-sqlite` with hand-written SQL and a custom migration runner. Rejected only because it increases boilerplate per entity; revisit if Drizzle's `expo-sqlite` driver proves immature.
- One database file, opened once at app startup, connection held in a singleton module (`src/data/db/client.ts`).
- All entity tables and indexes are defined in `src/data/db/schema.ts`, imported by both the app and Drizzle Kit's migration generator.

## Migration Strategy

- Every schema change is an explicit, numbered migration file under `migrations/`, generated via `drizzle-kit generate` and committed to version control — never hand-edited after merge.
- A `schema_migrations` table (or Drizzle's own migration-tracking table) records applied migration IDs; on startup the app runs any migrations not yet applied, in order, inside a transaction per migration.
- Migrations never `DROP TABLE`/recreate the database to resolve a schema conflict. Additive changes (new column with default, new table) are preferred; destructive changes (column removal, type change) require an explicit data-preserving transform (e.g., new column + backfill + old column drop in a later, separate migration).
- Each migration ships with a migration test (see `TEST_STRATEGY.md`) that seeds a database at the prior schema version, runs the migration, and asserts data survives and new invariants hold.
- Interrupted migrations: because each migration runs in its own transaction, a crash mid-migration rolls back that migration entirely; the app retries it on next launch. This is verified by a dedicated test (kill-and-resume simulation).
- App startup sequence: open DB → run pending migrations → verify schema version matches expected → proceed to UI. If migration fails, the app shows a blocking recovery screen offering "restore last backup" rather than silently wiping data.

## Repository and Service Boundaries

- **Repository** (`src/data/repositories/*`): one per entity (RoutineRepository, TaskRepository, CategoryRepository, RoutineEventRepository, ProfileRepository, BackupRepository). Responsible only for CRUD and querying against the DB via Drizzle. No business rules.
- **Domain** (`src/domain/*`): pure functions that take entities/events as input and return derived results — e.g. `calculateStreak(events, today)`, `nextJokerThreshold(completionCount)`, `deriveOccurrencesForWeek(routine, week)`. No I/O.
- **Service** (`src/services/*`): orchestrates — calls repositories to load data, calls domain functions to compute results, calls repositories to persist new events, returns a result for the UI/query layer to consume. Example: `completeRoutineOccurrence(routineId, date, kind)` loads the routine + its events via repository, asks domain logic whether this triggers exceeded/joker/streak change, writes the completion event and any derived cache update, returns the updated view model.
- UI code never calls a repository directly for a mutation; it calls a service. UI code may call a repository-backed query hook (via React Query) directly for reads.

## Missed-Occurrence Reconciliation

`docs/ROUTINE_RULES.md` requires missed occurrences and joker usage to be stored as events (`docs/DATA_PERSISTENCE.md`), but "missing a day" is not a user action — nothing is tapped when a routine simply isn't completed. The architecture therefore needs an explicit mechanism that turns the passage of time into persisted events, distinct from the direct user-action events (complete, exceed, skip, move, pause, retroactive-complete) that `src/services/routineService.ts` already writes synchronously.

- **Domain function** (`src/domain/routines/reconcile.ts`): given a routine's schedule, its events up to a `reconciledThroughDate`, and "today," walks forward one due occurrence at a time from `reconciledThroughDate + 1` to yesterday (today itself is never reconciled — it isn't over yet) and, for each occurrence with no completion/skip/move, decides — using the joker inventory and post-66 tolerance state as they stood *at that point in the walk* — whether it is `joker_protected` (consumes a joker), tolerated under the post-66 window, or `missed` (breaks the streak). This must process occurrences strictly in order, since each decision changes the state the next decision depends on. It returns the ordered events to write plus the new `reconciledThroughDate`; it does not touch the database.
- **Service wiring**: a service function persists the returned events, advances `routine_state_cache.reconciled_through_date`, and then invokes the replay algorithm to refresh the cache — see Repository and Service Boundaries. This runs before the app displays any routine's streak/joker/level state, so the UI never reads stale data. Trigger points: app startup (all active routines) and whenever a routine detail screen is opened (that routine only, in case of a stale cache from a long-backgrounded app).
- `joker_earned` is not part of reconciliation — it is a direct, immediate consequence of a completion count crossing a multiple of 5, so it is written eagerly by the completion action itself, at the same time as the `completed`/`exceeded` event.
- `joker_restored` is also not part of reconciliation — it is a direct consequence of a retroactive completion superseding a previously-`joker_consumed` occurrence (see `docs/ROUTINE_RULES.md`), written by the retroactive-completion path in the service layer, not by the day-by-day reconciliation walk.
- The overall app streak has the same problem in miniature: whether a fully-elapsed day "breaks" `app_streak_cache` depends on whether any routine was actually completed that day, which can only be known after that day's routines have been reconciled. `app_streak_cache` therefore also carries a `reconciled_through_date` and is updated as part of the same reconciliation pass, once per elapsed day, across all routines. The exact reset behavior on a fully-missed day is an open product question — see `docs/IMPLEMENTATION_PLAN.md`'s Open Product Questions.

## Event and Cache Write Atomicity

Any service action that writes to `routine_event` and then updates `routine_state_cache` (or `app_streak_cache`) — whether a direct user action or a reconciliation pass — does both in a single SQLite transaction. This guarantees the cache can never be observably stale relative to the event log after a crash: either both writes land, or neither does, and a retry re-attempts the whole unit. This is a correctness requirement, not an optimization; a cache is only safe to treat as "always re-derivable" (see `docs/DATA_MODEL.md`) if it can never silently drift from its source events between a partial write and the next successful reconciliation.

## Backup and Restore Architecture

- **Export:** a service (`src/data/backup/export.ts`) serializes all persistent tables (per `DATA_PERSISTENCE.md`'s list) plus a manifest (`{ schemaVersion, exportedAt, appVersion }`) into a single JSON file, written via `expo-file-system` and shared out via `expo-sharing`.
- **Validate:** on import, the manifest is checked first — unsupported/future `schemaVersion` is rejected with a clear error before touching the database. Structural validation (required tables/fields present) runs before any write.
- **Automatic pre-import safety backup:** import always triggers an export-to-local-file step first (written to app-private storage, not user-facing), so a failed or unwanted import can be rolled back.
- **Import:** builds an entirely separate, fully-populated temp SQLite file from the validated backup (writes never touch the live file). The "swap" is a single atomic filesystem rename of the temp file over the live database path, performed only after the temp file is completely written and re-verified — never a row-by-row copy into the live database. This means a crash at any point before the rename leaves the live database completely untouched by construction, not merely by transaction rollback; the pre-import safety backup remains a second line of defense for the (much smaller) window around the rename itself.
- Backups are plain JSON (not a raw SQLite file copy) so they remain portable across schema migrations — an older backup can be upgraded through the same migration functions used for the live DB before being applied.

## Testing Setup

- **Unit tests (domain + services):** Jest (`jest-expo` preset). Pure `src/domain` logic is the highest-value, easiest-to-test layer — no mocking required.
- **Repository/migration tests:** Jest running against a real in-memory or temp-file SQLite instance (via `expo-sqlite`'s Node-compatible test path, or `better-sqlite3` as a same-SQL-dialect stand-in purely for migration tests if `expo-sqlite` cannot run outside Expo). Exact tooling choice is confirmed in the Phase 1 task (see `TASKS.md`), but the test *contract* — run every migration against fixture data, assert survival — is fixed now.
- **Component tests:** React Native Testing Library for critical interactive components (routine card completion, create forms).
- **E2E/manual:** No Detox/Maestro in the MVP (adds CI/device complexity disproportionate to a one-developer, one-device app); critical flows are covered instead by the mandatory manual test checklist per task, run on a real Android device/emulator. This can be revisited later if regressions in manual testing become frequent.
- All four checks — typecheck (`tsc --noEmit`), lint (ESLint), unit/component tests (Jest), and migration tests — must be runnable via single `npm`/`yarn` scripts so they can be chained in one command before any commit.

## Error Handling

- **Domain layer:** functions are total where feasible (no throwing on valid-but-unusual input); invalid input (e.g. malformed event ordering) throws a typed `DomainError` subtype, since this indicates a programming/data-integrity bug, not a user-recoverable case.
- **Repository/DB layer:** wraps SQLite errors into typed `DataError`s (`NotFoundError`, `ConstraintError`, `MigrationError`). Never leaks raw driver exceptions to the UI layer.
- **Service layer:** catches `DataError`/`DomainError`, decides user-facing consequence (e.g. retry, show inline message, block navigation).
- **UI layer:** React Query's error state drives inline, non-blocking error UI for reads; mutations show a toast/inline message on failure and leave prior state intact (no optimistic-update rollback bugs — optimistic updates are opt-in per mutation, not default).
- **Startup-critical failures** (DB open failure, migration failure): a dedicated full-screen recovery view, not a silent crash or blank screen — offers backup restore or (last resort) clean-slate with explicit user confirmation.
- No use of `try { } catch { }` swallowing; every catch block either handles the error meaningfully or rethrows a typed error.

## Animation and Design-System Approach

- **Design tokens** (`src/ui/theme/`): color palette (per category family, see `DESIGN_SYSTEM.md`), spacing scale, radius scale, typography scale — defined once as TypeScript constants, consumed by all `src/ui/components`. No inline magic numbers in screens.
- **Component library** (`src/ui/components/`): built before feature screens (see `IMPLEMENTATION_PLAN.md` phase ordering) — Card, Button, ProgressBar, Checkbox/CompletionControl, CategoryBadge, Sheet/Modal, EmptyState. Screens compose these; screens do not define their own styled primitives.
- **Animation library:** `react-native-reanimated` (already an Expo-maintained, standard choice) for short, interruptible animations (checkmark transition, progress fill, streak highlight, exceeded-completion emphasis). `expo-haptics` for haptic feedback triggers listed in `DESIGN_SYSTEM.md`.
- Animations are defined as small reusable hooks/components (`useCompletionAnimation`, `<StreakBurst />`) rather than inlined per screen, so the "short, non-blocking" constraint is enforced in one place.

## Future iOS Compatibility Considerations

Nothing in the MVP is Android-exclusive by necessity; the following choices are made specifically to keep iOS viable later without over-building now:

- Expo managed workflow (not bare/ejected) — keeps both platforms buildable from one config.
- `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-haptics` are all cross-platform Expo modules; no Android-only native module is introduced in the MVP.
- No Android-specific UI primitives (e.g. no raw `ToolbarAndroid`); layout uses cross-platform Flexbox/RN components throughout.
- Platform-specific styling, if ever needed, goes through RN's `Platform.select`/`.ios.tsx`/`.android.tsx` file conventions — not ad hoc `if (Platform.OS === 'android')` scattered in components.
- The local-profile model (`USER_MODEL.md`) and stable-ID scheme (`DATA_MODEL.md`) are chosen so that a future account/sync layer can be added additively (new tables/columns) rather than requiring a redesign.
- Testing is done on Android only in the MVP; no iOS simulator work, no App Store tooling, no iOS build config is introduced now — that is explicitly future scope per `ROADMAP.md`.
