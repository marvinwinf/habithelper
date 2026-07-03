# Tasks

Small, independently implementable and verifiable tasks for the Android MVP, sequenced per `docs/IMPLEMENTATION_PLAN.md`. Each task lists its goal, affected areas, acceptance criteria, required automated tests, manual verification steps, dependencies, and a suggested commit message.

Global rule for every task: `tsc --noEmit`, ESLint, and the full Jest suite must pass before the task's commit, in addition to whatever is listed under "Required automated tests" for that task.

No implementation begins from this document; it is the plan the Phase 0 work will follow.

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
**Required automated tests:** one placeholder test (e.g. `1 + 1 === 2`) proving the runner works; deleted once real tests exist in T024.
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
**Goal:** implement the real schema from `docs/DATA_MODEL.md` (`profile`, `category`, `routine`, `routine_event`, `routine_state_cache`, `app_streak_cache`, `task`, `schema_migrations`).
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
**Files/areas:** `src/ui/animation/useCompletionAnimation.ts`, `useStreakBurst.ts`, `src/ui/animation/haptics.ts`.
**Acceptance criteria:** each animation hook exposes a start function and completes within a bounded, short duration; haptics module wraps `expo-haptics` with named functions matching the listed trigger points (routine completion, exceeded completion, first-of-day, level milestone) — none are wired to real events yet.
**Required automated tests:** a test asserting the animation hook's exposed duration/config is within the "short" bound defined for it (a concrete numeric ceiling, e.g. ≤ 600ms).
**Manual verification:** none standalone; covered by T019.
**Dependencies:** T013.
**Commit message:** `feat: add reusable animation and haptics hooks`

### T019 — Dev-only component preview screen
**Goal:** a single screen rendering every Phase 2 primitive in its states, for fast visual iteration — explicitly excluded from the production navigation tree, satisfying the "seed/preview data clearly separated from production" rule for UI previews.
**Files/areas:** `app/_dev/component-preview.tsx` (only registered as a route when `__DEV__` is true), a small dev-only nav entry point.
**Acceptance criteria:** screen renders Card, Button (all variants), CompletionControl, ProgressBar, CategoryBadge, Sheet, EmptyState; not reachable from any tab in a release build (verified in T057).
**Required automated tests:** a render smoke test for the preview screen itself.
**Manual verification:** open the preview screen on an emulator in dev mode, visually confirm every primitive matches the Soft Momentum direction (warm off-white background, pastel rounded cards, no aggressive colors).
**Dependencies:** T015, T016, T017, T018.
**Commit message:** `chore: add dev-only design system preview screen`

---

## Phase 3 — Categories

### T020 — Category repository
**Goal:** CRUD data access for `category`.
**Files/areas:** `src/data/repositories/categoryRepository.ts`.
**Acceptance criteria:** create/read/update/soft-delete/hard-delete operations exist and match `docs/DATA_MODEL.md`'s category table definition.
**Required automated tests:** repository tests against a real test DB for each operation, including that soft-delete sets `archived_at` and hard-delete removes the row.
**Manual verification:** none (no UI yet).
**Dependencies:** T009 (schema exists), T010 (test harness pattern).
**Commit message:** `feat: add category repository`

### T021 — Category service with safe-delete logic
**Goal:** implement the reassignment-or-removal delete flow required by `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `src/services/categoryService.ts`.
**Acceptance criteria:** deleting a category with no references hard-deletes it; deleting a referenced category requires an explicit reassignment or null-out choice passed in by the caller, applied atomically with the delete.
**Required automated tests:** service tests covering unreferenced delete, referenced delete with reassignment, referenced delete with null-out, and a rejection case if neither choice is provided.
**Manual verification:** none yet (UI in T023).
**Dependencies:** T020.
**Commit message:** `feat: add category service with safe delete`

### T022 — Create/edit category form
**Goal:** the category form screen (name, base color, preview) per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/category/create.tsx`, `app/category/[id]/edit.tsx`, shared form component.
**Acceptance criteria:** form validates a non-empty name, offers the palette families from `docs/DESIGN_SYSTEM.md`, and shows a live preview using T014's variant mapping.
**Required automated tests:** component test asserting save is disabled until a name is entered.
**Manual verification:** on-device, create a category, confirm it appears in the management list (T023); edit its color and confirm the preview updates.
**Dependencies:** T021, T015, T017.
**Commit message:** `feat: add create and edit category screens`

### T023 — Category management screen
**Goal:** list/create/edit/delete entry point reachable from Settings, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/category/index.tsx`, Settings tab entry link.
**Acceptance criteria:** lists all non-archived categories, links to create/edit, triggers the safe-delete flow from T021 with a confirmation dialog for the destructive action.
**Required automated tests:** component test asserting the list renders categories from a mocked repository and that delete triggers a confirmation before calling the service.
**Manual verification:** on-device: create two categories, delete one with no references (should disappear immediately), confirm the destructive confirm dialog appears before deletion.
**Dependencies:** T022.
**Commit message:** `feat: add category management screen`

---

## Phase 4 — Routine Domain Logic

### T024 — Schedule types and occurrence-due calculation
**Goal:** pure domain logic answering "is this routine due on date X," for all three schedule types, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/schedule.ts`.
**Acceptance criteria:** correctly computes due-ness for `daily`, `weekdays`, and `weekly_target` schedules; weekly-target suggested-weekday generation is a separate, clearly named pure function.
**Required automated tests:** cases from `docs/TEST_STRATEGY.md`'s Core Logic Tests: daily routines, weekday routines, weekly target routines, days without scheduled routines.
**Manual verification:** none (pure logic, no UI).
**Dependencies:** T007 (types informed by schema), no runtime DB dependency.
**Commit message:** `feat: add routine schedule domain logic`

### T025 — Completion state machine
**Goal:** pure domain logic for normal completion, exceeded completion, conscious skip, and missed-occurrence determination, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/completion.ts`.
**Acceptance criteria:** given a routine's schedule and its event history up to a date, correctly classifies an occurrence's state; conscious skip is rejected by the function when `allow_conscious_skip` is false.
**Required automated tests:** normal completion, exceeded completion, conscious skip (allowed and disallowed), missed-occurrence detection.
**Manual verification:** none (pure logic).
**Dependencies:** T024.
**Commit message:** `feat: add routine completion state machine`

### T026 — Retroactive completion and event superseding
**Goal:** implement retroactive completion, including full recalculation triggering and event superseding, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/retroactive.ts`.
**Acceptance criteria:** marking a past occurrence complete uses the original `occurrence_date`; any prior event for that occurrence is marked `superseded_by_event_id` rather than deleted; function returns enough information for the caller to know a full recalculation is required.
**Required automated tests:** retroactive completion of a previously-missed occurrence, retroactive completion of a previously-joker-protected occurrence (asserting the joker-restoration signal is emitted — actual joker mechanics land in Phase 6, this task only proves the signal/event chain is correct).
**Manual verification:** none (pure logic).
**Dependencies:** T025.
**Commit message:** `feat: add retroactive completion and event superseding logic`

### T027 — Pause and reactivate semantics
**Goal:** pure domain logic for pause/reactivate, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/routines/pause.ts`.
**Acceptance criteria:** pausing freezes streak-relevant state (returns "no change" for streak/level/total on subsequent calculations while paused) and excludes the routine from due-occurrence calculation; reactivating resumes from prior state without loss.
**Required automated tests:** pause-then-check-due (should be false), pause-then-reactivate-preserves-totals.
**Manual verification:** none (pure logic).
**Dependencies:** T024.
**Commit message:** `feat: add routine pause and reactivate domain logic`

---

## Phase 5 — Routine Screens

### T028 — Routine repository
**Goal:** CRUD and query access for `routine` and `routine_event`.
**Files/areas:** `src/data/repositories/routineRepository.ts`, `routineEventRepository.ts`.
**Acceptance criteria:** supports create/update/soft-delete of routines, append-only insert of events, and querying events by routine and date range.
**Required automated tests:** repository tests against a real test DB for each operation, including that event rows are never updated in place (only inserted).
**Manual verification:** none (no UI yet).
**Dependencies:** T009, T010.
**Commit message:** `feat: add routine and routine event repositories`

### T029 — Routine service (non-gamification)
**Goal:** orchestrate Phase 4 domain logic with Phase 5 repositories for create, complete, exceed, skip, move, pause, reactivate, and retroactive-complete — excluding streak/joker/level calculation, deferred to Phase 6.
**Files/areas:** `src/services/routineService.ts`.
**Acceptance criteria:** each user action results in the correct `routine_event` row(s) being written; retroactive completion correctly supersedes prior events per T026.
**Required automated tests:** service-level integration tests (real test DB + real domain functions, no mocks) for each action listed above.
**Manual verification:** none yet (UI lands next).
**Dependencies:** T024–T028.
**Commit message:** `feat: add routine service for core completion actions`

### T030 — Create/edit routine form
**Goal:** the routine creation/edit screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/create.tsx`, `app/routine/[id]/edit.tsx`.
**Acceptance criteria:** visible fields Name/Kategorie/Häufigkeit/Uhrzeit; frequency options Täglich/Wochentage/X-mal pro Woche; weekly-target shows editable suggested weekdays; collapsed section for personal reason and conscious-skip toggle; "create new category" shortcut into T022's flow.
**Required automated tests:** component test asserting save is disabled until required fields are filled, and that weekly-target suggested days populate on frequency selection.
**Manual verification:** on-device, create one routine of each schedule type and confirm each saves and appears correctly typed in the database (via T028/T029).
**Dependencies:** T029, T017.
**Commit message:** `feat: add create and edit routine screens`

### T031 — Routines screen
**Goal:** Active/Paused tabbed list with reorder, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/routines.tsx` (replacing the Phase 0 placeholder).
**Acceptance criteria:** two tabs (Aktiv/Pausiert), each card shows name/category/current streak (streak displayed as a plain number for now — polish lands in Phase 6), drag-and-drop reorder persists `sort_order`, overflow menu offers edit/pause-or-reactivate/delete.
**Required automated tests:** component test asserting a paused routine appears only in the Pausiert tab.
**Manual verification:** on-device, pause a routine and confirm it moves to the Pausiert tab; drag-reorder two routines and confirm order persists after app restart.
**Dependencies:** T030.
**Commit message:** `feat: add Routines screen with active and paused tabs`

### T032 — Routine card on Today screen (routines-only slice)
**Goal:** render due routines for today with the CompletionControl, as an isolated slice ahead of full Today-screen integration (Phase 8).
**Files/areas:** `src/ui/components/RoutineCard.tsx`, temporary rendering into `app/(tabs)/today.tsx` (replaced/extended in Phase 8).
**Acceptance criteria:** shows name, category treatment, optional time, streak (plain number), completion button; tap completes, long-press exceeds (via T016); completed routines move to a subdued state at the end of the list.
**Required automated tests:** component test asserting tap calls the complete action and long-press calls the exceed action exactly once each.
**Manual verification:** on-device, complete a routine via tap and another via long-press, confirm both show correct subdued/exceeded visual states and persist after restart.
**Dependencies:** T029, T016, T031.
**Commit message:** `feat: add routine card with completion controls to Today screen`

### T033 — Routine detail screen skeleton
**Goal:** stats + calendar view, without level-progress polish (deferred to Phase 6), per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/[id]/index.tsx`.
**Acceptance criteria:** shows name/category/current streak (plain number), personal reason in a collapsible section, monthly calendar with per-day state (completed/exceeded/missed/skipped/paused/moved — joker-protected styling deferred to Phase 6), past days tappable for retroactive completion via T026/T029.
**Required automated tests:** component test asserting calendar cell states map correctly from a fixed set of mocked events.
**Manual verification:** on-device, open a routine's detail screen, retroactively complete a past missed day, confirm the calendar updates and the day is no longer shown as missed.
**Dependencies:** T029, T017.
**Commit message:** `feat: add routine detail screen with calendar history`

---

## Phase 6 — Gamification

### T034 — Streak/joker/level replay algorithm
**Goal:** the pure domain function that replays a routine's `routine_event` log into current streak, best streak, total completions, level rank, joker inventory/progress, and the post-66 tolerance window, per `docs/ROUTINE_RULES.md`.
**Files/areas:** `src/domain/streaks/replay.ts`.
**Acceptance criteria:** matches every rule in `docs/ROUTINE_RULES.md` (joker earned every 5 completions pre-66, max inventory 2, retroactive restoration, post-66 three-miss tolerance, level segments of 66).
**Required automated tests:** exhaustive coverage of `docs/TEST_STRATEGY.md`'s gamification list: joker earning, consumption, restoration, streak calculation, 66-completion protection, level progression.
**Manual verification:** none (pure logic).
**Dependencies:** T026 (event superseding semantics it must respect).
**Commit message:** `feat: add streak, joker, and level replay algorithm`

### T035 — Cache persistence wiring
**Goal:** persist `routine_state_cache` and `app_streak_cache`, recomputed via T034's replay whenever relevant events change.
**Files/areas:** `src/data/repositories/routineStateCacheRepository.ts`, `appStreakCacheRepository.ts`, wiring into `routineService.ts`.
**Acceptance criteria:** after any routine-affecting service action, the cache for that routine (and the app streak cache, if applicable) is recomputed and persisted; a cache is always re-derivable by discarding it and replaying.
**Required automated tests:** integration test that discards a routine's cache row, re-derives it from events, and asserts it matches the value produced incrementally during normal operation.
**Manual verification:** none yet (UI in T038/T039).
**Dependencies:** T034, T028.
**Commit message:** `feat: persist routine and app streak caches`

### T036 — Joker consumption and restoration integration
**Goal:** wire joker consumption into missed-occurrence handling and restoration into retroactive completion, end to end through the service layer.
**Files/areas:** `src/services/routineService.ts` (extends T029).
**Acceptance criteria:** a missed occurrence automatically consumes an available joker per `docs/ROUTINE_RULES.md`; a later retroactive completion of that occurrence restores the joker.
**Required automated tests:** service-level integration test: 5 completions → joker earned → miss a day → joker consumed → retroactively complete the missed day → joker restored, asserted via `routine_state_cache`.
**Manual verification:** none yet (manual checkpoint covered by the Phase 6 exit checklist in `docs/IMPLEMENTATION_PLAN.md`, exercised again after T038–T040 add UI).
**Dependencies:** T035.
**Commit message:** `feat: wire joker consumption and restoration into routine service`

### T037 — Post-66 protection window integration
**Goal:** wire the three-consecutive-miss tolerance and fourth-miss reset into the service layer for routines with a streak ≥ 66.
**Files/areas:** `src/services/routineService.ts` (extends T029/T036).
**Acceptance criteria:** the first three consecutive misses after streak 66 do not reset the streak; the fourth resets current streak to 0 while preserving level rank and total completions; enhanced protection re-arms only after streak reaches 66 again.
**Required automated tests:** service-level integration test covering 3 tolerated misses, a 4th triggering reset, and re-arming after reaching 66 again.
**Manual verification:** none yet (covered by Phase 6 exit checklist).
**Dependencies:** T036.
**Commit message:** `feat: wire post-66 protection window into routine service`

### T038 — Level rank and progress bar UI
**Goal:** replace the plain-number streak/level placeholders from Phase 5 with real level names and progress bars, per `docs/ROUTINE_RULES.md` and `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/routine/[id]/index.tsx` (T033), `src/ui/components/ProgressBar.tsx` usage.
**Acceptance criteria:** routine detail shows current level name (Im Aufbau/Stabil/Gefestigt/Meister), progress bar toward the next 66-completion segment, available jokers (pre-66), personal streak record, total successful completions.
**Required automated tests:** component test asserting the correct level name renders for a given `total_completions` value at each boundary.
**Manual verification:** on-device, drive a routine to a level-up (or use a seeded test routine per T045) and confirm the level name and progress bar update correctly.
**Dependencies:** T035, T033.
**Commit message:** `feat: add level name and progress bar to routine detail`

### T039 — Overall app streak UI
**Goal:** surface `app_streak_cache` on the Today screen header, per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/today.tsx` header area (temporary, extended fully in Phase 8).
**Acceptance criteria:** shows the current overall streak subtly, per the design direction (not visually dominant); updates correctly on the first actual completion of a day and not on skips/joker-protected days.
**Required automated tests:** component test asserting the streak value renders from a mocked `app_streak_cache` value.
**Manual verification:** on-device, complete a routine on a fresh day and confirm the overall streak increments by exactly one.
**Dependencies:** T035.
**Commit message:** `feat: display overall app streak on Today screen`

### T040 — Completion animations and haptics wiring
**Goal:** wire the Phase 2 animation/haptics hooks (T018) to real completion events: exceeded-completion emphasis, first-completion-of-day burst, level-up milestone.
**Files/areas:** `RoutineCard.tsx` (T032), `today.tsx` (T039), service-to-UI event signaling (e.g. a return value or query invalidation signal indicating "first of day" / "leveled up").
**Acceptance criteria:** exceeded completion plays a visibly stronger animation than normal completion; the first routine completion of a given calendar day (and only the first) triggers the streak-burst animation and haptic; a level-up triggers its own milestone animation and haptic; no animation blocks interaction beyond its short bounded duration (per T018's ceiling).
**Required automated tests:** a test asserting the "first completion of day" signal fires exactly once across multiple completions on the same day, and again on the next day.
**Manual verification:** on-device, complete two routines on the same day and confirm only the first triggers the streak-burst animation/haptic; long-press one for exceeded and confirm the stronger animation plays.
**Dependencies:** T037, T038, T039, T018.
**Commit message:** `feat: wire completion animations and haptics to routine actions`

---

## Phase 7 — Tasks

### T041 — Task repository
**Goal:** CRUD data access for `task`.
**Files/areas:** `src/data/repositories/taskRepository.ts`.
**Acceptance criteria:** create/update/complete/undo/soft-delete operations; query helpers for overdue/today/upcoming/undated/completed per `docs/DATA_MODEL.md`.
**Required automated tests:** repository tests for each operation and each query helper against a real test DB, including overdue derivation across a date boundary using an injected fixed clock.
**Manual verification:** none (no UI yet).
**Dependencies:** T009, T010.
**Commit message:** `feat: add task repository`

### T042 — Task service
**Goal:** orchestrate task creation, edit, completion, undo, move-to-tomorrow, move-to-date, and deletion.
**Files/areas:** `src/services/taskService.ts`.
**Acceptance criteria:** completion sets `is_completed`/`completed_at`; undo clears both; move updates `date`; deletion soft-deletes, preserving completed-task history per `docs/MVP_SCOPE.md`.
**Required automated tests:** service tests for each action, plus an overdue-recalculation test using an injected clock advancing past a task's date.
**Manual verification:** none yet (UI next).
**Dependencies:** T041.
**Commit message:** `feat: add task service`

### T043 — Create/edit task form
**Goal:** the task creation/edit screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/task/create.tsx`, `app/task/[id]/edit.tsx`.
**Acceptance criteria:** visible fields title/category/optional date/optional time; collapsed optional description; task creatable with no date.
**Required automated tests:** component test asserting save is enabled with only a title (all else optional).
**Manual verification:** on-device, create a task with no date and confirm it appears in the Ohne Datum section once T044 exists.
**Dependencies:** T042, T017.
**Commit message:** `feat: add create and edit task screens`

### T044 — Tasks screen
**Goal:** the five-section Tasks screen per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `app/(tabs)/tasks.tsx` (replacing the Phase 0 placeholder).
**Acceptance criteria:** sections Überfällig/Heute/Demnächst/Ohne Datum/Erledigt in that order, Erledigt collapsed by default, date/time-based sorting within sections, completion control and overflow menu per card, overdue tasks visually flagged but not aggressively (per `docs/DESIGN_SYSTEM.md` accessibility rules).
**Required automated tests:** component test asserting a task with a past date appears in Überfällig and a completed task appears only in Erledigt.
**Manual verification:** on-device, create one task per section scenario (overdue, today, upcoming, undated), complete one, confirm it moves to the collapsed Erledigt section and the section expands on tap.
**Dependencies:** T043.
**Commit message:** `feat: add Tasks screen with sectioned list`

---

### T045 — Dev-only seed data utility
**Goal:** a development-only script/hook to populate realistic routines, tasks, and event history for manual testing of streaks/levels/sections, kept strictly separate from production data paths.
**Files/areas:** `scripts/devSeed.ts` (run manually via an npm script, e.g. `npm run seed:dev`; never imported by app runtime code), gated additionally by requiring an explicit `--confirm` flag and refusing to run against a database that already contains a non-default profile display name (a guard against accidental production use).
**Acceptance criteria:** running the script against a fresh dev build populates a handful of routines (including one near a joker boundary and one near a level-up) and tasks across all five sections; the script and its code path are entirely absent from the production bundle (verified alongside T057's release build check).
**Required automated tests:** a test asserting the seed script's guard refuses to run when the safety condition isn't met.
**Manual verification:** run `npm run seed:dev` against a dev build on an emulator, confirm the Today/Routines/Tasks screens populate as expected, then confirm a release build (once T057 exists) does not include this script.
**Dependencies:** T029, T042.
**Commit message:** `chore: add dev-only seed data utility`

---

## Phase 8 — Today Screen Integration

### T046 — Today screen header
**Goal:** finalize the header per `docs/SCREEN_SPECIFICATIONS.md`: time-based greeting, current date, overall streak (from T039), daily routine progress.
**Files/areas:** `app/(tabs)/today.tsx` header section.
**Acceptance criteria:** greeting text changes by time of day; date is current; a routine-progress indicator (e.g. "3/5 completed today") is shown.
**Required automated tests:** unit test for the greeting-selection function across morning/afternoon/evening boundaries.
**Manual verification:** on-device, check the greeting text at different times (or via a mocked clock in dev) and confirm the date and progress count are correct.
**Dependencies:** T039.
**Commit message:** `feat: finalize Today screen header`

### T047 — Today screen combined ordering and "For later" section
**Goal:** combine routines and tasks in the specified order, plus the "For later" section, replacing the Phase 5/6 routines-only slice.
**Files/areas:** `app/(tabs)/today.tsx`.
**Acceptance criteria:** content order is Routines → Tasks → For later, exactly as `docs/SCREEN_SPECIFICATIONS.md` specifies; completed items remain visible in a subdued state and sort toward section end; "For later" surfaces undated/future items appropriately.
**Required automated tests:** component test asserting section ordering and that a completed routine/task renders in its subdued variant.
**Manual verification:** on-device, with a mix of routines and tasks (using T045's seed data), confirm the full Today screen matches the specified order and subdued-completed behavior.
**Dependencies:** T032, T044, T046.
**Commit message:** `feat: combine routines, tasks, and for-later sections on Today screen`

### T048 — Floating create button and type-selection sheet
**Goal:** the global create entry point per `docs/SCREEN_SPECIFICATIONS.md`.
**Files/areas:** `src/ui/components/CreateFab.tsx`, wired into the tab layout (`app/(tabs)/_layout.tsx`).
**Acceptance criteria:** floating button visible across tabs, opens a sheet (via T017's Sheet) offering "Routine" / "Aufgabe," each navigating to its respective create screen (T030 / T043).
**Required automated tests:** component test asserting the sheet opens on tap and each option navigates correctly (mocked navigation).
**Manual verification:** on-device, tap the floating button from each tab, confirm the sheet appears consistently and both options open the correct create screen.
**Dependencies:** T030, T043, T017.
**Commit message:** `feat: add floating create button with type selection`

---

## Phase 9 — Backup and Restore

### T049 — Backup export service
**Goal:** serialize all persistent tables plus a manifest into a single JSON file, per `docs/ARCHITECTURE.md`'s Backup and Restore Architecture.
**Files/areas:** `src/data/backup/export.ts`.
**Acceptance criteria:** exported file includes every table from `docs/DATA_MODEL.md` plus a manifest (`schemaVersion`, `exportedAt`, `appVersion`); uses `expo-file-system` to write and `expo-sharing` to share out.
**Required automated tests:** test asserting the exported JSON contains one entry per expected table and a well-formed manifest, against a seeded test DB.
**Manual verification:** none yet (UI in T053).
**Dependencies:** T009, all repositories through Phase 7.
**Commit message:** `feat: add backup export service`

### T050 — Backup validation logic
**Goal:** validate a backup file's manifest and structure before any write, per `docs/DATA_PERSISTENCE.md`.
**Files/areas:** `src/data/backup/validate.ts`.
**Acceptance criteria:** rejects a future/unsupported `schemaVersion` with a clear, typed error before touching the database; rejects structurally malformed files (missing required tables/fields) with a distinct error type.
**Required automated tests:** tests covering a valid backup, a future-schema-version backup, and a structurally malformed backup, each asserting the correct error type and that no database write occurs.
**Manual verification:** none (pure validation logic).
**Dependencies:** T049.
**Commit message:** `feat: add backup validation logic`

### T051 — Automatic pre-import safety backup
**Goal:** every import first writes an automatic, app-private safety backup, per `docs/DATA_PERSISTENCE.md`.
**Files/areas:** `src/data/backup/safetyBackup.ts`.
**Acceptance criteria:** invoking the import flow always produces a timestamped safety backup file in app-private storage before any import logic runs, using T049's export function internally.
**Required automated tests:** test asserting a safety backup file exists and is a valid export (per T049's own shape assertions) before import proceeds.
**Manual verification:** none yet (full flow verified in T053).
**Dependencies:** T049.
**Commit message:** `feat: add automatic pre-import safety backup`

### T052 — Staged/transactional import with rollback
**Goal:** import a validated backup into a staging area and only swap it in as live data after full success; on any failure, roll back to the pre-import state, per `docs/ARCHITECTURE.md`.
**Files/areas:** `src/data/backup/import.ts`.
**Acceptance criteria:** a successful import fully replaces live data with backup contents (including through any schema-version upgrade path via existing migrations); a failure at any point leaves the pre-existing live database completely untouched, verified by restoring from the T051 safety backup if the staged swap itself fails.
**Required automated tests:** tests for successful import round-trip, and for a deliberately-corrupted-mid-import scenario asserting the live database is unchanged afterward and the safety backup remains available.
**Manual verification:** none yet (UI + full on-device cycle in T053).
**Dependencies:** T050, T051.
**Commit message:** `feat: add transactional backup import with rollback`

### T053 — Settings export/import UI
**Goal:** expose export and import per `docs/SCREEN_SPECIFICATIONS.md`'s Settings screen.
**Files/areas:** `app/(tabs)/settings.tsx`.
**Acceptance criteria:** "Export backup" triggers T049 and the OS share sheet; "Import backup" lets the user pick a file, runs T050–T052, and shows a clear success or failure message; a failed import explicitly confirms to the user that no data was lost.
**Required automated tests:** component test asserting the import failure state renders the "your data is safe" confirmation message.
**Manual verification:** on-device, export a backup, uninstall and reinstall the app, import the backup, and confirm every routine (with correct streak/level/history), task, and category is restored exactly as before.
**Dependencies:** T052.
**Commit message:** `feat: add export and import UI to Settings screen`

---

## Phase 10 — Polish and Release Readiness

### T054 — Visual consistency and motion tuning pass
**Goal:** audit every screen against `docs/DESIGN_SYSTEM.md` and correct any drift accumulated across feature phases.
**Files/areas:** cross-cutting, primarily `src/ui/components/*` and screen-level style usage.
**Acceptance criteria:** no inline magic numbers remain outside `src/ui/theme`; animation durations remain within the bounds set in T018; spacing/typography consistent across all screens.
**Required automated tests:** none beyond existing suite (visual audit task); optionally a lint rule addition preventing raw color/spacing literals outside `src/ui/theme`.
**Manual verification:** walk every screen on-device against `docs/DESIGN_SYSTEM.md` and note/fix any inconsistency.
**Dependencies:** all Phase 2–9 UI tasks.
**Commit message:** `chore: visual consistency and motion tuning pass`

### T055 — Empty states
**Goal:** ensure every list-based screen has a proper empty state using T017's `EmptyState` component.
**Files/areas:** `today.tsx`, `routines.tsx`, `tasks.tsx`, category management.
**Acceptance criteria:** each screen shows a friendly, on-brand empty state (no mascots) when it has no items, instead of a blank area.
**Required automated tests:** component test per screen asserting the empty state renders when the underlying query returns zero items.
**Manual verification:** on a fresh, unseeded install, visit each tab and confirm an appropriate empty state appears.
**Dependencies:** T017, T047, T031, T044, T023.
**Commit message:** `feat: add empty states to list screens`

### T056 — Accessibility review
**Goal:** verify the accessibility requirements in `docs/DESIGN_SYSTEM.md`: category color never the sole information carrier, adequate text contrast on pastel backgrounds, comfortable touch targets, distinct/confirmed destructive actions.
**Files/areas:** cross-cutting; likely small fixes to `CategoryBadge`, card status indicators, and touch-target sizing in `Button`/`CompletionControl`.
**Acceptance criteria:** every status shown via color also has an icon/label/shape distinction; contrast checked against pastel backgrounds meets a documented minimum (e.g. WCAG AA for text); all interactive targets meet a minimum touch-target size (e.g. 44x44dp); every destructive action requires confirmation.
**Required automated tests:** a component test asserting a destructive action (e.g. delete category/routine/task) cannot complete without confirmation.
**Manual verification:** on-device, use Android's accessibility scanner (or TalkBack spot-check) across the main screens; manually verify color-blind-safe status distinction on category-colored cards.
**Dependencies:** T054.
**Commit message:** `fix: address accessibility review findings`

### T057 — Performance review
**Goal:** confirm the app remains responsive with realistic-to-heavy data volumes (long-running routines with large event histories, many tasks).
**Files/areas:** query layer (React Query cache keys/pagination as needed), list rendering (`FlatList`/virtualization checks).
**Acceptance criteria:** Today/Routines/Tasks screens remain smooth with a seeded dataset of at least one year of daily routine events across several routines and several hundred tasks; no unbounded full-table loads on every render.
**Required automated tests:** a benchmark-style test asserting a bulk query (e.g. calendar month load) stays under a defined time budget against a large fixture dataset.
**Manual verification:** on-device, using a heavy dataset generated via a temporary extension of T045's seed script (not shipped), scroll through Routines, Tasks, and a routine's yearly calendar and confirm no visible jank or long freezes.
**Dependencies:** T056.
**Commit message:** `perf: address performance review findings`

### T058 — Android release build configuration
**Goal:** configure a signed, installable Android release build, per `docs/MVP_SCOPE.md`'s platform scope and `docs/IMPLEMENTATION_PLAN.md` Phase 10.
**Files/areas:** `eas.json` (or local Gradle release config if EAS is not used), app signing configuration, version/build-number scheme; confirms T019's dev-only preview screen and T045/T057's seed scripts are excluded from this build.
**Acceptance criteria:** a release build can be produced via a single documented command; the resulting APK/AAB installs on a physical Android device outside of Expo Go/dev-client; dev-only routes and seed scripts are unreachable/absent in this build.
**Required automated tests:** none (build configuration task); a CI-equivalent check that the release build command completes successfully counts as its verification.
**Manual verification:** install the produced release build on a physical Android device via `adb install` (or equivalent) and confirm the app launches and the dev-only preview screen is not reachable.
**Dependencies:** T057.
**Commit message:** `chore: configure Android release build`

### T059 — Full manual regression pass
**Goal:** execute the aggregated manual regression checklist (every phase's manual verification steps, plus `docs/IMPLEMENTATION_PLAN.md`'s phase-exit checkpoints) against the release build from T058.
**Files/areas:** none (verification-only task); any bugs found are filed as new, separately scoped follow-up tasks rather than fixed inline, to keep this task itself small and verifiable.
**Acceptance criteria:** every item in the aggregated checklist passes on a physical Android device running the signed release build; any failure is documented as a new task rather than patched ad hoc.
**Required automated tests:** none (manual task); confirms the full `npm run verify` suite is green as a precondition.
**Manual verification:** the entire aggregated checklist itself — run every manual verification step from T001–T058 relevant to shipped functionality, in one pass, on the release build.
**Dependencies:** T058.
**Commit message:** `docs: record full manual regression pass results`
