# Tasks

Work happens in small, independently implementable and verifiable tasks,
sequenced per `docs/IMPLEMENTATION_PLAN.md`. Each task lists its goal, affected
areas, acceptance criteria, required automated tests, manual verification steps,
dependencies, and a suggested commit message.

The Android MVP (phases 0–12, tasks T001–T090) is **fully implemented**. Its
complete historical specification lives in `docs/TASKS_ARCHIVE.md` — reference
material, not required reading. Consult a phase there only when you change the
area it built; you do not need to read the whole archive to start a task.

New work is added as new tasks under **Open tasks** below, in the same format.

## Global rules for every task

- `tsc --noEmit`, ESLint, and the full Jest suite must pass before the task's commit, in addition to whatever is listed under "Required automated tests" for that task.
- Any task that changes `src/data/db/schema.ts` must include a corresponding versioned migration file and a migration test proving prior data survives (per `docs/ARCHITECTURE.md`'s Migration Strategy). See `docs/TASKS_ARCHIVE.md`'s T063 for a worked example of a post-Phase-1 schema change.

## Open tasks

_None currently. Add new tasks here using the task format from
`docs/TASKS_ARCHIVE.md` (goal, files/areas, acceptance criteria, required tests,
manual verification, dependencies, commit message)._
