# Claude Project Instructions

## Project Goal

Build an Android-first personal routines and todo app using React Native, Expo, and TypeScript.

The app must remain technically compatible with future iOS development, but the MVP is implemented and tested for Android only.

## Required Reading

Before changing code, read:

- `docs/PRODUCT_VISION.md`
- `docs/MVP_SCOPE.md`
- `docs/PROJECT_PRINCIPLES.md`
- `docs/USER_MODEL.md`
- `docs/DATA_PERSISTENCE.md`
- `docs/ROUTINE_RULES.md`
- `docs/SCREEN_SPECIFICATIONS.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/TEST_STRATEGY.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `TASKS.md`

## Working Rules

- Work in small, reviewable tasks.
- Do not implement unrelated features.
- Do not weaken requirements silently.
- Do not delete or recreate persistent user data to solve schema problems.
- Use explicit versioned migrations.
- Store source events for streak-relevant behavior.
- Add or update tests with every logic change.
- Keep external dependencies minimal.
- Prefer maintained Expo-compatible libraries.
- Do not add cloud services, authentication, social features, notifications, or iOS-specific work unless explicitly requested.
- Do not treat timers as required for routine completion.

## Release Process

After the final task of each implementation phase (per `TASKS.md`) is completed and pushed, publish an updated Android APK by pushing an `apk-phase-<n>` tag and confirming the `Android APK` workflow succeeds — see `docs/RELEASE_PROCESS.md`. The README's Releases section links to the latest release automatically and only needs editing if the process itself changes.

## Definition of Done

A task is complete only when:

1. the requested behavior is implemented,
2. TypeScript checks pass,
3. linting passes,
4. tests pass,
5. migration impact has been considered,
6. existing behavior still works,
7. documentation is updated when necessary,
8. a manual test checklist is provided,
9. a focused Git commit is created.

## Output Format After Each Task

Report:

1. files changed,
2. behavior implemented,
3. tests added or updated,
4. commands executed and results,
5. migration impact,
6. manual test checklist,
7. commit message.

## Design Direction

Follow the Soft Momentum design direction (see `docs/DESIGN_SYSTEM.md` for full detail):

- light theme,
- warm off-white background, dark warm-gray text, single muted sage-green accent used generously (buttons, progress, streaks, focus states),
- pastel category colors tint each routine/task's card (one dominant color per card, never several competing hues on one screen),
- soft rounded geometry throughout — cards, buttons, inputs, pills, circular icon badges,
- one typeface, hierarchy from weight/size rather than a second display face,
- streaks and gentle milestone acknowledgement are the extent of gamification — no punishment for a missed day, no points/leaderboards,
- short, gentle motion: fades for mount/dismiss, a subtle non-bouncy spring for completion/milestones,
- routines visually prioritized over tasks,
- clear per-screen reading order — sections carry weight proportional to importance, never all-equal (Today: greeting → daily progress → focus of the day → routines → tasks),
- generous whitespace between sections and inside cards; when a screen feels crowded, add space and remove elements rather than packing tighter; simplify before adding UI,
- light, soft-paper cards: soft low-contrast borders, light backgrounds, generous internal padding, extra rounding, at most an extremely subtle shadow — never heavy containers,
- list rows are for viewing and completing only — no overflow / three-dot menus on rows; item actions (edit, pause, change color, statistics, delete) live in the detail screen or a bottom sheet opened by tapping the row,
- no mascots.
