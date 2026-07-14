# Data Model

This document defines the persistent schema implied by `DATA_PERSISTENCE.md`, `ROUTINE_RULES.md`, `MVP_SCOPE.md`, `USER_MODEL.md`, and `DESIGN_SYSTEM.md`. It is the source that `src/data/db/schema.ts` (see `ARCHITECTURE.md`) will implement in Phase 1. No tables are created yet.

## Conventions

- All primary keys are **stable, opaque string IDs** (UUID v4), generated client-side at creation time — never auto-increment integers, never derived from name/order/position. This satisfies the stable-identifier requirement: renaming or reordering never disconnects an item from its history.
- All tables have `created_at` and `updated_at` (ISO 8601 UTC strings, stored as TEXT — SQLite has no native datetime type).
- "Event" tables are append-only: rows are never updated or deleted by normal app logic (retroactive edits add compensating events, they don't mutate history — see Event History).
- Foreign keys reference the stable ID of the parent, enforced with SQLite foreign key constraints (`PRAGMA foreign_keys = ON`).

## Entities

### `profile`

The single local profile (see `USER_MODEL.md`).

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | stable, generated once at first launch |
| `display_name` | TEXT | user-editable |
| `created_at` | TEXT | |

Exactly one row in the MVP. Schema does not prevent a future `profiles` table with a `profile_id` FK added to owned entities — that FK column can be added additively later; omitted now because the MVP is explicitly single-profile.

Note: `docs/DATA_PERSISTENCE.md` lists "settings" as its own persistent-data category separate from "local profile," but `docs/SCREEN_SPECIFICATIONS.md`'s Settings screen defines no setting beyond display name (category management and export/import are separate entities/actions, not stored settings values). No speculative settings blob is added here — this is an open documentation gap, not a modeling decision; see `docs/IMPLEMENTATION_PLAN.md`'s Open Product Questions. If a real setting is identified later, it is added as its own column, additively.

### `category`

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | stable |
| `name` | TEXT | user-editable, not unique-constrained on identity (name is not the key) |
| `base_color` | TEXT | hex or design-token key, see Category Color Variants |
| `icon` | TEXT NULL | Ionicons glyph name from the curated UI set (added by migration `0001_category_icon`, T063); `NULL` renders the UI-layer fallback icon |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

**Deletion:** per `SCREEN_SPECIFICATIONS.md`, deleting an assigned category must not delete tasks/routines. The delete flow (a service, not a raw repository delete) requires the user to choose reassignment or "remove category" for affected items first; once that resolves (routines/tasks store `category_id` as nullable, so "remove category" just sets it to `NULL`), the category row is always hard-deleted. No soft-delete/`archived_at` is needed: nothing else in the schema stores a category name/color snapshot, so once a routine or task no longer references a category, the category row has no remaining history to preserve — keeping it around would be complexity with no purpose.

### `routine`

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | stable |
| `name` | TEXT | |
| `category_id` | TEXT NULL FK → category.id | |
| `schedule_type` | TEXT | `'daily' \| 'weekdays' \| 'weekly_target'` |
| `scheduled_weekdays` | TEXT NULL | JSON array of ISO weekday ints (1–7); used for `weekdays`, and stores the *current* (possibly user-adjusted) suggested days for `weekly_target` |
| `weekly_target_count` | INTEGER NULL | only for `weekly_target` |
| `time_of_day` | TEXT NULL | `HH:mm`, optional, sort-only per `ROUTINE_RULES.md` (never required for completion) |
| `reason` | TEXT NULL | personal reason, optional (no longer surfaced in the UI as of migration `0002`; column retained, not dropped) |
| `cue` | TEXT NULL | optional "Atomic Habits" planning aid — Auslöser (added by migration `0002_routine_plan`) |
| `pairing` | TEXT NULL | optional planning aid — Verknüpfung (`0002`) |
| `reward` | TEXT NULL | optional planning aid — Belohnung (`0002`) |
| `allow_conscious_skip` | INTEGER (bool) | default true or false per creation flow |
| `is_paused` | INTEGER (bool) | see Pause below |
| `sort_order` | REAL | for manual drag-and-drop reorder on the Routines screen; independent of `id`, safe to rewrite freely |
| `color_variant_seed` | INTEGER | assigned once at creation, never recalculated — see Category Color Variants |
| `created_at` | TEXT | routine "starts immediately when created" — no separate start_date needed, `created_at` date is the start |
| `updated_at` | TEXT | |
| `deleted_at` | TEXT NULL | soft delete, preserves history for any prior events referencing this routine |

Note: `cue`, `pairing`, and `reward` are optional free-text planning prompts (per "Die 1%-Methode" / *Atomic Habits*). They are purely a thinking/planning aid: never read by streak, joker, level, progress, reconciliation, or completion logic, and never surfaced on the Today screen, routines list, or routine card — only in the routine's create/edit form ("Weitere Einstellungen" → "Routine leichter machen") and on its statistics screen ("Dein Plan", filled fields only). Existing routines predating `0002` keep `NULL` and behave unchanged. When export/import lands (T055), they travel with the routine like any other column.

Note: `scheduled_weekdays` for `weekly_target` is *derived-then-persisted* — the app computes a suggestion, but once created (or edited), the stored value is authoritative until the user changes it again. This is a persisted value, not recomputed on every read (see Derived vs Persisted).

### `routine_event`

The single append-only event log for everything that happens to a routine occurrence. This is the "source events over derived values" table required by `DATA_PERSISTENCE.md`.

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | stable |
| `routine_id` | TEXT FK → routine.id | |
| `occurrence_date` | TEXT | the calendar date (`YYYY-MM-DD`) this event applies to — for retroactive completion this is the *original* planned date, not the date the event was recorded |
| `event_type` | TEXT | `'completed' \| 'exceeded' \| 'skipped' \| 'missed' \| 'joker_protected' \| 'paused' \| 'reactivated' \| 'moved' \| 'joker_earned' \| 'joker_consumed' \| 'joker_restored' \| 'completion_undone'` |
| `recorded_at` | TEXT | wall-clock timestamp the event was actually written (differs from `occurrence_date` for retroactive entries; `is_retroactive` is not stored separately since it is always `recorded_at`'s date ≠ `occurrence_date`, trivially computed from the two columns already on the row) |
| `moved_to_date` | TEXT NULL | only for `'moved'` events |
| `skip_reason` | TEXT NULL | only for `'skipped'` events, optional |
| `superseded_by_event_id` | TEXT NULL FK → routine_event.id | when a retroactive edit changes the outcome of a prior occurrence, the old event is marked superseded rather than deleted — full history is never destroyed |

Two distinct write paths populate this table (see `docs/ARCHITECTURE.md`'s Missed-Occurrence Reconciliation): `completed`, `exceeded`, `skipped`, `moved`, `paused`, `reactivated`, and `joker_earned` are written synchronously by direct user actions; `missed`, `joker_protected`, and `joker_consumed` are written by the reconciliation pass that runs when the app needs up-to-date state for a routine (since "missing a day" has no user action to trigger it); `joker_restored` is written by the retroactive-completion path when it supersedes a previously-`joker_consumed` occurrence. `completion_undone` is written by the undo-completion path (`docs/ROUTINE_RULES.md`'s Undo Completion) when a misclicked `completed`/`exceeded` event — and, if present, the `joker_earned` event it produced — is superseded back to no recorded outcome.

Streaks, jokers, levels are **recalculated by domain logic reading this table**, not stored as the source of truth (cached copies exist — see Derived vs Persisted). This is what makes joker restoration and full streak recalculation on retroactive edits correct by construction: replay the event log for a routine, in `occurrence_date` order, and the current state falls out — provided reconciliation has already materialized any missed/joker events up to the query date.

### `routine_state_cache` (derived, persisted for performance)

One row per routine, rebuilt from `routine_event` whenever it changes.

| Field | Type | Notes |
|---|---|---|
| `routine_id` | TEXT PK FK → routine.id | |
| `current_streak` | INTEGER | |
| `best_streak` | INTEGER | personal streak record, preserved even if current resets |
| `total_completions` | INTEGER | completed + exceeded, all-time |
| `level_rank` | INTEGER | `total_completions / 66`, floored, preserved across streak resets |
| `joker_inventory` | INTEGER | 0–2 |
| `joker_progress` | INTEGER | completions since last joker earned, 0–4 |
| `consecutive_missed_after_66` | INTEGER | tracks the "up to 3 tolerated" window |
| `reconciled_through_date` | TEXT | last calendar date for which missed/joker events have been materialized for this routine; reconciliation resumes from the day after this date |
| `recalculated_at` | TEXT | |

This table exists purely as a cache: it must always be re-derivable from `routine_event` by replay, provided reconciliation is caught up to the query date. Any test suite change to the streak/joker/level algorithm is validated by asserting cache-from-replay matches expected values (`TEST_STRATEGY.md`).

### `app_streak_cache` (derived, persisted)

Single row.

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | constant singleton id |
| `current_streak` | INTEGER | increases on any day with ≥1 actual routine completion (not skip/joker-protected) |
| `last_incremented_date` | TEXT | |
| `reconciled_through_date` | TEXT | last calendar date for which the app streak has been reconciled across all routines; see the open question on fully-missed days in `docs/IMPLEMENTATION_PLAN.md` |
| `recalculated_at` | TEXT | |

Derived from the union of all `routine_event` rows with `event_type IN ('completed','exceeded')`, grouped by date, across all routines.

### `task`

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | stable |
| `title` | TEXT | |
| `category_id` | TEXT NULL FK → category.id | |
| `date` | TEXT NULL | optional, `YYYY-MM-DD` |
| `time_of_day` | TEXT NULL | optional, `HH:mm` |
| `description` | TEXT NULL | optional |
| `is_completed` | INTEGER (bool) | |
| `completed_at` | TEXT NULL | |
| `sort_order` | REAL | manual ordering within undated/date sections |
| `color_variant_seed` | INTEGER | assigned once at creation, never recalculated — see Category Color Variants |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |
| `deleted_at` | TEXT NULL | soft delete; completed tasks are explicitly required to be stored permanently (`MVP_SCOPE.md`), so deletion is a distinct, user-initiated action from completion and still soft-deletes rather than hard-deletes, to keep history/undo safe |

Tasks are a single mutable row (unlike routines) because `MVP_SCOPE.md` requires undo, move, and edit as direct field mutations, and tasks explicitly do not participate in streak/gamification logic — no event-sourced history is required for tasks beyond what's needed for "permanent storage of completed tasks," which `is_completed` + `completed_at` already satisfies. If future scope adds task history/analytics, a `task_event` table can be added additively without migrating this table.

## Relationships

```
profile 1─┐ (implicit single-profile ownership, no FK in MVP)
category 1───* routine        (category_id, nullable)
category 1───* task           (category_id, nullable)
routine  1───* routine_event  (routine_id)
routine  1───1 routine_state_cache (routine_id)
routine_event *─1 routine_event (superseded_by_event_id, self-referential)
```

## Routine Schedule Representation

Chosen representation: a single `schedule_type` discriminator plus nullable columns for the type-specific fields (`scheduled_weekdays`, `weekly_target_count`), rather than separate tables per schedule type.

Rationale: schedule rarely changes shape after creation, the field set is small, and a discriminated-union table keeps queries ("which routines are scheduled today") a single-table scan instead of a join across three schedule tables. The domain layer (`src/domain/routines`) exposes a typed union (`DailySchedule | WeekdaySchedule | WeeklyTargetSchedule`) mapped from these columns, so application code never touches the nullable-column representation directly.

Occurrence generation (which dates a routine is "due" on) is **not persisted** — it is a pure function of `schedule_type` + relevant fields + calendar date, computed on demand by domain logic. Only what actually happened (`routine_event`) is persisted.

## Task Representation

A task is a mutable single-row entity, not an event-sourced one (see rationale above). "Overdue" is a derived/computed property (`date < today && !is_completed`), not a stored flag — recomputing it is cheap and avoids a background job to keep a stored flag in sync.

## Category Color Variants

`category.base_color` stores the single base color. Per-item visual variants (lightness/saturation/warmth/gradient-position adjustments, per `DESIGN_SYSTEM.md`) are **derived and persisted per-item**, not recomputed on every render, to satisfy "each item's selected variant must remain stable across sorting, app restarts, migrations, and updates":

- `routine.color_variant_seed` and `task.color_variant_seed` (INTEGER, part of both tables from the initial migration — see Schema Versioning): assigned once at creation time (e.g. a small deterministic index or random seed), never recalculated. The design-system layer maps `(base_color, color_variant_seed)` → concrete style values. Because the seed is persisted on the item, migrations and re-sorts can never change an item's visual identity, and a future re-theme only has to change the mapping function, not stored color values.

## Streak and Joker Source Data

Source of truth: `routine_event` rows with types `completed`, `exceeded`, `skipped`, `missed`, `joker_protected`, `joker_earned`, `joker_consumed`, `joker_restored`, `paused`, `reactivated`, `moved`, `completion_undone`. Not all of these are written the same way — see `routine_event`'s note above on the two write paths (direct user action vs. reconciliation vs. retroactive-completion side effect).

Domain algorithm (implemented in `src/domain/streaks`, tested per `TEST_STRATEGY.md`) replays these events in date order per routine to derive: current streak, best streak, total completions, level rank, joker inventory/progress, and the post-66 missed-occurrence tolerance window. `routine_state_cache` stores the *result* of the last replay for fast reads; it is never hand-written outside of a full or incremental replay. Replay assumes the event log is complete up to the query date — reconciliation (see `docs/ARCHITECTURE.md`) is what keeps that assumption true.

## Derived versus Persisted Values

| Value | Status |
|---|---|
| Routine occurrence dates (is it "due" today) | derived, not persisted |
| Task "overdue" | derived, not persisted |
| `routine_state_cache.*` (streak, level, jokers) | derived, persisted as cache, must be replay-reproducible |
| `app_streak_cache.*` | derived, persisted as cache, must be replay-reproducible |
| `routine.scheduled_weekdays` for weekly-target | initially derived (suggested), then persisted as authoritative once created/edited |
| Category color variant per item | derived once, persisted permanently (seed), never recomputed |
| `task.is_completed` | persisted directly (not event-sourced) |
| `routine_state_cache.reconciled_through_date` / `app_streak_cache.reconciled_through_date` | persisted watermark (not itself derived — it records reconciliation progress) |

Rule of thumb applied throughout: if a value is *reconstructible* from an append-only log, it is cached, not authoritative, and every cache must have a documented replay path. If a value is inherently a current-state field with no meaningful history requirement (task completion, category color seed), it is persisted directly.

## Schema Versioning

- A `schema_migrations` table (`version INTEGER PK, applied_at TEXT`) records every migration applied, in order. `version` matches the numeric prefix of the migration file under `migrations/` (Drizzle Kit's generated naming).
- The backup manifest's `schemaVersion` field (see `ARCHITECTURE.md` Backup and Restore) is this same integer — the highest applied migration version at export time.
- Migrations are additive-by-default (see `ARCHITECTURE.md` Migration Strategy); any destructive change is split into an additive migration + backfill + a later, separately reviewed drop migration, each independently tested.
- No entity table listed above is expected to exist before Phase 1's initial migration (`0001_init`), which creates `profile`, `category`, `routine`, `routine_event`, `routine_state_cache`, `app_streak_cache`, `task`, and `schema_migrations` together, with every column listed in this document (including `color_variant_seed` and `reconciled_through_date`) included from the start, since they have interdependent foreign keys and no prior data exists to migrate from. Deferring any of these columns to a later migration would be pure churn with no data to preserve across the split.
