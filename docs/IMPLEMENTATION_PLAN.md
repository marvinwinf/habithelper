# Implementation Plan

This plan sequences `ROADMAP.md`'s phases into technically ordered, dependency-aware work, consistent with `ARCHITECTURE.md` and `DATA_MODEL.md`. It defines phase boundaries only; individual numbered tasks live in `TASKS.md`. No implementation begins from this document.

## Ordering Principle

Per `CLAUDE.md`/`PROJECT_PRINCIPLES.md`: small verifiable steps, migrations from the start, design system before feature screens, domain logic before complex UI. The phase order below reflects that: infrastructure → data layer → domain logic → design system → features (routines before tasks, since routines are the primary product focus) → gamification → backup → polish/release.

## Phases

### Phase 0 — Project Bootstrap
**Goal:** a running, empty Expo/TypeScript app with all quality gates wired up.
Depends on: nothing.
Contains: Expo project init, TypeScript strict config, ESLint config, Jest config, npm scripts for typecheck/lint/test, Expo Router base layout with empty tab screens, CI-equivalent local script (`npm run verify` or similar) that chains all checks.
Exit criterion: app launches on Android emulator showing four empty tabs; `typecheck`, `lint`, `test` all pass (trivially, on empty test suite) and are individually runnable.

### Phase 1 — Data Foundation
**Goal:** the local database exists, migrates, and is tested, before any feature depends on it.
Depends on: Phase 0.
Contains: `expo-sqlite` + Drizzle setup, `schema.ts` for `profile`, `category`, `routine`, `routine_event`, `routine_state_cache`, `app_streak_cache`, `task`, `schema_migrations` (per `DATA_MODEL.md`), initial migration `0001_init`, migration runner wired into app startup, first migration test harness, local profile auto-creation on first launch.
Exit criterion: app starts, creates a local DB, runs migration `0001_init` idempotently across restarts; a migration test proves a second, additive migration (e.g. a throwaway test column) preserves seeded data.

### Phase 2 — Design System
**Goal:** design tokens and core UI primitives exist before any feature screen is built, per project working rules.
Depends on: Phase 0 (does not depend on Phase 1).
Contains: color/spacing/radius/typography tokens (`DESIGN_SYSTEM.md`), category color-variant mapping function, core components (Card, Button, ProgressBar, CompletionControl, CategoryBadge, Sheet, EmptyState), base animation/haptics hooks (no feature wiring yet).
Exit criterion: a component-preview screen (dev-only, excluded from production navigation) renders every primitive in its states; component tests cover CompletionControl's tap/long-press distinction (normal vs exceeded) since that interaction is safety-critical to get right early.

### Phase 3 — Categories and Settings Shell
**Goal:** categories are fully functional end-to-end, as the smallest complete vertical slice (data + domain + UI) validating the whole stack before routines; the Settings screen becomes real (it needs to exist as a target before Categories can link into it, and display-name editing is a standalone MVP requirement with no other natural home).
Depends on: Phase 1, Phase 2.
Contains: category repository, category service (including safe-delete reassignment flow), category management screen, create/edit category form using Phase 2 primitives, Settings screen shell with display-name editing (an earlier draft of this plan omitted a task for this entirely, even though `docs/MVP_SCOPE.md` and `docs/SCREEN_SPECIFICATIONS.md` both list display name as a required Settings field).
Exit criterion: user can create, edit, and safely delete a category (with reassignment prompt) on-device; deleting an assigned category never deletes the routines/tasks referencing it (no routines/tasks exist yet, so this is verified by a unit test on the service, plus a manual check once Phase 4/7 exist); user can edit and persist their display name from Settings.

### Phase 4 — Routine Domain Logic
**Goal:** all routine scheduling and completion-state business rules exist and are proven correct in isolation, before any routine UI is built.
Depends on: Phase 1 (schema) only — this logic is pure and never touches `category_id`, so it does not need Phase 3 (Categories) to exist and can be built in parallel with it. (An earlier draft of this plan listed Phase 3 as a dependency; that was a stated-but-unused dependency contradicted by the actual task list, corrected here.)
Contains: schedule representation + occurrence-due calculation (`daily`/`weekdays`/`weekly_target`), completion state machine (`completed`/`exceeded`/`skipped`/`missed`/`moved`), retroactive completion + event superseding, pause/reactivate semantics — **excluding** streaks/jokers/levels, which are Phase 6.
Exit criterion: full unit test coverage of scheduling and completion-state rules from `ROUTINE_RULES.md` and `TEST_STRATEGY.md`'s "Core Logic Tests" list (excluding gamification items), with zero UI.

### Phase 5 — Routine Screens
**Goal:** routines are usable end-to-end without gamification visuals yet (streak numbers may show as plain integers backed by Phase 4 event replay, without joker/level polish).
Depends on: Phase 4, Phase 2.
Contains: routine repository, routine service (wires Phase 4 domain to persistence), create/edit routine flow, Routines screen (Active/Paused tabs, reorder), routine card on Today screen (routines-only slice of Today), routine detail screen skeleton (stats + calendar, without level progress bar polish).
Exit criterion: user can create a routine of each schedule type, complete/exceed/skip/move/pause/reactivate it, and see correct state persist across app restart, on a real Android device.

### Phase 6 — Gamification
**Goal:** streaks, jokers, levels, and the overall app streak are implemented, on top of the already-tested Phase 4 event model.
Depends on: Phase 5.
Contains: streak/level/joker replay algorithm, **missed-occurrence reconciliation** (the mechanism that materializes `missed`/`joker_protected`/`joker_consumed` events from the passage of time — see `docs/ARCHITECTURE.md`'s Missed-Occurrence Reconciliation; this was missing from an earlier draft of this plan, which implied joker consumption and 66-day protection were "wired" without ever specifying what writes the underlying events), `routine_state_cache`/`app_streak_cache` persistence, level rank + progress bar, overall app streak, completion animations (exceeded emphasis, first-completion-of-day burst, level-up milestone), haptics.
Exit criterion: full unit coverage of `TEST_STRATEGY.md`'s gamification test list; manual verification that a joker is consumed (via reconciliation, after a missed day) then restored correctly after a retroactive completion, on-device.

### Phase 7 — Tasks
**Goal:** tasks are fully functional, deliberately built after routines per the project's stated product focus.
Depends on: Phase 1 (schema), Phase 2 (design system). Does not depend on Phase 4–6 (tasks are architecturally independent of routine gamification, per `PROJECT_PRINCIPLES.md`). Phase 3 (Categories) is not a hard dependency either — a task can be created with `category_id` left unset — but building Phase 7 after Phase 3 is still recommended so there are real categories to pick from when manually testing the create-task form.
Contains: task repository/service, create/edit task flow, Tasks screen sections (Überfällig/Heute/Demnächst/Ohne Datum/Erledigt), completion/undo/move/reschedule, overdue derivation.
Exit criterion: all task interactions in `SCREEN_SPECIFICATIONS.md` work on-device; overdue tasks recompute correctly across a day boundary (tested by advancing device date or injecting a fixed clock in tests).

### Phase 8 — Today Screen Integration
**Goal:** the Today screen combines routines + tasks as specified, as the last screen requiring both verticals to exist.
Depends on: Phase 6, Phase 7.
Contains: greeting/date header, overall streak display, combined routine+task ordering, "For later" section, floating create button with type-selection sheet.
Exit criterion: Today screen matches `SCREEN_SPECIFICATIONS.md` section ordering and interactions; first-completion-of-day animation fires exactly once per day across routine completions from either the Today screen or routine detail.

### Phase 9 — Backup and Restore
**Goal:** export, validated import, and automatic pre-import safety backup, before the app is considered release-candidate.
Depends on: Phase 6 **and** Phase 7 — export must serialize every table, including the task table (Phase 7) and the gamification caches (Phase 6), so it cannot start until both exist. (An earlier draft of this plan described Phase 9 as running "in parallel with Phase 7," which contradicted the actual export task's dependency on the task repository; corrected here.) Can run in parallel with Phase 8, which adds no new tables.
Contains: export service, manifest + schema-version validation, staged/transactional import, automatic pre-import backup, Settings screen export/import UI, failed-import rollback.
Exit criterion: export → wipe app data → import round-trips all entities including routine event history and streak state, verified by an automated test and a manual on-device export/reinstall/import cycle.

### Phase 10 — Polish and Release Readiness
**Goal:** production-quality pass and Android release build.
Depends on: all prior phases.
Contains: visual consistency pass, motion/haptics tuning, empty states, accessibility review (contrast, touch targets, non-color-only status), performance review (large routine/task counts), Android release build configuration (EAS Build or local Gradle), full manual regression pass across every screen.
Exit criterion: signed/release Android build installs and runs cleanly on a physical device; full manual regression checklist (aggregated from every phase's manual checklist) passes.

## Dependency Graph (summary)

```
Phase 0 ─┬─▶ Phase 1 ─┬─────────────────────────────▶ Phase 4 ─┐
         │            │                                        ▼
         └─▶ Phase 2 ─┴─▶ Phase 3 ─┐                     Phase 5 ─▶ Phase 6 ─┐
                                   ├─▶ Phase 7 ────────────────────────────────┼─▶ Phase 8 ─┐
                                   │  (Phase 3 helps but isn't required)       │            ▼
                                   └────────────────────────────────────────────────────▶ Phase 9 ─▶ Phase 10
```
Phase 3 and Phase 4 both depend only on Phase 1 (+ Phase 2 for Phase 3's UI) and can be built in either order or in parallel. Phase 7 hard-depends only on Phase 1 + Phase 2. Phase 9 depends on both Phase 6 and Phase 7 having landed, since it must serialize every table including the gamification caches and the task table.

## Open Product Questions

These are gaps or ambiguities found in the existing product documentation during planning, not decisions made unilaterally here. Each has a provisional assumption so Phase 6 is not blocked, but both should be confirmed with the product owner before or during Phase 6.

1. **Does the overall app streak reset on a day with scheduled routines but zero completions?** `docs/ROUTINE_RULES.md`'s Overall App Streak section states the streak "increases when at least one routine is actually completed" and that "a day with no scheduled routines does not break" it — but it never states what happens on a day that *did* have scheduled routines and none were completed (all missed). Provisional assumption: the streak resets to 0, symmetric with routine-level streak behavior. This assumption is encoded in `docs/ARCHITECTURE.md`'s reconciliation design and should be confirmed before Phase 6 ships.
2. **What, if anything, belongs in "settings" beyond display name?** `docs/DATA_PERSISTENCE.md` lists "settings" as its own persistent-data category, but `docs/SCREEN_SPECIFICATIONS.md`'s Settings screen defines no setting beyond display name. No settings storage beyond `profile.display_name` is planned; if this is intentional, no action is needed — this is flagged only because the two source documents don't obviously agree on whether more exists.

## Major Technical Risks

1. **Streak/joker/level replay and reconciliation correctness.** The entire gamification model depends on correct event-replay logic (`ROUTINE_RULES.md` has intricate interacting rules: joker earn/consume/restore, the pre-66 vs post-66 regimes, retroactive recalculation) *and* on the reconciliation mechanism that turns elapsed time into `missed`/`joker_protected`/`joker_consumed` events correctly and in strict chronological order (see `docs/ARCHITECTURE.md`). A subtle bug in either is highly visible to the user and hard to retrofit once event data exists. Mitigation: Phase 4/6 build both in complete isolation with exhaustive unit tests before any UI touches them.
2. **Migration safety over time.** Every future schema change is a chance to corrupt or lose the user's only copy of their data (no cloud backup in MVP). Mitigation: migration tests are mandatory from Task 1 of Phase 1 onward (not deferred), and destructive changes are explicitly banned in favor of additive-then-backfill-then-drop sequences.
3. **Import/rollback correctness.** A failed or partial import is the single highest-blast-radius failure mode in the app (can destroy the user's only data copy). Mitigation: staged/transactional import + automatic pre-import backup, both required, both tested with deliberately-corrupted fixture backups.
4. **Drizzle + expo-sqlite maturity/tooling gaps.** This combination is less battle-tested than raw SQL; migration-generation edge cases or Node-test-environment incompatibilities could surface mid-project. Mitigation: Phase 1's first task explicitly validates the toolchain (migration generation + a runnable migration test) before any other work depends on it; a raw-SQL fallback is documented as a deliberate escape hatch in `ARCHITECTURE.md`.
5. **Scope creep via "just one more field/screen."** Single-developer, AI-assisted, no code review means small unreviewed scope additions compound quickly. Mitigation: `TASKS.md` tasks are deliberately small and scoped strictly to `MVP_SCOPE.md`'s included list; anything not explicitly listed there is out of scope by default.

## Validation Checkpoints

- End of Phase 1: migration test suite green; manual check that app data survives a forced app restart and a simulated interrupted migration.
- End of Phase 3: full vertical slice (schema → domain-free CRUD → UI) proven on-device — de-risks the architecture pattern before it's repeated for routines/tasks.
- End of Phase 4: 100% of non-gamification items in `TEST_STRATEGY.md`'s "Core Logic Tests" list pass, with zero UI existing yet.
- End of Phase 6: 100% of gamification items in that same list pass; manual device test of joker/streak/level scenarios per the checklist in that phase's task.
- End of Phase 9: automated backup round-trip test passes; manual export → uninstall/reinstall → import cycle passes on-device.
- End of Phase 10: full manual regression checklist passes on a physical Android device; release build artifact produced.

## Manual Android Test Checkpoints

These are checkpoint-level (phase-exit) manual tests; each individual task in `TASKS.md` also carries its own smaller manual checklist.

- **After Phase 1:** force-close the app mid-use and reopen; confirm no data loss. Reinstall the app (simulating first launch) and confirm a fresh profile/DB is created cleanly.
- **After Phase 3:** create/edit/delete a category on-device; attempt to delete a category with no references (should hard-delete) — full reassignment-flow manual check happens after Phase 5/7 once routines/tasks exist. Also: edit the display name in Settings, force-close and reopen, confirm it persisted.
- **After Phase 5:** on a physical Android device, create one routine of each schedule type, complete/skip/move/pause each, force-close and reopen, confirm state persisted correctly.
- **After Phase 6:** manually drive a routine through 5 completions (joker earned), advance the device clock (or wait) past a scheduled day without completing it so reconciliation materializes a `joker_consumed` event on next app open, then retroactively complete the missed day and confirm the joker is restored — on-device, not just in tests.
- **After Phase 7:** create tasks in each section (overdue, today, upcoming, undated), complete/undo/move one of each, confirm the Erledigt section stays collapsed by default and tasks persist after restart.
- **After Phase 8:** verify Today screen ordering (routines, tasks, for later) and that the first routine completion of the day (and only the first) triggers the streak animation, across an actual day boundary (or a manually adjusted device clock).
- **After Phase 9:** export a backup, uninstall the app, reinstall, import the backup, confirm every routine's history/streak/level and every task is restored exactly.
- **After Phase 10:** install the signed release build (not a dev build) on a physical device and run the full aggregated manual regression checklist end to end.
