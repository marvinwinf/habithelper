# Project Principles

## Development Approach

The app is developed primarily through AI-assisted implementation using Claude Code and ChatGPT.

The product owner does not plan to systematically review source code. Therefore, quality must be protected through:

- small implementation steps,
- explicit requirements,
- automated tests,
- type checking,
- linting,
- manual product testing,
- clear documentation,
- reversible Git commits.

## Completion Criteria

A feature is complete only when:

1. the acceptance criteria are met,
2. the app starts successfully,
3. TypeScript checks pass,
4. linting passes,
5. automated tests pass,
6. existing behavior remains functional,
7. migration impact has been considered,
8. a manual test checklist is provided.

## Architecture Principles

- One shared React Native and Expo codebase.
- Android-first MVP.
- iOS support must remain technically possible later.
- Offline-first core behavior.
- Local data storage before cloud services.
- Stable identifiers for persistent data.
- Event history is preferred over storing only calculated values.
- Minimal number of external dependencies.
- No secrets or API keys in source code.
- No unnecessary multi-user architecture in the MVP.
- No destructive schema changes without explicit migrations.

## Interaction Principle

Recording progress must require less effort than performing the behavior itself.

Most routines must be completable with one deliberate tap. Timers, notes, reflections, or duration entry must never be required for normal completion.

## Product Focus

Routines are the primary product focus.

Tasks support personal organization but do not contribute to daily routine progress or routine gamification.
