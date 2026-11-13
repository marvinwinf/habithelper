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

### T091 — Progress range toggle (week / 30 days / all time)
**Goal:** the Progress screen is no longer locked to the current week. A segmented
range toggle (`Woche` / `30 Tage` / `Gesamt`) rescopes the stat tiles and the
completion-over-time chart, so a 66-completion level system has a horizon long
enough to show progress. Derived data only — no schema change.
**Files/areas:** `src/domain/routines/weekOverview.ts` (generalize `currentWeekDates`
to a `rangeDates(today, range)` helper and keep `buildRoutineWeekRows` range-agnostic —
it already takes an arbitrary `dates` array, so this is mostly a new date-range
function plus a rename-safe re-export), `src/domain/progress/overview.ts`
(`buildProgressStatTiles` / `buildDailyCompletionSeries` take the range's dates
instead of assuming 7; the "all time" series must bucket by week, not day, so the
chart stays readable), `app/(tabs)/progress.tsx` (toggle state, event loading over
the selected range, range-dependent tile labels — the current hardcoded
"Erledigungsquote (Woche)" and "Erledigt diese Woche" must follow the selection),
`src/ui/components/` (a small `SegmentedControl` if no existing primitive fits —
check `Button`/`NavRow` first and reuse rather than add), `src/ui/components/AreaChart.tsx`
(x-axis labels come from the data, not the hardcoded `WEEKDAY_LABELS` constant in
progress.tsx).
**Acceptance criteria:** the toggle defaults to `Woche` and the screen renders
exactly as today in that state; switching range updates tiles, tile labels, and the
chart; `Gesamt` covers the user's full history without loading every event per
routine individually at day granularity (use a single ranged query per routine and
weekly buckets); the donut (routines per category) is range-independent and
unchanged; the empty state still shows when there are no active routines; selection
is screen-local and need not persist across app restarts.
**Required automated tests:** domain tests for `rangeDates` (week boundary, 30-day
window, all-time start derived from the earliest event), `buildDailyCompletionSeries`
weekly bucketing, and `buildProgressStatTiles` over a non-7-day range; update
`app/(tabs)/__tests__/progress.test.tsx` to assert default-week rendering plus a
range switch changing tile labels and chart point count.
**Manual verification:** on-device with seed data, switch through all three ranges
and confirm tiles/labels/chart update, scrolling stays smooth, and no flicker or
stale data when leaving and re-entering the tab.
**Dependencies:** T081–T086 (Progress screen), T060 (chart primitives).
**Commit message:** `feat(progress): add week/30-day/all-time range toggle`

### T092 — Local daily reminder: scheduling service
**Goal:** one gentle local notification per day at a user-chosen time, as explicitly
requested by the product owner. Scheduling logic and persistence only — no UI in this
task. The reminder never names a missed day and never guilts; it is an invitation.
**Scope note:** this intentionally reverses `docs/MVP_SCOPE.md`'s "push notifications"
exclusion for *local* notifications only. Both `docs/MVP_SCOPE.md` and
`docs/ROADMAP.md` must be updated in this task to record that local reminders are in
scope while remote/push, morning reports, and evening reports stay excluded.
**Files/areas:** new `src/services/reminderService.ts` (request permission, create the
Android notification channel, schedule/reschedule/cancel a single daily trigger —
exactly one scheduled notification at a time, cancel-then-schedule on change), new
`src/data/db/schema.ts` columns on the local profile row (`reminderEnabled` integer,
`reminderTime` text `HH:mm`, both nullable/defaulted off) plus a versioned migration
and a migration test proving existing profiles survive with the reminder off,
`src/data/repositories/` (profile repository read/write for the two fields),
`src/state/databaseLifecycle.ts` or a sibling (reschedule on app start so the
reminder survives reboot/reinstall-restore), `expo-notifications` added to
`package.json` + `app.json` plugin config.
**Acceptance criteria:** reminder is off by default and nothing is scheduled until the
user enables it; enabling with a time schedules one repeating daily local
notification; changing the time replaces rather than duplicates it; disabling cancels
it; a denied OS permission leaves the stored setting off and surfaces a recoverable
error rather than throwing; no network use anywhere in the path.
**Required automated tests:** `expo-notifications` mocked in Jest setup; service tests
for enable/disable/change-time (asserting cancel-before-schedule and a single
scheduled trigger), permission-denied handling, and reschedule-on-start; migration
test; profile repository round-trip test.
**Manual verification:** on a physical Android device, enable a reminder two minutes
out, confirm it fires with the intended copy, change the time and confirm only one
fires, disable and confirm none fires, then force-stop and relaunch and confirm the
schedule survives.
**Dependencies:** T005 (profile), T003 (migration framework).
**Commit message:** `feat(reminders): schedule one local daily reminder`

### T093 — Local daily reminder: Me screen controls and bell wiring
**Goal:** the user can turn the reminder on, pick a time, and see its state. The
Today header's bell stops being a dead placeholder and becomes the entry point.
**Files/areas:** `app/(tabs)/settings.tsx` (a "Erinnerung" section: toggle + time
picker reusing the existing `@react-native-community/datetimepicker` wiring from the
routine/task forms, and a line stating the active time or that reminders are off),
`app/(tabs)/today.tsx` (bell navigates to the reminder section instead of doing
nothing; keep its existing testID), `src/ui/components/` (reuse `NavRow`/`Sheet`;
add nothing new unless unavoidable), `docs/SCREEN_SPECIFICATIONS.md` (document the
section and the bell's new behavior).
**Acceptance criteria:** toggling on prompts for OS permission once and, if granted,
persists and schedules via T092's service; if denied, the toggle returns to off with a
plain explanatory message and a hint to enable it in system settings; the time picker
is disabled while the reminder is off; the setting survives an app restart; the bell
reaches the section in one tap; copy follows the gentle tone in
`docs/DESIGN_SYSTEM.md` — no streak threats, no red.
**Required automated tests:** `app/(tabs)/__tests__/settings.test.tsx` for toggle on/off,
permission-denied revert, time change calling the service, and disabled-picker state;
`today.test.tsx` for the bell's navigation.
**Manual verification:** on-device, enable from the bell, deny permission once and
confirm the graceful revert, then grant and confirm the time shows and persists across
a restart.
**Dependencies:** T092.
**Commit message:** `feat(reminders): add reminder controls to the Me screen`

### T094 — Daypart ambience on the Today header
**Goal:** the Today screen stops looking identical at every hour. Its header gets a
pale daypart sky tint, a soft sun/moon glow, and a rotating supportive line with a
small daypart glyph, so opening the app feels alive through the day. Presentation
only — no schema change.
**Files/areas:** new `src/domain/daypart.ts` (hour → daypart, rotating lines),
new `src/ui/theme/daypart.ts` (tints from existing pastel families), new
`src/ui/components/DaypartBackdrop.tsx` (SVG wash + glow, one fade-and-rise, no
loop), `app/(tabs)/today.tsx`, `docs/DESIGN_SYSTEM.md` (Daypart Ambience exception),
`docs/SCREEN_SPECIFICATIONS.md`.
**Acceptance criteria:** daypart boundaries morning 05–10 / day 11–16 / evening
17–21 / night 22–04; header text keeps AA contrast on every tint; backdrop is
hidden from accessibility and never intercepts touches; reduced motion shows it
instantly; lines never name undone work or streak risk.
**Required automated tests:** `daypart.test.ts` (boundaries, determinism, rotation,
tone), contrast test for each sky tint, `today.test.tsx` per-daypart rendering.
**Manual verification:** on-device, change the system clock across the four
dayparts and confirm the tint, glow, glyph, and line change; scroll and confirm
cards pass smoothly over the wash.
**Dependencies:** T048 (greeting), T060 (react-native-svg).
**Commit message:** `feat(today): add daypart ambience to the header`

### T095 — Streak milestone acknowledgement
**Goal:** completing a routine that carries its streak across a milestone
(3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365) gets one gentle, supportive line in
the completion toast plus a light haptic; the routine's reward, if any, becomes the
toast's second line. Ordinary completions stay quiet.
**Files/areas:** new `src/domain/streaks/milestones.ts`, `src/services/routineService.ts`
(`CompletionResult` gains `previousStreak`/`currentStreak`), `src/ui/animation/useRewardToast.ts`
(`showToast` with kind + detail, longer milestone hold), `src/ui/components/RewardToast.tsx`,
`app/(tabs)/today.tsx`, docs.
**Acceptance criteria:** fires only on a threshold crossing, never on a repeated tap
(unchanged streak); no stacked haptic when the same tap also levels up; copy is
never loss-framed; toast is announced politely to screen readers.
**Required automated tests:** `milestones.test.ts`, service tests for the streak
pair (including the idempotent repeat), toast hook/component tests, Today tests for
milestone, milestone + reward, and repeated-tap silence.
**Manual verification:** with seed data, complete a routine sitting at streak 6
and confirm the "7×" toast and haptic; complete one at streak 2 with a reward and
confirm both lines; double-tap quickly and confirm only one toast (an undo followed
by a fresh completion is a genuine re-crossing and may show it again).
**Dependencies:** T041/T042 (completion feedback), the reward toast.
**Commit message:** `feat(today): acknowledge streak milestones on completion`

### T096 — Weekly look-back card (Mondays)
**Goal:** on Mondays the Today screen looks back at the week that just ended:
completions, active days, steadiest routine, one warm sentence. Derived only — no
schema change.
**Files/areas:** new `src/domain/progress/weeklyRecap.ts`, new
`src/ui/components/WeeklyRecapCard.tsx`, `app/(tabs)/today.tsx` (Monday-only ranged
query; the card takes the Focus card's slot), docs.
**Acceptance criteria:** Monday only; counts completed/exceeded, never undone,
missed, or skipped; includes paused routines; an empty week keeps the Focus card.
**Required automated tests:** `weeklyRecap.test.ts`; Today tests for Monday with
data, Monday empty, and a non-Monday.
**Manual verification:** set the device to a Monday after a week with completions;
confirm the numbers match the Plan/Progress screens for that week.
**Dependencies:** T081–T086 (progress data), T094.
**Commit message:** `feat(today): add Monday weekly look-back`

### T097 — Growing streak glyph
**Goal:** routine rows picture the streak as a plant (seed → sprout → leaf → bud →
bloom → rose) that grows on the same thresholds as the streak milestones.
**Files/areas:** new `src/domain/streaks/growthStage.ts`, new
`src/ui/components/StreakGrowthIcon.tsx`, `RoutineCard.tsx`, `app/routines/index.tsx`.
**Acceptance criteria:** stages change only on milestone streaks; a reset shows a
seed (never a wilted plant); the stage name is part of the streak's accessibility label.
**Required automated tests:** `growthStage.test.ts`; Today test asserting the glyph
and spoken label.
**Manual verification:** compare rows with streaks 0, 3, 8, 25, 70, and 120.
**Dependencies:** T095.
**Commit message:** `feat(routines): grow a plant glyph with the streak`

### T098 — Day complete moment
**Goal:** finishing the day's last routine changes the scene: a closing header line
per daypart and a sage glow that settles in.
**Files/areas:** `src/domain/daypart.ts` (`dayCompleteLine`),
`src/ui/components/DaypartBackdrop.tsx` (`dayComplete`), `app/(tabs)/today.tsx`.
**Acceptance criteria:** the line and glow follow the done state (undo reverts them);
same one-settle motion budget; reduced motion is instant.
**Required automated tests:** daypart test for distinct closing lines; Today test for
the done-day line and glow.
**Manual verification:** complete the last routine and watch the header change;
undo and confirm it reverts.
**Dependencies:** T094.
**Commit message:** `feat(today): mark the finished day in the header`

### T099 — Day-complete haptic and optional completion sound
**Goal:** finishing the day gets its own two-beat haptic; an optional, off-by-default
soft chime plays on completions.
**Files/areas:** `src/ui/animation/haptics.ts` (`triggerDayCompleteHaptic`), new
`src/ui/sound/completionSound.ts` + `assets/sounds/completion-chime.wav`, `expo-audio`
(plugin configured without microphone/background playback), `src/data/db/schema.ts`
+ migration `0006_profile_completion_sound` (profile `completion_sound_enabled`,
default off), `profileRepository.ts`, `app/(tabs)/settings.tsx` (Klang section),
`app/(tabs)/today.tsx`.
**Acceptance criteria:** chime only when enabled and only for real completions (not
undo/skip/move or a repeated tap); audio failures never throw; no new dangerous
permission; day-complete haptic never stacks with the first-of-day pattern; the
existing profile survives the migration with the sound off.
**Required automated tests:** migration test, schema test, repository round-trip,
sound service test, haptics test, settings and Today screen tests.
**Manual verification:** on device, toggle Klang on (sample plays), complete a
routine with music playing (music keeps playing), confirm silence when off.
**Dependencies:** T092 (profile settings pattern).
**Commit message:** `feat(feedback): add day-complete haptic and optional completion sound`

### T100 — Rounded display typeface
**Goal:** titles, the greeting, and streak numerals use Quicksand, embedded natively
at build time with real 600/700 weights.
**Files/areas:** `assets/fonts/` (+ `OFL.txt`), `app.json` expo-font plugin,
`src/ui/theme/typography.ts`, screen title styles, `docs/DESIGN_SYSTEM.md`,
`CLAUDE.md` (design direction: two faces with fixed roles).
**Acceptance criteria:** body text stays on the platform sans; bold is the real bold
file, not synthesized; no runtime font loading.
**Required automated tests:** tokens test asserting the display family.
**Manual verification:** build the APK and compare Today/Plan/Progress/Me titles and
the streak numeral before/after.
**Dependencies:** none.
**Commit message:** `feat(theme): use Quicksand for display typography`
