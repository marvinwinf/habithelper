# Claude Project Instructions

## Project Goal

Build an Android-first personal routines and todo app using React Native, Expo, and TypeScript.

The app must remain technically compatible with future iOS development, but the MVP is implemented and tested for Android only.

## Required Reading

Read the small core below before any change. Then read only the docs for the
area you are actually touching — do not read all of `docs/` for every task.
Source files already cite their governing doc inline (e.g. `per
docs/ROUTINE_RULES.md`); follow those citations rather than pre-reading
everything.

**Always read first (the core):**

- `docs/PROJECT_PRINCIPLES.md` — non-negotiable rules
- `docs/MVP_SCOPE.md` — what is in and out of scope

**Then read by area — only what your change touches:**

| You are changing… | Read first |
| --- | --- |
| Routine / streak / joker / level / reconciliation logic | `docs/ROUTINE_RULES.md`, then `docs/DATA_MODEL.md` (event shapes) |
| DB schema, migrations, or repositories | `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md` (Migration Strategy) |
| Persistence guarantees | `docs/DATA_PERSISTENCE.md` |
| Screens, navigation, or user-facing copy | `docs/SCREEN_SPECIFICATIONS.md` |
| Any visual / component / styling work | `docs/DESIGN_SYSTEM.md` (and `docs/ACCESSIBILITY.md`) |
| Tests or test setup | `docs/TEST_STRATEGY.md` |
| Cross-cutting / architectural decisions | `docs/ARCHITECTURE.md` |
| Product intent or user model | `docs/PRODUCT_VISION.md`, `docs/USER_MODEL.md` |
| Phase planning or sequencing | `docs/IMPLEMENTATION_PLAN.md`, `docs/ROADMAP.md` |
| Publishing an APK release | `docs/RELEASE_PROCESS.md` |

`TASKS.md` holds the global task rules and current open work — read it when
picking up or defining a task. `docs/TASKS_ARCHIVE.md` is the historical
spec of the completed MVP (T001–T090): reference-only, consult a single phase
when you touch the area it built. `docs/design_reference.png` is a 1.3 MB
image — open it only for pixel-level design work, never as routine reading.

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
