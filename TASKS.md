# Tasks

Work happens in small, independently implementable and verifiable tasks,
sequenced per `docs/IMPLEMENTATION_PLAN.md`. Each task lists its goal, affected
areas, acceptance criteria, required automated tests, manual verification steps,
dependencies, and a suggested commit message.

The Android MVP (phases 0–12, tasks T001–T090) is **fully implemented**. Its
complete historical specification lives in `docs/TASKS_ARCHIVE.md` — reference
material, not required reading. Consult a phase there only when you change the
area it built; you do not need to read the whole archive to start a task.

Correction, recorded so the gap is not re-introduced: this line previously
claimed completeness while **Phase 9 (Backup and Restore, T051–T055) had never
been implemented** — `src/data/backup/` did not exist and the Settings screen
carried a `TODO(T055)` placeholder. The app had no export path at all, so an
uninstall, a lost device, or a failed migration destroyed the user's only copy
of their data, contradicting `docs/DATA_PERSISTENCE.md`'s core requirement.
Phase 9 is now implemented and the claim above is accurate.

New work is added as new tasks under **Open tasks** below, in the same format.

## Global rules for every task

- `tsc --noEmit`, ESLint, and the full Jest suite must pass before the task's commit, in addition to whatever is listed under "Required automated tests" for that task.
- Any task that changes `src/data/db/schema.ts` must include a corresponding versioned migration file and a migration test proving prior data survives (per `docs/ARCHITECTURE.md`'s Migration Strategy). See `docs/TASKS_ARCHIVE.md`'s T063 for a worked example of a post-Phase-1 schema change.

## Open tasks

_None currently. Add new tasks here using the task format from
`docs/TASKS_ARCHIVE.md` (goal, files/areas, acceptance criteria, required tests,
manual verification, dependencies, commit message)._

## Completed after the MVP

Post-MVP tasks are recorded here once merged, in the same format. The MVP's own
T001–T090 specification stays in `docs/TASKS_ARCHIVE.md`.

### T091 — Daily reminder notification
**Goal:** add one opt-in local daily reminder — the first notification in the app — scheduled on the device itself, with no server, no push token, and no remote delivery. Requested explicitly by the product owner; it takes `docs/ROADMAP.md`'s notification entry out of Future Phases as Phase 13, and retires the Today header's bell placeholder.
**Files/areas:** `src/data/db/schema.ts` + `migrations/0005_profile_reminder.sql` (`profile.reminder_enabled`, `profile.reminder_time`), `src/data/repositories/profileRepository.ts`, `src/domain/notifications/reminderTime.ts` (pure `HH:mm` parsing/normalizing), `src/services/notifications/reminderScheduler.ts` (port-injected scheduling rules) + `expoReminders.ts` (real `expo-notifications` ports), `src/services/reminderService.ts` (database ↔ schedule seam), `app/_layout.tsx` (startup sync), `app/(tabs)/settings.tsx` (reminder card), `app/(tabs)/today.tsx` (bell sheet), `app.json` (notification icon/color), plus the `expo-notifications` dependency.
**Acceptance criteria:** reminders are off by default; the Me screen switches one on at a chosen time and both apply immediately; the Android notification permission is requested when the user enables the reminder and never at startup; a refused permission is explained with a route into the system settings and does **not** erase the stored choice; the stored settings are re-applied to the OS schedule on every app start; re-syncing never stacks a second notification; the Today bell reports the reminder instead of "not available yet"; the reminder text stays gentle and never names a missed day.
**Required automated tests:** migration test proving an existing profile survives and lands on "off at 08:00"; pure tests for `HH:mm` parsing/normalizing; scheduler tests against fake ports (schedule/cancel/permission/idempotent re-sync/no prompt at startup); service tests against a real SQLite database (store, cancel, keep-choice-on-refusal, heal-from-stored); Settings screen tests (state, save, time pick, failure rollback, permission hint); Today bell tests; backup tests for a pre-0005 backup and a reminder round trip.
**Manual verification:** see the task's manual checklist (permission prompt, delivery at the chosen time, survives a restart, reminder gone after switching off, revoked permission explained).
**Dependencies:** T023 (Settings screen), T085 (Today header bell).
**Commit message:** `feat: add an opt-in daily reminder notification`
