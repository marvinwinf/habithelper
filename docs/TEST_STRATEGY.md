# Test Strategy

## Goal

The project owner will not systematically review source code. Automated and manual testing are therefore mandatory parts of development.

## Required Automated Checks

Every implementation task must pass:

- TypeScript type checking,
- linting,
- unit tests,
- component tests where relevant,
- database migration tests where relevant.

## Core Logic Tests

Tests must cover:

- routine scheduling,
- daily routines,
- weekday routines,
- weekly target routines,
- normal completion,
- exceeded completion,
- conscious skip,
- move to tomorrow,
- pause and reactivate,
- retroactive completion,
- joker earning,
- joker consumption,
- joker restoration,
- streak calculation,
- 66-completion protection,
- level progression,
- overall app streak,
- days without scheduled routines,
- task overdue behavior.

## Data Tests

Tests must cover:

- persistence after app restart,
- schema migration,
- backup export,
- backup validation,
- import,
- automatic pre-import safety backup,
- failed import recovery,
- stable identifiers,
- recalculation from source events.

## UI Tests

Tests should cover critical flows:

- create routine,
- complete routine,
- long press for exceeded,
- undo completion,
- create task,
- complete task,
- open routine detail,
- edit calendar history,
- pause routine,
- reactivate routine,
- reorder routine,
- create category.

## Manual Test Checklist Requirement

Claude must provide a concise manual test checklist after every completed feature.

The checklist must describe observable steps and expected results without requiring code knowledge.
