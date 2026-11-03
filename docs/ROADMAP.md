# Roadmap

## Phase 1: Foundation

- Create Expo React Native TypeScript project.
- Configure routing.
- Configure linting, type checking, and tests.
- Establish design tokens.
- Create local SQLite database.
- Create migration framework.
- Create local profile.

## Phase 2: Categories

- Category data model.
- Category creation and editing.
- Category color variants.
- Category management screen.

## Phase 3: Routines

- Routine data model.
- Routine schedules.
- Create and edit routine flows.
- Active and paused routine lists.
- Completion event model.
- Pause, skip, move, and retroactive completion.

## Phase 4: Gamification

- Routine streak calculation.
- Joker system.
- 66-completion protection.
- Levels and progress bars.
- Overall app streak.
- Completion animations and haptics.

## Phase 5: Tasks

- Task data model.
- Create and edit task flow.
- Today, overdue, upcoming, undated, and completed sections.
- Completion and rescheduling.

## Phase 6: Today Screen

- Greeting and date.
- Routine progress.
- Routines first.
- Tasks second.
- For later section.
- Floating create action.

## Phase 7: Routine Detail

- Stats.
- Level progress.
- Calendar history.
- Retroactive editing.

## Phase 8: Backup and Import

- Backup export.
- Backup validation.
- Automatic safety backup before import.
- Import and rollback.

## Phase 9: Polish

- Visual consistency.
- Motion tuning.
- Haptics.
- Empty states.
- Accessibility review.
- Performance review.
- Android device testing.

## Phase 12: Today/Plan/Progress Redesign

- Chart primitives (ring, line/area, donut) on `react-native-svg`.
- Four-destination navigation (Today/Plan/Progress/Me) with an embedded create button.
- Today header shortcuts + notifications-placeholder icons, and a Focus of the day card.
- Colorful per-item icon badges on Today's routine/task rows.
- Plan screen: weekly per-routine completion dot-matrix, entry points to Routines/Tasks management.
- Progress screen: streak ring, stat tiles, completion-over-time chart, habit-breakdown donut.
- Settings screen relabeled "Me".

## Phase 13: Local Daily Reminder

Scope reversal, at the product owner's request: `docs/MVP_SCOPE.md`'s
notifications exclusion is narrowed to *remote/push* only.

- Scheduling service: permission request, Android notification channel, and
  exactly one repeating daily local trigger (cancel-then-schedule on change),
  rescheduled on app start so it survives reboot and restore (T092).
- Profile columns `reminder_enabled` / `reminder_time` with migration 0005.
- Me screen reminder section (toggle + time picker), and the Today header bell
  becomes its entry point instead of a placeholder (T093).

## Future Phases

- Real *remote/push* notifications and a server to send them (the local daily
  reminder from Phase 13 covers the on-device case and needs neither).
- Morning and evening reports.
- Focus sessions (distinct from the Phase 12 "Focus of the day" static card).
- Search.
- Dark mode.
- Cloud backup and synchronization.
- Optional accounts.
- iOS implementation and testing.
