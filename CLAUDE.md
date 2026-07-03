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

Follow the Soft Momentum design direction:

- light theme,
- warm off-white background,
- pastel category colors,
- rounded modern cards,
- subtle same-family gradients,
- clear hierarchy,
- short visible animations,
- routines visually prioritized over tasks,
- no mascots.
