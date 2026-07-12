# Tasks Archive — Android MVP (T001–T090)

The complete, as-planned specification of the Android MVP build: phases 0–12,
tasks T001–T090, each with its goal, affected areas, acceptance criteria,
required tests, manual checklist, dependencies, and commit message. Every task
here is implemented and merged.

This is **reference material, not required reading** (`TASKS.md` and `CLAUDE.md`
say when to consult it): open a phase only when you change the area it built, to
recover the original intent and test contract behind that code. The global rules
that still bind all task work live in `TASKS.md`, not here.

---

## Phase 0 — Project Bootstrap

### T001 — Initialize Expo TypeScript project
**Goal:** create the base Expo-managed React Native project with TypeScript.
**Files/areas:** repo root (`package.json`, `app.json`/`app.config.ts`, `tsconfig.json`), `.gitignore`.
**Acceptance criteria:** `npx expo start` launches the default app on an Android emulator/device with no errors; TypeScript strict mode enabled in `tsconfig.json`.
**Required automated tests:** none yet (no logic exists).
**Manual verification:** app opens on an Android emulator and shows the default Expo screen without red-box errors.
**Dependencies:** none.
**Commit message:** `chore: initialize Expo TypeScript project`

### T002 — Configure ESLint
**Goal:** add linting with an Expo/React Native-appropriate config.
**Files/areas:** `.eslintrc*`, `package.json` scripts.
**Acceptance criteria:** `npm run lint` runs and passes on the current (near-empty) codebase.
**Required automated tests:** none (tooling task).
**Manual verification:** intentionally introduce an unused variable, confirm `npm run lint` fails, then remove it.
**Dependencies:** T001.
**Commit message:** `chore: configure ESLint`

### T003 — Configure Jest test runner
**Goal:** wire up `jest-expo` so unit/component tests can run.
**Files/areas:** `jest.config.js`, `package.json` scripts.
**Acceptance criteria:** `npm test` runs successfully against a single trivial placeholder test.
**Required automated tests:** one placeholder test (e.g. `1 + 1 === 2`) proving the runner works; deleted once real tests exist in T025.
**Manual verification:** none beyond command output.
**Dependencies:** T001.
**Commit message:** `chore: configure Jest test runner`

### T004 — Add combined verification script
**Goal:** a single command chains typecheck, lint, and test so every task can be verified in one step.
**Files/areas:** `package.json` (`"verify"` script).
**Acceptance criteria:** `npm run verify` runs typecheck → lint → test in sequence and fails fast on the first failing step.
**Required automated tests:** none (tooling task).
**Manual verification:** run `npm run verify` and confirm all three steps execute and report success.
**Dependencies:** T002, T003.
**Commit message:** `chore: add combined verify script`

### T005 — Base navigation shell
**Goal:** Expo Router bottom-tab layout with four empty tab screens per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/_layout.tsx`, `app/(tabs)/today.tsx`, `app/(tabs)/routines.tsx`, `app/(tabs)/tasks.tsx`, `app/(tabs)/settings.tsx`.
**Acceptance criteria:** app launches showing four tabs (Heute, Routinen, Aufgaben, Einstellungen), each rendering a placeholder screen; navigating between tabs works.
**Required automated tests:** a smoke render test per tab screen (renders without throwing).
**Manual verification:** on an Android emulator, tap through all four tabs and confirm each renders and the active tab is visually indicated.
**Dependencies:** T001.
**Commit message:** `feat: add base tab navigation shell`

---

## Phase 1 — Data Foundation

### T006 — Validate SQLite + Drizzle toolchain
**Goal:** de-risk the Drizzle + `expo-sqlite` combination (see Risk 4 in `docs/IMPLEMENTATION_PLAN.md`) before building the real schema on top of it.
**Files/areas:** `src/data/db/` (throwaway single-table schema), `drizzle.config.ts`.
**Acceptance criteria:** a trivial one-table schema can be defined, a migration generated via `drizzle-kit generate`, and that migration successfully run against a real device/emulator SQLite database at app startup.
**Required automated tests:** one test that runs the generated migration against a fresh in-memory/temp-file DB and asserts the table exists.
**Manual verification:** run the app on an Android emulator, confirm no crash on startup, and inspect the device's SQLite file (via adb) to confirm the table was created.
**Dependencies:** T001.
**Commit message:** `chore: validate expo-sqlite and Drizzle toolchain`

### T007 — Define full initial schema
**Goal:** implement the real schema from `docs/DATA_MODEL.md` (`profile`, `category`, `routine`, `routine_event`, `routine_state_cache`, `app_streak_cache`, `task`, `schema_migrations`), including every column listed there — e.g. `routine.color_variant_seed`, `task.color_variant_seed`, and the `reconciled_through_date` columns on the two cache tables. Nothing is deferred to a later migration; see `docs/DATA_MODEL.md`'s Schema Versioning section.
**Files/areas:** `src/data/db/schema.ts`.
**Acceptance criteria:** schema file matches `docs/DATA_MODEL.md` field-for-field, including foreign keys and nullability; `drizzle-kit generate` produces a migration without errors.
**Required automated tests:** a schema-shape test asserting each expected table/column exists (via Drizzle's introspection or a raw `PRAGMA table_info` query in a test DB).
**Manual verification:** none beyond automated checks (no UI yet).
**Dependencies:** T006.
**Commit message:** `feat: define initial database schema`

### T008 — Generate and commit initial migration
**Goal:** produce the versioned `0001_init` migration file from the schema in T007.
**Files/areas:** `migrations/0001_init.sql` (or Drizzle's generated format).
**Acceptance criteria:** migration file is committed, deterministic, and re-generating it from the same schema produces no diff.
**Required automated tests:** migration applies cleanly to an empty database in a test.
**Manual verification:** none beyond automated checks.
**Dependencies:** T007.
**Commit message:** `feat: add initial schema migration 0001_init`

### T009 — Migration runner and startup wiring
**Goal:** run pending migrations automatically at app startup, tracked via `schema_migrations`.
**Files/areas:** `src/data/db/client.ts`, `src/data/db/migrate.ts`, root `app/_layout.tsx` (startup hook).
**Acceptance criteria:** on first launch, `0001_init` runs and is recorded; on subsequent launches, no migration re-runs; each migration runs inside its own transaction.
**Required automated tests:** test asserting a second launch against an already-migrated DB is a no-op; test asserting `schema_migrations` contains the applied version.
**Manual verification:** launch the app on an emulator, force-close, relaunch, confirm no crash and no duplicate migration execution (check logs).
**Dependencies:** T008.
**Commit message:** `feat: run database migrations on app startup`

### T010 — Migration test harness
**Goal:** establish the reusable fixture-based migration test pattern required from the start per project rules.
**Files/areas:** `src/data/db/__tests__/migrate.test.ts`, a small test-fixture helper (`src/data/db/testUtils.ts`).
**Acceptance criteria:** a documented, reusable helper seeds a database at a given schema version with fixture data, runs migrations up to current, and exposes assertions on the result; used by T008/T009's tests and by every future migration task.
**Required automated tests:** the harness itself is exercised by a test that seeds pre-`0001_init` (empty DB) and asserts post-migration table presence.
**Manual verification:** none (test infrastructure).
**Dependencies:** T009.
**Commit message:** `test: add reusable migration test harness`

### T011 — Local profile auto-creation
**Goal:** create exactly one `profile` row automatically on first launch, per `docs/USER_MODEL.md`.
**Files/areas:** `src/data/repositories/profileRepository.ts`, startup wiring in `app/_layout.tsx`.
**Acceptance criteria:** first launch creates one profile row with a generated stable ID and default display name; subsequent launches do not create a second row.
**Required automated tests:** repository test asserting idempotent profile creation (calling the "ensure profile exists" function twice yields one row).
**Manual verification:** fresh install on an emulator, confirm app starts without error; force-close and relaunch, confirm still exactly one profile (via adb SQLite inspection).
**Dependencies:** T009.
**Commit message:** `feat: auto-create local profile on first launch`

### T012 — Interrupted-migration recovery test
**Goal:** prove the transaction-per-migration design actually protects data if a migration is interrupted mid-way, per `docs/ARCHITECTURE.md`'s migration strategy.
**Files/areas:** `src/data/db/__tests__/interruptedMigration.test.ts`.
**Acceptance criteria:** a test simulates a failure partway through a migration (e.g. a migration step that throws after partial writes) and asserts the transaction rolled back fully and the app can retry successfully on next startup.
**Required automated tests:** the interrupted-migration test itself, plus a retry-succeeds test.
**Manual verification:** none practical to simulate manually; covered entirely by the automated test.
**Dependencies:** T010.
**Commit message:** `test: verify interrupted migrations roll back safely`

---

## Phase 2 — Design System

### T013 — Design tokens
**Goal:** define color, spacing, radius, and typography tokens per `docs/DESIGN_SYSTEM.md`.
**Files/areas:** `src/ui/theme/colors.ts`, `spacing.ts`, `radius.ts`, `typography.ts`, `index.ts`.
**Acceptance criteria:** tokens cover the warm off-white background, pastel category palette families (mint, lavender, apricot, sky blue, soft peach, warm cream), spacing scale, large-radius scale, and a type scale; no component exists yet that consumes them beyond a smoke test.
**Required automated tests:** a test asserting token objects are well-formed (no missing keys, valid color format).
**Manual verification:** none (no UI yet).
**Dependencies:** T001.
**Commit message:** `feat: add design system tokens`

### T014 — Category color variant mapping function
**Goal:** implement the pure function mapping `(base_color, color_variant_seed)` to a concrete style value, per `docs/DATA_MODEL.md`'s Category Color Variants section.
**Files/areas:** `src/ui/theme/categoryVariant.ts`.
**Acceptance criteria:** deterministic — same inputs always produce the same output; produces same-family variants only (no unrelated hues).
**Required automated tests:** unit tests asserting determinism and same-family constraint across a range of seeds.
**Manual verification:** none (pure function, no UI yet).
**Dependencies:** T013.
**Commit message:** `feat: add deterministic category color variant mapping`

### T015 — Core primitives: Card and Button
**Goal:** build the two most-reused primitives first.
**Files/areas:** `src/ui/components/Card.tsx`, `Button.tsx`.
**Acceptance criteria:** both consume tokens from T013 exclusively (no inline magic numbers); Button supports a primary/secondary/destructive visual variant per the destructive-action distinctness requirement in `docs/DESIGN_SYSTEM.md`.
**Required automated tests:** component tests asserting each Button variant renders with distinct, expected styling.
**Manual verification:** dev-only preview (added in T019) will cover visual check; skip standalone manual step here.
**Dependencies:** T013.
**Commit message:** `feat: add Card and Button primitives`

### T016 — CompletionControl component
**Goal:** build the tap-to-complete / long-press-to-exceed control, called out as safety-critical in `docs/IMPLEMENTATION_PLAN.md`.
**Files/areas:** `src/ui/components/CompletionControl.tsx`.
**Acceptance criteria:** a short tap fires a distinct `onComplete` callback; a long press fires a distinct `onExceed` callback; the two are never both fired for one interaction.
**Required automated tests:** component tests simulating tap and long-press separately, asserting exactly one callback fires per interaction, including a test that a tap held just under the long-press threshold does not fire `onExceed`.
**Manual verification:** none yet (wired into a real screen in Phase 5); visually checked in T019's preview screen.
**Dependencies:** T013.
**Commit message:** `feat: add CompletionControl with tap and long-press handling`

### T017 — Remaining core primitives
**Goal:** build ProgressBar, CategoryBadge, Sheet, and EmptyState.
**Files/areas:** `src/ui/components/ProgressBar.tsx`, `CategoryBadge.tsx`, `Sheet.tsx`, `EmptyState.tsx`.
**Acceptance criteria:** ProgressBar accepts a 0–1 value and animates fill (using the animation hook from T018 once available, or a stub); CategoryBadge renders using T014's variant mapping; Sheet is a reusable bottom-sheet/modal; EmptyState accepts icon/title/message props and uses no mascots per design direction.
**Required automated tests:** component tests for prop-driven rendering of each (e.g. ProgressBar clamps values outside 0–1).
**Manual verification:** none standalone; covered by T019.
**Dependencies:** T013, T014.
**Commit message:** `feat: add ProgressBar, CategoryBadge, Sheet, and EmptyState primitives`

### T018 — Animation and haptics hooks
**Goal:** reusable, short, non-blocking animation and haptic-feedback hooks, per `docs/DESIGN_SYSTEM.md`'s Motion and Haptics sections.
**Files/areas:** `src/ui/animation/useCompletionAnimation.ts`, `useStreakBurst.ts`, `useLevelUpAnimation.ts`, `src/ui/animation/haptics.ts`.
**Acceptance criteria:** each animation hook exposes a start function and completes within a bounded, short duration; haptics module wraps `expo-haptics` with named functions matching the listed trigger points (routine completion, exceeded completion, first-of-day, level milestone) — none are wired to real events yet.
**Required automated tests:** a test asserting each animation hook's exposed duration/config is within the "short" bound defined for it (a concrete numeric ceiling, e.g. ≤ 600ms).
**Manual verification:** none standalone; covered by T019.
**Dependencies:** T013.
**Commit message:** `feat: add reusable animation and haptics hooks`

### T019 — Dev-only component preview screen
**Goal:** a single screen rendering every Phase 2 primitive in its states, for fast visual iteration — explicitly excluded from the production navigation tree, satisfying the "seed/preview data clearly separated from production" rule for UI previews.
**Files/areas:** `app/_dev/component-preview.tsx` (only registered as a route when `__DEV__` is true), a small dev-only nav entry point.
**Acceptance criteria:** screen renders Card, Button (all variants), CompletionControl, ProgressBar, CategoryBadge, Sheet, EmptyState; not reachable from any tab in a release build (verified in T060).
**Required automated tests:** a render smoke test for the preview screen itself.
**Manual verification:** open the preview screen on an emulator in dev mode, visually confirm every primitive matches the Soft Momentum direction (warm off-white background, pastel rounded cards, no aggressive colors).
**Dependencies:** T015, T016, T017, T018.
**Commit message:** `chore: add dev-only design system preview screen`

---

## Phase 3 — Categories and Settings Shell

### T020 — Category repository
**Goal:** CRUD data access for `category`.
**Files/areas:** `src/data/repositories/categoryRepository.ts`.
**Acceptance criteria:** create/read/update/delete operations exist and match `docs/DATA_MODEL.md`'s category table definition — hard delete only; categories have no soft-delete state (see `docs/DATA_MODEL.md`'s Deletion note).
**Required automated tests:** repository tests against a real test DB for each operation; a test asserting renaming a category does not change its `id` and that existing `category_id` references from other rows remain valid (the stable-identifier requirement from `docs/DATA_PERSISTENCE.md`).
**Manual verification:** none (no UI yet).
**Dependencies:** T009, T010.
**Commit message:** `feat: add category repository`

### T021 — Category service with safe-delete logic
**Goal:** implement the reassignment-or-removal delete flow required by `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `src/services/categoryService.ts`.
**Acceptance criteria:** deleting a category with no references deletes it directly; deleting a referenced category requires an explicit reassignment or null-out choice passed in by the caller, applied atomically before the delete — the category row is always hard-deleted once references are resolved, since nothing else in the schema stores a category name/color snapshot that would need preserving.
**Required automated tests:** service tests covering unreferenced delete, referenced delete with reassignment, referenced delete with null-out, and a rejection case if neither choice is provided.
**Manual verification:** none yet (UI in T024).
**Dependencies:** T020.
**Commit message:** `feat: add category service with safe delete`

### T022 — Create/edit category form
**Goal:** the category form screen (name, base color, preview) per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/category/create.tsx`, `app/category/[id]/edit.tsx`, shared form component.
**Acceptance criteria:** form validates a non-empty name, offers the palette families from `docs/DESIGN_SYSTEM.md`, and shows a live preview using T014's variant mapping.
**Required automated tests:** component test asserting save is disabled until a name is entered.
**Manual verification:** on-device, create a category, confirm it appears in the management list (T024); edit its color and confirm the preview updates.
**Dependencies:** T021, T015, T017.
**Commit message:** `feat: add create and edit category screens`

### T023 — Settings screen shell and display name editing
**Goal:** build the real Settings screen (replacing the Phase 0 placeholder) with an editable display name field bound to `profile.display_name`, per `docs/MVP_SCOPE.md` and `docs/SCREEN_SPECIFICATIONS.md`. This closes a gap in an earlier draft of this plan, which never scheduled a task for display-name editing even though both source documents list it as a required Settings field.
**Files/areas:** `app/(tabs)/settings.tsx`, an update path on `src/data/repositories/profileRepository.ts`.
**Acceptance criteria:** Settings screen shows the current display name in an editable field; saving persists it and it survives app restart; the screen has a defined place for the category-management link (wired in T024) and for export/import (wired in T055).
**Required automated tests:** component test asserting the field is pre-filled with the current display name and that saving calls the update path with the new value.
**Manual verification:** on-device, edit the display name, force-close and reopen the app, confirm the change persisted.
**Dependencies:** T011, T015, T017.
**Commit message:** `feat: add Settings screen shell with display name editing`

### T024 — Category management screen
**Goal:** list/create/edit/delete entry point reachable from Settings, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/category/index.tsx`, a link added to the Settings screen built in T023.
**Acceptance criteria:** lists all categories, links to create/edit, triggers the safe-delete flow from T021 with a confirmation dialog for the destructive action.
**Required automated tests:** component test asserting the list renders categories from a mocked repository and that delete triggers a confirmation before calling the service.
**Manual verification:** on-device: create two categories, delete one with no references (should disappear immediately), confirm the destructive confirm dialog appears before deletion.
**Dependencies:** T022, T023.
**Commit message:** `feat: add category management screen`

---

## Phase 4 — Routine Domain Logic

### T025 — Schedule types and occurrence-due calculation
**Goal:** pure domain logic answering "is this routine due on date X," for all three schedule types, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/schedule.ts`.
**Acceptance criteria:** correctly computes due-ness for `daily`, `weekdays`, and `weekly_target` schedules; weekly-target suggested-weekday generation is a separate, clearly named pure function; an occurrence that has been moved to a new date (a `'moved'` event) is due on the new date instead of the original, and is never counted as due on both dates.
**Required automated tests:** cases from `docs/TEST_STRATEGY.md`'s Core Logic Tests: daily routines, weekday routines, weekly target routines, days without scheduled routines, and a moved occurrence's due-date shifting correctly.
**Manual verification:** none (pure logic, no UI).
**Dependencies:** T007 (types informed by schema), no runtime DB dependency.
**Commit message:** `feat: add routine schedule domain logic`

### T026 — Completion state machine
**Goal:** pure domain logic for normal completion, exceeded completion, conscious skip, moved occurrences, and missed-occurrence determination, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/completion.ts`.
**Acceptance criteria:** given a routine's schedule and its event history up to a date, correctly classifies an occurrence's state; conscious skip is rejected by the function when `allow_conscious_skip` is false; an occurrence with a `'moved'` event is classified as moved (not missed) on its original date, and normal missed-occurrence rules apply to the new date if it is not completed there.
**Required automated tests:** normal completion, exceeded completion, conscious skip (allowed and disallowed), missed-occurrence detection, move-to-tomorrow (original date not missed; moved-to date subject to normal rules if left incomplete).
**Manual verification:** none (pure logic).
**Dependencies:** T025.
**Commit message:** `feat: add routine completion state machine`

### T027 — Retroactive completion and event superseding
**Goal:** implement retroactive completion, including full recalculation triggering and event superseding, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/retroactive.ts`.
**Acceptance criteria:** marking a past occurrence complete uses the original `occurrence_date`; any prior event for that occurrence is marked `superseded_by_event_id` rather than deleted; function returns enough information for the caller to know a full recalculation is required.
**Required automated tests:** retroactive completion of a previously-missed occurrence, retroactive completion of a previously-joker-protected occurrence (asserting the joker-restoration signal is emitted — actual joker mechanics land in Phase 6, this task only proves the signal/event chain is correct).
**Manual verification:** none (pure logic).
**Dependencies:** T026.
**Commit message:** `feat: add retroactive completion and event superseding logic`

### T028 — Pause and reactivate semantics
**Goal:** pure domain logic for pause/reactivate, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/pause.ts`.
**Acceptance criteria:** pausing freezes streak-relevant state (returns "no change" for streak/level/total on subsequent calculations while paused) and excludes the routine from due-occurrence calculation; reactivating resumes from prior state without loss.
**Required automated tests:** pause-then-check-due (should be false), pause-then-reactivate-preserves-totals.
**Manual verification:** none (pure logic).
**Dependencies:** T025.
**Commit message:** `feat: add routine pause and reactivate domain logic`

---

## Phase 5 — Routine Screens

### T029 — Routine repository
**Goal:** CRUD and query access for `routine` and `routine_event`.
**Files/areas:** `src/data/repositories/routineRepository.ts`, `routineEventRepository.ts`.
**Acceptance criteria:** supports create/update/soft-delete of routines, append-only insert of events, and querying events by routine and date range.
**Required automated tests:** repository tests against a real test DB for each operation, including that event rows are never updated in place (only inserted); a test asserting renaming a routine does not change its `id` and existing `routine_event.routine_id` references remain valid.
**Manual verification:** none (no UI yet).
**Dependencies:** T009, T010.
**Commit message:** `feat: add routine and routine event repositories`

### T030 — Routine service (non-gamification)
**Goal:** orchestrate Phase 4 domain logic with Phase 5 repositories for create, complete, exceed, skip, move, pause, reactivate, and retroactive-complete — excluding streak/joker/level calculation, deferred to Phase 6.
**Files/areas:** `src/services/routineService.ts`.
**Acceptance criteria:** each user action results in the correct `routine_event` row(s) being written; retroactive completion correctly supersedes prior events per T027.
**Required automated tests:** service-level integration tests (real test DB + real domain functions, no mocks) for each action listed above.
**Manual verification:** none yet (UI lands next).
**Dependencies:** T025–T029.
**Commit message:** `feat: add routine service for core completion actions`

### T031 — Create/edit routine form
**Goal:** the routine creation/edit screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/create.tsx`, `app/routine/[id]/edit.tsx`.
**Acceptance criteria:** visible fields Name/Kategorie/Häufigkeit/Uhrzeit; frequency options Täglich/Wochentage/X-mal pro Woche; weekly-target shows editable suggested weekdays; collapsed section for personal reason and conscious-skip toggle; "create new category" shortcut into T022's flow.
**Required automated tests:** component test asserting save is disabled until required fields are filled, and that weekly-target suggested days populate on frequency selection.
**Manual verification:** on-device, create one routine of each schedule type and confirm each saves and appears correctly typed in the database (via T029/T030).
**Dependencies:** T030, T017.
**Commit message:** `feat: add create and edit routine screens`

### T032 — Routines screen
**Goal:** Active/Paused tabbed list with reorder, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/routines.tsx` (replacing the Phase 0 placeholder).
**Acceptance criteria:** two tabs (Aktiv/Pausiert), each card shows name/category/current streak (streak displayed as a plain number for now — polish lands in Phase 6), drag-and-drop reorder persists `sort_order`, overflow menu offers edit/pause-or-reactivate/delete.
**Required automated tests:** component test asserting a paused routine appears only in the Pausiert tab.
**Manual verification:** on-device, pause a routine and confirm it moves to the Pausiert tab; drag-reorder two routines and confirm order persists after app restart.
**Dependencies:** T031.
**Commit message:** `feat: add Routines screen with active and paused tabs`

### T033 — Routine card on Today screen (routines-only slice)
**Goal:** render due routines for today with the full `RoutineCard` interaction surface specified in `docs/SCREEN_SPECIFICATIONS.md` — completion controls, tap-to-open-detail, and the overflow menu (move to tomorrow, conscious skip when allowed, edit, pause, delete) — as an isolated slice ahead of full Today-screen integration (Phase 8). An earlier draft of this task covered only the completion button, omitting the rest of the card's documented interactions.
**Files/areas:** `src/ui/components/RoutineCard.tsx`, temporary rendering into `app/(tabs)/today.tsx` (replaced/extended in Phase 8).
**Acceptance criteria:** shows name, category treatment, optional time, streak (plain number), completion button; tap completes, long-press exceeds (via T016); tapping the card body (not the completion button) navigates to routine detail; overflow menu offers move to tomorrow, conscious skip (shown only when the routine allows it), edit, pause, and delete, each wired to T030's service; completed routines move to a subdued state at the end of the list.
**Required automated tests:** component test asserting tap calls the complete action and long-press calls the exceed action exactly once each; a test asserting the overflow menu omits conscious skip when the routine disallows it; a test asserting tapping the card body outside the completion button triggers navigation, not completion.
**Manual verification:** on-device, complete a routine via tap and another via long-press, confirm both show correct subdued/exceeded visual states and persist after restart; open the overflow menu and move a routine to tomorrow, confirm it disappears from today and the original date is not marked missed.
**Dependencies:** T030, T016, T032.
**Commit message:** `feat: add routine card with completion controls and overflow menu to Today screen`

### T034 — Routine detail screen skeleton
**Goal:** stats + calendar view, without level-progress polish (deferred to Phase 6), per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/[id]/index.tsx`.
**Acceptance criteria:** shows name/category/current streak (plain number), personal reason in a collapsible section, monthly calendar with per-day state (completed/exceeded/missed/skipped/paused/moved — joker-protected styling deferred to Phase 6), past days tappable for retroactive completion via T027/T030.
**Required automated tests:** component test asserting calendar cell states map correctly from a fixed set of mocked events.
**Manual verification:** on-device, open a routine's detail screen, retroactively complete a past missed day, confirm the calendar updates and the day is no longer shown as missed.
**Dependencies:** T030, T017.
**Commit message:** `feat: add routine detail screen with calendar history`

---

## Phase 6 — Gamification

### T035 — Streak/joker/level replay algorithm
**Goal:** the pure domain function that replays a routine's `routine_event` log — assumed complete/reconciled up to the query date — into current streak, best streak, total completions, level rank, joker inventory/progress, and the post-66 tolerance window, per `docs/ROUTINE_RULES.md`. This function does not decide whether a day was missed; it only summarizes an event log that already reflects that decision (T036 is what produces those events).
**Files/areas:** `src/domain/streaks/replay.ts`.
**Acceptance criteria:** matches every rule in `docs/ROUTINE_RULES.md` (joker earned every 5 completions pre-66, max inventory 2, retroactive restoration, post-66 three-miss tolerance, level segments of 66).
**Required automated tests:** exhaustive coverage of `docs/TEST_STRATEGY.md`'s gamification list: joker earning, consumption, restoration, streak calculation, 66-completion protection, level progression — using fabricated/fixture event logs, independent of whether real reconciliation has run.
**Manual verification:** none (pure logic).
**Dependencies:** T027 (event superseding semantics it must respect).
**Commit message:** `feat: add streak, joker, and level replay algorithm`

### T036 — Missed-occurrence reconciliation domain logic
**Goal:** the pure domain function that turns elapsed time into persisted events. "Missing a day" has no user action to trigger it, so given a routine's schedule, its events up to a `reconciled_through_date`, and today's date, this function walks forward one due occurrence at a time and — using the joker inventory and post-66 tolerance state as they stood at that point in the walk — classifies each unaccounted occurrence as joker-protected (consumes a joker) or missed, returning the ordered events to write and the new `reconciled_through_date`. See `docs/ARCHITECTURE.md`'s Missed-Occurrence Reconciliation. This task was missing from an earlier draft of this plan, which described joker consumption and 66-day protection as "integration" tasks without ever specifying what actually writes a `missed` or `joker_consumed` event.
**Files/areas:** `src/domain/routines/reconcile.ts`.
**Acceptance criteria:** processes occurrences strictly in chronological order, since each decision affects the next; occurrences that are moved, skipped, or fall within a paused period are never classified missed; joker consumption only applies pre-66; post-66 tolerates up to 3 consecutive misses before resetting; never reconciles today itself (only fully-elapsed days).
**Required automated tests:** a multi-day walk mixing joker-protected and plain-missed days in chronological order; a walk that crosses the 66-completion boundary mid-walk; a walk spanning a paused period (produces no events for paused dates); a walk that correctly skips a moved-to-date's original date.
**Manual verification:** none (pure logic).
**Dependencies:** T035 (shares the joker/streak state model), T028 (pause semantics), T025 (moved/due-occurrence semantics).
**Commit message:** `feat: add missed-occurrence reconciliation domain logic`

### T037 — Cache persistence wiring
**Goal:** persist `routine_state_cache` and `app_streak_cache`, recomputed via T035's replay whenever a direct user action (T030) writes a `routine_event`, and whenever a retroactive completion signals joker restoration.
**Files/areas:** `src/data/repositories/routineStateCacheRepository.ts`, `appStreakCacheRepository.ts`, wiring into `routineService.ts`.
**Acceptance criteria:** after any direct-user-action service call, the affected routine's cache (and the app streak cache, if applicable) is recomputed and persisted in the *same transaction* as the triggering event write (see `docs/ARCHITECTURE.md`'s Event and Cache Write Atomicity), so a crash can never leave the cache silently stale; a cache is always re-derivable by discarding it and replaying; a retroactive completion that supersedes a previously-`joker_consumed` event writes a `joker_restored` event before recomputing.
**Required automated tests:** integration test that discards a routine's cache row, re-derives it from events, and asserts it matches the value produced incrementally during normal operation; a test asserting `joker_restored` is written and reflected in `joker_inventory` after a qualifying retroactive completion; a test simulating a failure between the event write and cache update and asserting neither is applied (atomicity).
**Manual verification:** none yet (UI in T039/T040).
**Dependencies:** T035, T029, T027.
**Commit message:** `feat: persist routine and app streak caches with atomic event writes`

### T038 — Reconciliation service wiring
**Goal:** wire T036's reconciliation into the app: run it for every active routine at app startup, and for a single routine when its detail screen opens, persisting the resulting events and advancing `reconciled_through_date`, then invoking T037's cache recompute. This is what actually makes joker consumption on missed days and the post-66 tolerance window observable to the user — neither can be meaningfully "wired" independently of reconciliation itself, since both are direct consequences of the same reconciliation walk.
**Files/areas:** `src/services/reconciliationService.ts`, `app/_layout.tsx` (startup hook), `app/routine/[id]/index.tsx` (detail-open hook).
**Acceptance criteria:** on app startup, every active routine is reconciled up through yesterday before its state is shown anywhere; opening a routine detail screen re-reconciles that routine first; the three-consecutive-miss tolerance after streak 66 is respected end-to-end; `app_streak_cache` is updated using the provisional reset-on-fully-missed-day assumption documented in `docs/IMPLEMENTATION_PLAN.md`'s Open Product Questions.
**Required automated tests:** service-level integration test: 5 completions → joker earned → an elapsed missed day → app-startup reconciliation runs → joker consumed, asserted via `routine_state_cache`; a second integration test covering 3 tolerated misses post-66 and a 4th triggering reset.
**Manual verification:** none yet (covered by the Phase 6 exit checklist in `docs/IMPLEMENTATION_PLAN.md`, exercised again after T039–T042 add UI).
**Dependencies:** T036, T037.
**Commit message:** `feat: wire missed-occurrence reconciliation into app startup and routine detail`

### T039 — Level rank and progress bar UI
**Goal:** replace the plain-number streak/level placeholders from Phase 5 with real level names, progress bars, and joker availability, per `docs/ROUTINE_RULES.md` and `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/[id]/index.tsx` (T034), `src/ui/components/ProgressBar.tsx` usage.
**Acceptance criteria:** routine detail shows current level name (Im Aufbau/Stabil/Gefestigt/Meister), progress bar toward the next 66-completion segment, available jokers (pre-66, correctly reflecting reconciliation-driven consumption), personal streak record, total successful completions.
**Required automated tests:** component test asserting the correct level name renders for a given `total_completions` value at each boundary.
**Manual verification:** on-device, drive a routine to a level-up (or use a seeded test routine per T047) and confirm the level name and progress bar update correctly.
**Dependencies:** T037, T038, T034.
**Commit message:** `feat: add level name and progress bar to routine detail`

### T040 — Overall app streak UI
**Goal:** surface `app_streak_cache` on the Today screen header, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/today.tsx` header area (temporary, extended fully in Phase 8).
**Acceptance criteria:** shows the current overall streak subtly, per the design direction (not visually dominant); updates correctly on the first actual completion of a day and not on skips/joker-protected days.
**Required automated tests:** component test asserting the streak value renders from a mocked `app_streak_cache` value.
**Manual verification:** on-device, complete a routine on a fresh day and confirm the overall streak increments by exactly one.
**Dependencies:** T037, T038.
**Commit message:** `feat: display overall app streak on Today screen`

### T041 — Completion animations: exceeded emphasis and first-completion-of-day burst
**Goal:** wire the Phase 2 animation/haptics hooks to the two animation triggers tied directly to a completion action: exceeded-completion emphasis and the first-routine-completion-of-day streak burst.
**Files/areas:** `RoutineCard.tsx` (T033), `today.tsx` (T040).
**Acceptance criteria:** exceeded completion plays a visibly stronger animation than normal completion; the first routine completion of a given calendar day (and only the first) triggers the streak-burst animation and haptic; no animation blocks interaction beyond its short bounded duration (per T018's ceiling).
**Required automated tests:** a test asserting the "first completion of day" signal fires exactly once across multiple completions on the same day, and again on the next day.
**Manual verification:** on-device, complete two routines on the same day and confirm only the first triggers the streak-burst animation/haptic; long-press one for exceeded and confirm the stronger animation plays.
**Dependencies:** T037, T040, T018.
**Commit message:** `feat: wire exceeded and first-completion-of-day animations`

### T042 — Level-up milestone animation
**Goal:** wire the level-up milestone animation and haptic, triggered when a completion crosses a 66-completion boundary. Kept separate from T041 since it is a distinct trigger (a level boundary, not the completion action itself) with its own acceptance criteria — an earlier draft of this plan bundled both into one oversized task.
**Files/areas:** `RoutineCard.tsx` / routine detail screen (T033/T039), service-to-UI signaling for "leveled up."
**Acceptance criteria:** a completion that crosses a 66-completion boundary triggers a distinct milestone animation and haptic, visually distinguishable from normal/exceeded/first-of-day feedback; does not fire on non-boundary-crossing completions.
**Required automated tests:** a test asserting the "leveled up" signal fires only on the specific completion that crosses a boundary.
**Manual verification:** on-device, using a routine seeded near a level boundary (T047), complete it across the boundary and confirm the milestone animation plays once.
**Dependencies:** T039, T041.
**Commit message:** `feat: wire level-up milestone animation`

---

## Phase 7 — Tasks

### T043 — Task repository
**Goal:** CRUD data access for `task`.
**Files/areas:** `src/data/repositories/taskRepository.ts`.
**Acceptance criteria:** create/update/complete/undo/soft-delete operations; query helpers for overdue/today/upcoming/undated/completed per `docs/DATA_MODEL.md`.
**Required automated tests:** repository tests for each operation and each query helper against a real test DB, including overdue derivation across a date boundary using an injected fixed clock; a test asserting renaming a task's title does not change its `id`.
**Manual verification:** none (no UI yet).
**Dependencies:** T009, T010.
**Commit message:** `feat: add task repository`

### T044 — Task service
**Goal:** orchestrate task creation, edit, completion, undo, move-to-tomorrow, move-to-date, and deletion.
**Files/areas:** `src/services/taskService.ts`.
**Acceptance criteria:** completion sets `is_completed`/`completed_at`; undo clears both; move updates `date`; deletion soft-deletes, preserving completed-task history per `docs/MVP_SCOPE.md`.
**Required automated tests:** service tests for each action, plus an overdue-recalculation test using an injected clock advancing past a task's date.
**Manual verification:** none yet (UI next).
**Dependencies:** T043.
**Commit message:** `feat: add task service`

### T045 — Create/edit task form
**Goal:** the task creation/edit screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/task/create.tsx`, `app/task/[id]/edit.tsx`.
**Acceptance criteria:** visible fields title/category/optional date/optional time; collapsed optional description; task creatable with no date.
**Required automated tests:** component test asserting save is enabled with only a title (all else optional).
**Manual verification:** on-device, create a task with no date and confirm it appears in the Ohne Datum section once T046 exists.
**Dependencies:** T044, T017.
**Commit message:** `feat: add create and edit task screens`

### T046 — Tasks screen
**Goal:** the five-section Tasks screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/tasks.tsx` (replacing the Phase 0 placeholder).
**Acceptance criteria:** sections Überfällig/Heute/Demnächst/Ohne Datum/Erledigt in that order, Erledigt collapsed by default, date/time-based sorting within sections, completion control (toggling it also serves as undo) and overflow menu per card, overdue tasks visually flagged but not aggressively (per `docs/DESIGN_SYSTEM.md` accessibility rules).
**Required automated tests:** component test asserting a task with a past date appears in Überfällig and a completed task appears only in Erledigt.
**Manual verification:** on-device, create one task per section scenario (overdue, today, upcoming, undated), complete one, confirm it moves to the collapsed Erledigt section and the section expands on tap; tap it again to undo and confirm it returns to its original section.
**Dependencies:** T045.
**Commit message:** `feat: add Tasks screen with sectioned list`

---

### T047 — Dev-only seed data utility
**Goal:** a development-only script to populate representative routines, tasks, and event history for manual testing of streaks/levels/sections. Simplified from an earlier draft that added a runtime `--confirm` flag and a "refuses to run against production" guard with its own test: since this script is never imported by any app runtime code (it is invoked directly via an npm script, not through the app's module graph), it structurally cannot ship in a release build — a stronger guarantee than a runtime check, and one that needs no extra code or test to maintain.
**Files/areas:** `scripts/devSeed.ts`, an npm script (`npm run seed:dev`).
**Acceptance criteria:** running it against a fresh dev build populates a handful of routines (including one near a joker boundary and one near a level-up) and tasks across all five sections.
**Required automated tests:** none — this is a standalone dev script outside the app's module graph, not application logic; T060's release-build check independently confirms the production bundle contains no dev-only code path.
**Manual verification:** run `npm run seed:dev` against a dev build on an emulator, confirm the Today/Routines/Tasks screens populate as expected.
**Dependencies:** T030, T044.
**Commit message:** `chore: add dev-only seed data utility`

---

## Phase 8 — Today Screen Integration

### T048 — Today screen header
**Goal:** finalize the header per `docs/SCREEN_SPECIFICATIONS.md`: time-based greeting, current date, overall streak (from T040), daily routine progress.
**Files/areas:** `app/(tabs)/today.tsx` header section.
**Acceptance criteria:** greeting text changes by time of day; date is current; a routine-progress indicator (e.g. "3/5 completed today") is shown.
**Required automated tests:** unit test for the greeting-selection function across morning/afternoon/evening boundaries.
**Manual verification:** on-device, check the greeting text at different times (or via a mocked clock in dev) and confirm the date and progress count are correct.
**Dependencies:** T040.
**Commit message:** `feat: finalize Today screen header`

### T049 — Today screen combined ordering and "For later" section
**Goal:** combine routines and tasks in the specified order, plus the "For later" section, replacing the Phase 5/6 routines-only slice.
**Files/areas:** `app/(tabs)/today.tsx`.
**Acceptance criteria:** content order is Routines → Tasks → For later, exactly as `docs/SCREEN_SPECIFICATIONS.md` specifies; completed items remain visible in a subdued state and sort toward section end; "For later" surfaces undated/future items appropriately.
**Required automated tests:** component test asserting section ordering and that a completed routine/task renders in its subdued variant.
**Manual verification:** on-device, with a mix of routines and tasks (using T047's seed data), confirm the full Today screen matches the specified order and subdued-completed behavior.
**Dependencies:** T033, T046, T048.
**Commit message:** `feat: combine routines, tasks, and for-later sections on Today screen`

### T050 — Floating create button and type-selection sheet
**Goal:** the global create entry point per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `src/ui/components/CreateFab.tsx`, wired into the tab layout (`app/(tabs)/_layout.tsx`).
**Acceptance criteria:** floating button visible across tabs, opens a sheet (via T017's Sheet) offering "Routine" / "Aufgabe," each navigating to its respective create screen (T031 / T045).
**Required automated tests:** component test asserting the sheet opens on tap and each option navigates correctly (mocked navigation).
**Manual verification:** on-device, tap the floating button from each tab, confirm the sheet appears consistently and both options open the correct create screen.
**Dependencies:** T031, T045, T017.
**Commit message:** `feat: add floating create button with type selection`

---

## Phase 8b — Design Polish (design reference implementation)

Brings every existing screen up to the visual level of `docs/design_reference.png` (see `docs/DESIGN_SYSTEM.md`'s Reference Image section). This phase is sequenced before Phase 9; task IDs continue after T061 so every ID in this file stays unique. All icons come from `@expo/vector-icons` (Ionicons), which is already a dependency — no new external dependencies. Where the mockup shows data the MVP data model does not have (e.g. per-routine duration "20 Min."), the closest existing field is rendered instead (the optional time of day) — a deliberate adaptation, not a silent scope change.

### T062 — Design tokens and icon badge groundwork
**Goal:** the shared visual building blocks the rest of the phase reuses: a soft-shadow/elevation token, an icon-size scale, and a reusable rounded icon container per the mockup's card icons.
**Files/areas:** `src/ui/theme/` (new `shadows.ts` and icon-size additions, exported via `index.ts`), `src/ui/components/IconBadge.tsx` (rounded container rendering an Ionicons icon on a tinted background), `docs/DESIGN_SYSTEM.md` if token guidance needs extending.
**Acceptance criteria:** `IconBadge` renders a given Ionicons name inside a rounded container with configurable tint (category variant colors or neutral); shadow token produces the mockup's low-contrast elevation on `Card` without changing existing card layouts; no raw shadow/size literals in later phase tasks.
**Required automated tests:** component test for `IconBadge` (renders icon, applies tint); token test additions in `src/ui/theme/__tests__/tokens.test.ts`.
**Manual verification:** dev preview screen (T019) shows `IconBadge` variants alongside existing primitives.
**Dependencies:** T013, T015.
**Commit message:** `feat: add shadow tokens and icon badge primitive`

### T063 — Category icons
**Goal:** categories carry an icon (mockup shows a book for Persönliche Entwicklung, a walker, a basket, etc.), selectable in the category form and rendered wherever the category appears.
**Files/areas:** `src/data/db/schema.ts` (nullable `icon` text column on `category`), new versioned migration + migration test proving existing rows survive with `NULL` icon, `src/data/repositories/categoryRepository.ts`, `src/ui/components/CategoryForm.tsx` (picker over a curated Ionicons set), a fallback icon for categories without one, `src/ui/components/CategoryBadge.tsx`/`IconBadge` call sites.
**Acceptance criteria:** creating/editing a category lets the user pick from a curated icon set; existing categories keep working and render the fallback icon; the icon shows in category management, category badges, and (via later tasks) card icon containers.
**Required automated tests:** migration test (pre-migration seeded DB keeps its categories, `icon` is NULL); repository test for icon round-trip; CategoryForm component test for icon selection.
**Manual verification:** on-device, edit an existing category, pick an icon, and confirm it appears in category management and on cards after later tasks land.
**Dependencies:** T062, T022, T024.
**Commit message:** `feat: add selectable category icons`

### T064 — Today header redesign
**Goal:** match the mockup's header: large greeting with the date below it, a compact "Gesamt-Streak" card top-right with a flame icon, and a "Heutige Routinen" card containing a progress bar plus "x von y erledigt".
**Files/areas:** `app/(tabs)/today.tsx` (header section), reusing `ProgressBar` (T017) and the streak-burst animation wiring from T041 (the burst now scales the streak card).
**Acceptance criteria:** greeting/date/streak/progress render as in the mockup; the streak card keeps testID `today-app-streak` behavior (count still correct, first-completion burst still animates it); progress text reads "x von y erledigt" and the bar fills proportionally.
**Required automated tests:** update `today.test.tsx` header assertions (streak value, progress text format, progress bar value).
**Manual verification:** on-device, complete a routine and confirm the progress bar and count update and the streak card bursts on the day's first completion.
**Dependencies:** T048, T040.
**Commit message:** `feat: redesign Today header to design reference`

### T065 — Routine card redesign with real streak
**Goal:** match the mockup's routine cards: category-tinted card background (light variant stops), rounded icon container with the category icon, subtitle line "Zeit · Häufigkeit" (e.g. "20:00 · Jeden Tag"), a flame + "Streak N" line fed by the routine's real `routine_state_cache` streak (replacing the hardcoded `streak={0}` placeholder from T033), and a completion circle tinted by category (outlined when pending, filled with a checkmark when completed).
**Files/areas:** `src/ui/components/RoutineCard.tsx`, `app/(tabs)/today.tsx` (load state caches for due routines), possibly a small `listRoutineStateCaches` helper in `src/data/repositories/routineStateCacheRepository.ts`.
**Acceptance criteria:** card background uses the routine's stable category variant (T014) with readable text contrast; icon container shows the category icon (fallback when none); subtitle shows optional time and a human schedule label ("Jeden Tag" / weekday initials / "3x pro Woche"); streak line shows the real current streak; completed/exceeded/skipped cards stay visible in the subdued state; completion control behavior (tap/long-press, animations, haptics) is unchanged.
**Required automated tests:** RoutineCard tests for schedule label variants and streak rendering; today.test.tsx asserting the real cache streak reaches the card.
**Manual verification:** on-device with seed data (T047), confirm tinted cards per category, correct streaks, and unchanged completion interactions.
**Dependencies:** T062, T063, T037, T033.
**Commit message:** `feat: redesign routine cards to design reference`

### T066 — Task card redesign
**Goal:** match the mockup's task rows: rounded icon container (category icon, neutral fallback), title with a short subtitle ("Heute", the date, or "Für später"), circle completion toggle on the right, and a bookmark icon on "Für später" entries; task cards stay visually more neutral than routine cards per `docs/DESIGN_SYSTEM.md`.
**Files/areas:** `src/ui/components/TaskCard.tsx`, `app/(tabs)/today.tsx`, `app/(tabs)/tasks.tsx`.
**Acceptance criteria:** icon container + subtitle render on both Today and Tasks screens; the overdue label remains a text label (color never the sole signal); For-later cards show the bookmark; completion toggle/undo, overflow menu, and all existing testIDs keep working.
**Required automated tests:** TaskCard tests for subtitle variants and the bookmark; existing tasks/today screen tests updated where markup changed.
**Manual verification:** on-device, check Today's Aufgaben/Für später sections and the Tasks tab against the mockup.
**Dependencies:** T062, T063, T046, T049.
**Commit message:** `feat: redesign task cards to design reference`

### T067 — Floating tab bar and FAB polish
**Goal:** match the mockup's bottom navigation: a rounded, floating card-style tab bar with the active tab highlighted by a soft green pill, and the create FAB overlapping the content just above it.
**Files/areas:** `app/(tabs)/_layout.tsx` (custom `tabBarStyle`/item styling), `src/ui/components/CreateFab.tsx` (position relative to the floating bar).
**Acceptance criteria:** tab bar floats with rounded corners and the soft shadow token; active tab shows label+icon in accent green with a pill background; FAB does not overlap the bar's touch targets; all four tabs remain reachable and the FAB sheet still works.
**Required automated tests:** existing CreateFab tests still pass; smoke render test of the tab layout if practical.
**Manual verification:** on-device, verify bar/FAB appearance on tall and short screens and that Android back/gesture navigation does not clip the floating bar.
**Dependencies:** T062, T050.
**Commit message:** `feat: restyle tab bar and floating create button`

### T068 — Routine form redesign
**Goal:** match the mockup's Neue Routine screen: labeled sections; icon-leading name input; category selector row with icon and chevron; frequency as three side-by-side option cards (Täglich / Wochentage / 3x pro Woche) with calendar icons and a green selected outline; weekday selection as circular Mo–So toggles inside a sub-card; time row with clock icon; "Weitere Einstellungen" as a collapsible row; a dashed-outline "+ Neue Kategorie erstellen" button; a full-width green Speichern button; stack header with a circular back button and centered title.
**Files/areas:** `src/ui/components/RoutineForm.tsx` (restyle existing controls — behavior and testIDs stay), `app/routine/create.tsx`, `app/routine/[id]/edit.tsx`, shared stack header options (`app/_layout.tsx`).
**Acceptance criteria:** every existing form behavior (validation, weekly-target suggestion, weekday toggling, advanced section, save) works unchanged under the new styling; the form remains usable with the keyboard open; header shows back button + centered title on create and edit.
**Required automated tests:** existing RoutineForm/create/edit tests pass (updated only where markup changed); new assertions for the selected-frequency-card state.
**Manual verification:** on-device, create and edit a routine end-to-end and compare each section against the mockup's middle screen.
**Dependencies:** T062, T063, T031.
**Commit message:** `feat: redesign routine form to design reference`

### T069 — Routine detail hero and stat tiles
**Goal:** match the mockup's detail screen top: a category-tinted hero card (large icon badge, category chip, flame streak with "N Tage", a level badge with the rank number next to the level name and "Level N", "Noch X Abschlüsse bis Level Y" with "n / 66" and the progress bar), a row of stat tiles below it (Streak / Rekord / Wiederholungen with flame/trophy/repeat icons), and outlined "Bearbeiten" (green, pencil) and "Pausieren"/"Reaktivieren" (orange, pause) action buttons; joker inventory remains visible pre-66 (moved into the hero or a tile — it must not be dropped).
**Files/areas:** `app/routine/[id]/index.tsx`, small presentational components as needed (e.g. `src/ui/components/StatTile.tsx`), header with back button + routine name + overflow.
**Acceptance criteria:** hero shows the real cache values including the "Noch X Abschlüsse bis Level Y" remaining-count line; stat tiles show current streak, best streak (Rekord), total completions (Wiederholungen); level-up animation from T042 still plays on the hero; edit navigates to the edit screen; pause/reactivate works from the action button and reflects paused state.
**Required automated tests:** detail-screen tests updated for the new structure (streak "Tage" text, remaining-to-next-level computation, tiles, action buttons); a unit assertion for the remaining-completions computation (66 − totalCompletions % 66).
**Manual verification:** on-device with a seeded near-level-boundary routine (T047), verify hero numbers, tiles, and both action buttons against the mockup's right screen.
**Dependencies:** T062, T063, T039, T034.
**Commit message:** `feat: redesign routine detail hero and stats`

### T070 — Calendar status icons and legend
**Goal:** match the mockup's calendar: each day cell shows a status icon (green check = erledigt, red x = verpasst, purple circle = übersprungen, gold star = joker-geschützt, pause bars = pausiert, dash = nicht fällig), today gets a ring highlight, and a legend row below the calendar explains every symbol; joker-protected becomes a distinct calendar state (currently folded into other states, deferred by T034).
**Files/areas:** `src/domain/routines/calendar.ts` (+ tests) adding a `joker_protected` day state, `src/ui/components/RoutineCalendar.tsx` (icon cells, today ring, legend), `app/routine/[id]/index.tsx` (unchanged wiring).
**Acceptance criteria:** every `CalendarDayState` maps to a distinct icon+color pair (satisfying the color-never-sole-signal rule); joker-protected days render the star; the legend lists Erledigt/Verpasst/Übersprungen/Joker/Pausiert; retroactive completion via day tap (T034) still works on missed days.
**Required automated tests:** domain tests for the new `joker_protected` state derivation; RoutineCalendar component tests for icon-per-state and the legend.
**Manual verification:** on-device with seed data containing a joker-protected day, walk months back and forth and check each state's icon and the legend against the mockup.
**Dependencies:** T062, T036, T034.
**Commit message:** `feat: add calendar status icons and legend`

---

## Phase 9 — Backup and Restore

### T051 — Backup export service
**Goal:** serialize all persistent tables plus a manifest into a single JSON file, per `docs/ARCHITECTURE.md`'s Backup and Restore Architecture.
**Files/areas:** `src/data/backup/export.ts`.
**Acceptance criteria:** exported file includes every table from `docs/DATA_MODEL.md` plus a manifest (`schemaVersion`, `exportedAt`, `appVersion`); uses `expo-file-system` to write and `expo-sharing` to share out.
**Required automated tests:** test asserting the exported JSON contains one entry per expected table and a well-formed manifest, against a seeded test DB.
**Manual verification:** none yet (UI in T055).
**Dependencies:** T009, all repositories through Phase 7.
**Commit message:** `feat: add backup export service`

### T052 — Backup validation logic
**Goal:** validate a backup file's manifest and structure before any write, per `docs/DATA_PERSISTENCE.md`.
**Files/areas:** `src/data/backup/validate.ts`.
**Acceptance criteria:** rejects a future/unsupported `schemaVersion` with a clear, typed error before touching the database; rejects structurally malformed files (missing required tables/fields) with a distinct error type.
**Required automated tests:** tests covering a valid backup, a future-schema-version backup, and a structurally malformed backup, each asserting the correct error type and that no database write occurs.
**Manual verification:** none (pure validation logic).
**Dependencies:** T051.
**Commit message:** `feat: add backup validation logic`

### T053 — Automatic pre-import safety backup
**Goal:** every import first writes an automatic, app-private safety backup, per `docs/DATA_PERSISTENCE.md`.
**Files/areas:** `src/data/backup/safetyBackup.ts`.
**Acceptance criteria:** invoking the import flow always produces a timestamped safety backup file in app-private storage before any import logic runs, using T051's export function internally.
**Required automated tests:** test asserting a safety backup file exists and is a valid export (per T051's own shape assertions) before import proceeds.
**Manual verification:** none yet (full flow verified in T055).
**Dependencies:** T051.
**Commit message:** `feat: add automatic pre-import safety backup`

### T054 — Staged/transactional import with rollback
**Goal:** import a validated backup by building a fully-populated temporary SQLite file (applying any schema-version upgrade migrations to it first) and atomically renaming it over the live database only after it is completely written and re-verified — never writing into the live file directly — per `docs/ARCHITECTURE.md`'s Backup and Restore Architecture.
**Files/areas:** `src/data/backup/import.ts`.
**Acceptance criteria:** a successful import fully replaces live data with backup contents; a crash or failure at any point *before* the atomic rename leaves the live database completely untouched by construction, not merely by rollback; the T053 safety backup remains available as a second line of defense for the narrow window around the rename itself.
**Required automated tests:** tests for successful import round-trip, and for a deliberately-corrupted-mid-import scenario asserting the live database is unchanged afterward and the safety backup remains available.
**Manual verification:** none yet (UI + full on-device cycle in T055).
**Dependencies:** T052, T053.
**Commit message:** `feat: add transactional backup import with rollback`

### T055 — Settings export/import UI
**Goal:** expose export and import per `docs/SCREEN_SPECIFICATIONS.md`'s Settings screen.
**Files/areas:** `app/(tabs)/settings.tsx` (extends T023's shell).
**Acceptance criteria:** "Export backup" triggers T051 and the OS share sheet; "Import backup" lets the user pick a file, runs T052–T054, and shows a clear success or failure message; a failed import explicitly confirms to the user that no data was lost.
**Required automated tests:** component test asserting the import failure state renders the "your data is safe" confirmation message.
**Manual verification:** on-device, export a backup, uninstall and reinstall the app, import the backup, and confirm every routine (with correct streak/level/history), task, and category is restored exactly as before.
**Dependencies:** T023, T054.
**Commit message:** `feat: add export and import UI to Settings screen`

---

## Phase 10 — Polish and Release Readiness

### T056 — Visual consistency and motion tuning pass
**Goal:** audit every screen against `docs/DESIGN_SYSTEM.md` and correct any drift accumulated across feature phases.
**Files/areas:** cross-cutting, primarily `src/ui/components/*` and screen-level style usage.
**Acceptance criteria:** an explicit per-screen checklist (Today, Routines, Routine detail, Tasks, Settings, Category management, all create/edit forms) is walked and signed off against: no inline magic numbers outside `src/ui/theme`, animation durations within T018's bounds, consistent spacing/typography/corner-radius. If auditing surfaces more drift than expected, split remaining screens into follow-up tasks rather than let this one grow unbounded.
**Required automated tests:** none beyond existing suite (visual audit task); optionally a lint rule addition preventing raw color/spacing literals outside `src/ui/theme`.
**Manual verification:** walk the per-screen checklist above on-device against `docs/DESIGN_SYSTEM.md` and note/fix any inconsistency.
**Dependencies:** all Phase 2–9 UI tasks.
**Commit message:** `chore: visual consistency and motion tuning pass`

### T057 — Empty states
**Goal:** ensure every list-based screen has a proper empty state using T017's `EmptyState` component.
**Files/areas:** `today.tsx`, `routines.tsx`, `tasks.tsx`, category management.
**Acceptance criteria:** each screen shows a friendly, on-brand empty state (no mascots) when it has no items, instead of a blank area.
**Required automated tests:** component test per screen asserting the empty state renders when the underlying query returns zero items.
**Manual verification:** on a fresh, unseeded install, visit each tab and confirm an appropriate empty state appears.
**Dependencies:** T017, T049, T032, T046, T024.
**Commit message:** `feat: add empty states to list screens`

### T058 — Accessibility review
**Goal:** verify the accessibility requirements in `docs/DESIGN_SYSTEM.md`: category color never the sole information carrier, adequate text contrast on pastel backgrounds, comfortable touch targets, distinct/confirmed destructive actions.
**Files/areas:** cross-cutting; likely small fixes to `CategoryBadge`, card status indicators, and touch-target sizing in `Button`/`CompletionControl`.
**Acceptance criteria:** every status shown via color also has an icon/label/shape distinction; contrast checked against pastel backgrounds meets a documented minimum (e.g. WCAG AA for text); all interactive targets meet a minimum touch-target size (e.g. 44x44dp); every destructive action requires confirmation.
**Required automated tests:** a component test asserting a destructive action (e.g. delete category/routine/task) cannot complete without confirmation.
**Manual verification:** on-device, use Android's accessibility scanner (or TalkBack spot-check) across the main screens; manually verify color-blind-safe status distinction on category-colored cards.
**Dependencies:** T056.
**Commit message:** `fix: address accessibility review findings`

### T059 — Performance review
**Goal:** confirm the app remains responsive with realistic-to-heavy data volumes (long-running routines with large event histories, many tasks). Independent of T058 (accessibility) — both are separate concerns that only share T056 as a common prerequisite and can run in either order or in parallel.
**Files/areas:** query layer (React Query cache keys/pagination as needed), list rendering (`FlatList`/virtualization checks).
**Acceptance criteria:** Today/Routines/Tasks screens remain smooth with a seeded dataset of at least one year of daily routine events across several routines and several hundred tasks; no unbounded full-table loads on every render.
**Required automated tests:** a benchmark-style test asserting a bulk query (e.g. calendar month load) stays under a defined time budget against a large fixture dataset.
**Manual verification:** on-device, using a heavy dataset generated via a temporary extension of T047's seed script (not shipped), scroll through Routines, Tasks, and a routine's yearly calendar and confirm no visible jank or long freezes.
**Dependencies:** T056.
**Commit message:** `perf: address performance review findings`

### T060 — Android release build configuration
**Goal:** configure a signed, installable Android release build, per `docs/MVP_SCOPE.md`'s platform scope and `docs/IMPLEMENTATION_PLAN.md` Phase 10.
**Files/areas:** `eas.json` (or local Gradle release config if EAS is not used), app signing configuration, version/build-number scheme; confirms T019's dev-only preview screen is excluded from this build (T047's seed script needs no such check — see T047's note on why it structurally cannot ship).
**Acceptance criteria:** a release build can be produced via a single documented command; the resulting APK/AAB installs on a physical Android device outside of Expo Go/dev-client; dev-only routes are unreachable/absent in this build.
**Required automated tests:** none (build configuration task); a CI-equivalent check that the release build command completes successfully counts as its verification.
**Manual verification:** install the produced release build on a physical Android device via `adb install` (or equivalent) and confirm the app launches and the dev-only preview screen is not reachable.
**Dependencies:** T058, T059.
**Commit message:** `chore: configure Android release build`

### T061 — Full manual regression pass
**Goal:** execute the aggregated manual regression checklist (every phase's manual verification steps, plus `docs/IMPLEMENTATION_PLAN.md`'s phase-exit checkpoints) against the release build from T060.
**Files/areas:** none (verification-only task); any bugs found are filed as new, separately scoped follow-up tasks rather than fixed inline, to keep this task itself small and verifiable.
**Acceptance criteria:** every item in the aggregated checklist passes on a physical Android device running the signed release build; any failure is documented as a new task rather than patched ad hoc.
**Required automated tests:** none (manual task); confirms the full `npm run verify` suite is green as a precondition.
**Manual verification:** the entire aggregated checklist itself — run every manual verification step from T001–T060 relevant to shipped functionality, in one pass, on the release build.
**Dependencies:** T060.
**Commit message:** `docs: record full manual regression pass results`

---

## Phase 11 — Quiet Atelier Design Refactor

Replaces the "Soft Momentum" visual direction implemented through Phase 2 and Phase 8b with "Quiet Atelier" (see `docs/DESIGN_SYSTEM.md`): charcoal-on-stone neutrals, a single antique-gold accent, near-square corners, hairline dividers instead of cards/shadows, a serif display face used sparingly, and typographic (not graphic/gamified) streak display. No schema changes are expected — `category.base_color` and `color_variant_seed` remain in the data model but stop being used for UI tinting.

### T071 — Replace `docs/DESIGN_SYSTEM.md` with the Quiet Atelier direction
**Goal:** land the Quiet Atelier direction as the new source of truth, replacing every Soft Momentum reference.
**Files/areas:** `docs/DESIGN_SYSTEM.md` (done), `CLAUDE.md`'s Design Direction section (done).
**Acceptance criteria:** both files describe Quiet Atelier consistently; no remaining Soft Momentum description in either.
**Required automated tests:** none (docs-only).
**Manual verification:** none.
**Dependencies:** none.
**Commit message:** `docs: replace Soft Momentum with Quiet Atelier design direction`

### T072 — Rework design tokens
**Goal:** replace `src/ui/theme/colors.ts`/`radius.ts`/`spacing.ts`/`typography.ts` with the Quiet Atelier token set (color table, 2/4/999 radius scale, 8/12/20/32/48 spacing, serif+sans font pair); remove the pastel palette-family tokens and the shadow/elevation token added in T062.
**Files/areas:** `src/ui/theme/*`.
**Acceptance criteria:** token tests updated to assert the new values; no consumer left referencing removed tokens (compile-clean).
**Required automated tests:** token shape/value tests.
**Manual verification:** none (no UI yet in isolation).
**Dependencies:** T071.
**Commit message:** `feat: replace design tokens with Quiet Atelier values`

### T073 — Retire category color tinting
**Goal:** stop using `category.base_color` / `color_variant_seed` for UI tinting anywhere (`categoryVariant.ts` consumers); keep the schema columns and repository fields untouched (no migration — data is simply no longer rendered as a tint) per the "don't delete persistent data to solve a styling problem" rule.
**Files/areas:** `src/ui/theme/categoryVariant.ts` (mark unused/retained for data compatibility, or remove UI-facing exports while keeping the pure function + its tests for potential future use), `src/ui/components/CategoryBadge.tsx`, `src/ui/components/IconBadge.tsx` (tint prop becomes neutral-only).
**Acceptance criteria:** no screen renders a category-colored background/badge/tint; category icon still renders in neutral/hairline style; existing category data (base_color, icon) is unaffected in the DB.
**Required automated tests:** updated component tests for `CategoryBadge`/`IconBadge` asserting neutral rendering regardless of category color.
**Manual verification:** on-device, confirm categories no longer show colored tints anywhere they previously did.
**Dependencies:** T072.
**Commit message:** `refactor: remove category color tinting from UI`

### T074 — Restyle core primitives (Card, Button, CompletionControl)
**Goal:** `Card` becomes a plain hairline-divided surface (no shadow/elevation); `Button` gets solid-primary/underlined-secondary/destructive variants per the new style; `CompletionControl` visual becomes an outline glyph → gold check + underline draw-in (interaction/callback contract unchanged from T016).
**Files/areas:** `src/ui/components/Card.tsx`, `Button.tsx`, `CompletionControl.tsx`, `src/ui/animation/useCompletionAnimation.ts` (swap scale/bounce for underline draw-in fade).
**Acceptance criteria:** existing tap/long-press callback tests still pass unchanged; new visual-variant tests assert no shadow/tint styles remain and the new completion visual is gold-underline-based; reduced-motion still yields an instant state change.
**Required automated tests:** updated component tests per component listed above.
**Manual verification:** dev preview screen (T019) shows the restyled primitives.
**Dependencies:** T072.
**Commit message:** `feat: restyle Card, Button, and CompletionControl to Quiet Atelier`

### T075 — Redesign RoutineCard and TaskCard as hairline list rows
**Goal:** remove category-tinted backgrounds, rounded icon containers, and colorful badges from both cards; render as single-surface rows with a hairline divider, serif streak numeral (routines) or subtitle (tasks), and the new completion control.
**Files/areas:** `src/ui/components/RoutineCard.tsx`, `src/ui/components/TaskCard.tsx`.
**Acceptance criteria:** all existing interaction behavior (tap-to-complete, long-press-to-exceed, tap-to-open-detail, overflow menu, subdued completed state, bookmark on "For later") is unchanged; visuals match `docs/DESIGN_SYSTEM.md`'s Routine/Task Item Design section.
**Required automated tests:** existing RoutineCard/TaskCard tests updated for new markup/assertions, not behavior.
**Manual verification:** on-device with seed data (T047), confirm rows render correctly across completed/skipped/missed/paused states.
**Dependencies:** T073, T074.
**Commit message:** `feat: redesign routine and task cards as hairline list rows`

### T076 — Redesign Today screen header and progress display
**Goal:** replace the colorful streak-card/progress-bar header block with a typographic header — greeting + date in the serif face, streak as a plain serif numeral, "x von y erledigt" as text with a thin rule-based progress indicator instead of a filled bar widget.
**Files/areas:** `app/(tabs)/today.tsx` header section.
**Acceptance criteria:** `today-app-streak` testID and first-completion burst behavior (now the underline/fade treatment, not a scale burst) still function; progress text format unchanged ("x von y erledigt").
**Required automated tests:** updated header assertions in `today.test.tsx`.
**Manual verification:** on-device, complete a routine and confirm the header updates and the first-of-day feedback still fires once.
**Dependencies:** T072, T074.
**Commit message:** `feat: redesign Today header to Quiet Atelier`

### T077 — Redesign bottom navigation
**Goal:** replace the floating rounded/pill-highlighted tab bar with a flat, hairline-topped bar; active tab indicated by a small gold underline/dot instead of a filled pill.
**Files/areas:** `app/(tabs)/_layout.tsx`, `src/ui/components/CreateFab.tsx` (reposition relative to the flat bar).
**Acceptance criteria:** all four tabs remain reachable; FAB sheet still opens correctly; no floating card-style shadow remains.
**Required automated tests:** existing CreateFab/tab-layout smoke tests updated where markup changed.
**Manual verification:** on-device, verify bar/FAB on tall and short screens, and Android gesture navigation does not clip the bar.
**Dependencies:** T072, T074.
**Commit message:** `refactor: restyle bottom navigation to Quiet Atelier`

### T078 — Redesign create/edit forms (Routine, Task, Category)
**Goal:** replace colored frequency option-cards, dashed "create category" button, and rounded category-color pickers with underlined inputs, small-caps section labels, and a plain text/icon "+ New category" action; category color picker is removed or reduced to icon-only selection per T073.
**Files/areas:** `src/ui/components/RoutineForm.tsx`, `TaskForm`/task create-edit screens, `CategoryForm.tsx`.
**Acceptance criteria:** all existing form behavior (validation, weekly-target suggestion, weekday toggling, advanced/collapsible sections, save) is unchanged; category form no longer offers a color palette picker (icon-only selection remains).
**Required automated tests:** existing form tests updated for new markup/assertions; a test confirming the category color picker UI is gone.
**Manual verification:** on-device, create/edit one routine, one task, and one category end-to-end.
**Dependencies:** T073, T074.
**Commit message:** `feat: redesign create and edit forms to Quiet Atelier`

### T079 — Redesign routine detail hero and stats
**Goal:** replace the category-tinted hero card and colorful stat tiles with a typographic hero — serif streak numeral, text-based level/remaining-completions line, plain-text stat row (streak / record / total) — and underlined (not filled) edit/pause action buttons.
**Files/areas:** `app/routine/[id]/index.tsx`, `src/ui/components/StatTile.tsx` (restyled or replaced with a plain text row).
**Acceptance criteria:** all real cache-driven values (streak, best streak, total completions, level/remaining-to-next-level, joker inventory pre-66) still render correctly; level-up animation still plays, restyled to match the new motion language (fade, not a burst).
**Required automated tests:** existing detail-screen tests updated for new structure/assertions, not underlying values.
**Manual verification:** on-device with a seeded near-level-boundary routine, verify hero/stat values and both action buttons.
**Dependencies:** T073, T074, T075.
**Commit message:** `feat: redesign routine detail hero and stats to Quiet Atelier`

### T080 — Redesign calendar status indicators and legend
**Goal:** replace the multi-color status icon set (green check / red x / purple circle / gold star / pause bars) with a monochrome-plus-gold system: each day state gets a distinct glyph in ink or gold (never a distinct hue per state) so meaning comes from shape, not a rainbow of colors; legend updated to match.
**Files/areas:** `src/ui/components/RoutineCalendar.tsx`.
**Acceptance criteria:** every `CalendarDayState` still maps to a visually distinct glyph (color-never-sole-signal preserved); today's ring highlight and retroactive-completion-by-tap behavior unchanged.
**Required automated tests:** existing RoutineCalendar tests updated for the new icon/color mapping per state.
**Manual verification:** on-device with seed data containing each state (including joker-protected), walk months and check the legend.
**Dependencies:** T072, T079.
**Commit message:** `refactor: restyle calendar status icons to Quiet Atelier`

### T081 — Visual consistency pass
**Goal:** re-run the equivalent of T056 against the new direction — audit every screen for leftover Soft Momentum remnants (stray shadows, rounded-16px radii, pastel colors, category tints, spring/bounce animation) and correct drift.
**Files/areas:** cross-cutting.
**Acceptance criteria:** an explicit per-screen checklist (Today, Routines, Routine detail, Tasks, Settings, Category management, all create/edit forms) confirms no inline literals outside `src/ui/theme`, no remaining pastel/shadow/tint usage, motion durations within the new 250–350ms fade-only bounds.
**Required automated tests:** none beyond existing suite; optional lint rule confirming no raw color/radius literals outside theme files.
**Manual verification:** walk the checklist on-device.
**Dependencies:** T075, T076, T077, T078, T079, T080.
**Commit message:** `chore: Quiet Atelier visual consistency pass`

### T082 — Accessibility re-verification
**Goal:** re-run the equivalent of T058 against the new, more monochrome palette — confirm gold/rose/charcoal-on-stone contrast ratios, that every state still has a non-color signal, and touch targets remain compliant despite the visually minimal row design.
**Files/areas:** cross-cutting; likely small fixes to row padding, glyph sizing, or the missed-state dot.
**Acceptance criteria:** documented contrast check for every text/icon-on-background pairing in the new token set meets WCAG AA (or better where noted in `docs/DESIGN_SYSTEM.md`); all interactive targets remain ≥44dp; destructive actions still require confirmation.
**Required automated tests:** existing destructive-confirmation test still passes; any new contrast-dependent logic gets a unit test if applicable (most contrast verification is manual/tooling-based, not testable in Jest).
**Manual verification:** Android accessibility scanner / TalkBack spot-check across main screens; manual color-contrast check of gold-on-stone and rose-on-stone pairings.
**Dependencies:** T081.
**Commit message:** `fix: address Quiet Atelier accessibility review findings`

---

## Phase 12 — Today/Plan/Progress Redesign

Adopts the Today/Plan/Progress reference mockup shared by the user (see `docs/DESIGN_SYSTEM.md`'s Dashboard Color Freedom / Focus of the Day / Streak Ring sections and `docs/SCREEN_SPECIFICATIONS.md`'s Plan/Progress specs). Builds on top of whatever visual direction (Soft Momentum or Quiet Atelier tokens) is live on `src/ui/theme/colors.ts` at the time this phase starts — the Progress/Focus surfaces carry their own scoped color exception regardless. No schema changes are expected: Plan and Progress read existing `routine`/`routine_event`/`routine_state_cache`/`category` data; the Focus of the day card is a static, non-persisted rotation.

### T083 — Chart primitives on `react-native-svg`
**Goal:** add `react-native-svg` (the standard, Expo-compatible SVG library) as the one new dependency this phase needs, and build three reusable presentational primitives: `RingProgress` (circular arc + centered value), `AreaChart` (a simple filled line/area chart over an array of `{label, value}` points), and `DonutChart` (segmented ring + external legend).
**Files/areas:** `package.json`, `src/ui/components/RingProgress.tsx`, `AreaChart.tsx`, `DonutChart.tsx`.
**Acceptance criteria:** each component is pure/presentational (values passed as props, no data fetching); `RingProgress` clamps its value to 0–1; `DonutChart` segments always sum to the full circle regardless of rounding; all three render on the dev-only preview screen (T019) for visual iteration.
**Required automated tests:** component tests per primitive (value clamping for `RingProgress`, segment-angle math for `DonutChart`, point-to-path generation for `AreaChart`).
**Manual verification:** open the dev component preview screen and visually confirm all three render correctly at a few sample values.
**Dependencies:** none.
**Commit message:** `feat: add ring, area, and donut chart primitives`

### T084 — Four-destination navigation with embedded create button
**Goal:** replace the Heute/Routinen/Aufgaben/Einstellungen tab bar and separately-floating `CreateFab` with Heute/Plan/Progress/Me and a create button embedded in the center of the bar itself, per the mockup and `docs/SCREEN_SPECIFICATIONS.md`'s Main Navigation section.
**Files/areas:** `app/(tabs)/_layout.tsx`, `src/ui/components/CreateFab.tsx` (becomes an in-bar center control, sheet behavior unchanged), relocating `app/(tabs)/routines.tsx` → `app/routines/index.tsx` and `app/(tabs)/tasks.tsx` → `app/tasks/index.tsx` (content unchanged) since they are no longer tabs, new placeholder `app/(tabs)/plan.tsx` and `app/(tabs)/progress.tsx` (filled in by T087/T088), `app/(tabs)/settings.tsx` relabeled "Me" (icon/title only — see T089).
**Acceptance criteria:** four tabs render (Heute/Plan/Progress/Me) with the create control centered in the bar; tapping it still opens the Routine/Aufgabe sheet and navigates correctly; the relocated Routines/Tasks screens keep every existing behavior and test; nothing on Today changes yet.
**Required automated tests:** existing `routines.test.tsx`/`tasks.test.tsx` updated only for their new import paths/routes; a smoke test asserting all four tabs render; `CreateFab` tests updated for in-bar positioning if markup changed.
**Manual verification:** on-device, confirm all four tabs are reachable, the center create button opens the sheet, and both create flows still navigate correctly.
**Dependencies:** none.
**Commit message:** `feat: restructure navigation to Today/Plan/Progress/Me with embedded create button`

### T085 — Today header: shortcuts icon, notifications placeholder, Focus of the day
**Goal:** add the mockup's leading shortcuts icon (opens a sheet linking to Kategorien verwalten and Me) and trailing bell icon (opens a sheet stating notifications aren't available yet — no push infrastructure, per `docs/MVP_SCOPE.md`), a short static subtitle under the greeting, and a Focus of the day card (accent-tinted, static day-of-year-keyed prompt list, placeholder icon) between the header and the routine list.
**Files/areas:** `app/(tabs)/today.tsx`, `src/domain/focusOfTheDay.ts` (pure function: date → prompt), `src/ui/components/FocusOfTheDayCard.tsx`.
**Acceptance criteria:** both header icons open their respective sheets and are otherwise inert; the Focus of the day prompt is deterministic for a given date; the card sits above the routine list per the updated Content Order.
**Required automated tests:** unit test for the date→prompt function (deterministic, cycles through the static list); component test asserting both header sheets open on tap.
**Manual verification:** on-device, tap both header icons and confirm their sheets, and confirm the Focus of the day card renders above the routine list.
**Dependencies:** T084.
**Commit message:** `feat: add Today header shortcuts, notifications placeholder, and Focus of the day card`

### T086 — Colorful per-item icon badges on Today rows
**Goal:** match the mockup's more saturated, per-item icon badge treatment on `RoutineCard`/`TaskCard` (each item's icon badge uses its full category accent color as the fill, not just a light tint), while keeping Routines and Tasks as separate labeled sections — the mockup's single merged list is a visual-density choice, not an information-architecture requirement, and merging them would conflict with the Tasks screen's own five-section model; this is a deliberate adaptation, not a silent scope cut.
**Files/areas:** `src/ui/components/IconBadge.tsx` (optional saturated-fill mode), `RoutineCard.tsx`, `TaskCard.tsx`.
**Acceptance criteria:** icon badges render with a solid category-accent fill and a white/on-accent icon color; existing category-tinted row background, streak line, completion controls, and overflow menus are unchanged; contrast still meets `docs/DESIGN_SYSTEM.md`'s accessibility bar.
**Required automated tests:** updated `IconBadge`/`RoutineCard`/`TaskCard` component tests for the new fill styling.
**Manual verification:** on-device with seed data, compare Today's routine/task rows against the mockup's icon treatment.
**Dependencies:** T084.
**Commit message:** `feat: restyle Today row icon badges with saturated category fills`

### T087 — Plan screen
**Goal:** build the new Plan screen: a current-week day-strip (today highlighted) and, per due routine, a row of per-day completion dots across the visible week, plus two links into the relocated Routines/Tasks screens (T084).
**Files/areas:** `app/(tabs)/plan.tsx`, `src/domain/routines/weekOverview.ts` (pure function: routines + events + week → per-routine per-day dot state), `src/ui/components/WeekDayStrip.tsx`, `src/ui/components/RoutineWeekRow.tsx`.
**Acceptance criteria:** day-strip shows Mon–Sun of the current week with today highlighted; each due routine shows one dot per day of the week, styled completed/exceeded (filled accent) / missed (muted taupe) / not due or future (hollow); both manage-links navigate correctly.
**Required automated tests:** unit tests for the week-overview derivation (mixed completed/missed/not-due/future days); component test asserting the manage-links navigate.
**Manual verification:** on-device with seed data spanning the current week, confirm the dot-matrix matches each routine's actual event history.
**Dependencies:** T083, T084.
**Commit message:** `feat: add Plan screen with weekly completion overview`

### T088 — Progress screen
**Goal:** build the new Progress screen: streak-ring hero, stat tile grid, completion-over-time chart, and habit-breakdown donut, per `docs/SCREEN_SPECIFICATIONS.md`'s Progress Screen section — entirely derived from existing cached/derived data.
**Files/areas:** `app/(tabs)/progress.tsx`, `src/domain/progress/overview.ts` (pure function: routines + state caches + app streak cache → stat values, weekly completion-rate series, category breakdown), `src/ui/components/StatTile.tsx` (reused/extended from T069 if present, else added here).
**Acceptance criteria:** streak ring shows the real overall app streak; stat tiles show real completion rate (this week), longest streak across all routines, active routine count, and completions this week; the line chart plots the current week's daily completion rate; the donut groups active routines by category with a legend showing name + percentage.
**Required automated tests:** unit tests for the stat/series/breakdown derivation functions against fixture data; component test asserting the screen renders all four sections from mocked data.
**Manual verification:** on-device with seed data, confirm every number matches what's independently visible on Today/Plan/routine detail screens.
**Dependencies:** T083, T084.
**Commit message:** `feat: add Progress screen with streak ring, stats, and charts`

### T089 — Rename Settings tab to "Me"
**Goal:** update the tab's label and icon to "Me" per the mockup; screen content is unchanged.
**Files/areas:** `app/(tabs)/_layout.tsx` (tab title/icon), `app/(tabs)/settings.tsx` (on-screen title text).
**Acceptance criteria:** the tab reads "Me" with a person-style icon; the screen itself still shows "Einstellungen" content (display name, category management, backup) unchanged.
**Required automated tests:** existing `settings.test.tsx` still passes; update any assertion on the tab label if one exists.
**Manual verification:** on-device, confirm the tab shows "Me" and its content is unchanged.
**Dependencies:** T084.
**Commit message:** `feat: relabel Settings tab as Me`

### T090 — Phase 12 visual consistency and accessibility pass
**Goal:** audit the five touched/added screens (Today, Plan, Progress, relocated Routines/Tasks, Me) against `docs/DESIGN_SYSTEM.md`, including the scoped Dashboard Color Freedom exception, and confirm no drift outside that exception (no stray multi-color usage on list rows, tab bar, or forms).
**Files/areas:** cross-cutting, primarily the five screens above and the new chart/Plan/Progress components.
**Acceptance criteria:** per-screen checklist signed off; Progress/Focus surfaces are the only places using the multi-color exception; touch targets and destructive-action confirmations remain compliant per `docs/DESIGN_SYSTEM.md`'s Accessibility section.
**Required automated tests:** none beyond the existing suite (audit task).
**Manual verification:** walk the checklist on-device.
**Dependencies:** T085, T086, T087, T088, T089.
**Commit message:** `chore: Phase 12 visual consistency and accessibility pass`
