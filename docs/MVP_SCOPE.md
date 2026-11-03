# MVP Scope

## Platform

The MVP is developed, tested, and released for Android only.

The architecture must avoid unnecessary Android-specific decisions that would block or significantly complicate later iOS support.

## Included in the MVP

### Today Screen

- personal greeting based on time of day,
- current date,
- subtle overall app streak,
- routine progress for the current day,
- a "Focus of the day" card (static rotating prompt, placeholder illustration only — no personalization/backend),
- a header shortcuts icon and a bell icon leading to the local daily reminder setting (T092/T093; no remote push delivery, see Explicitly Excluded below),
- routines displayed before tasks,
- visible completion controls,
- completed items remain visible in a subdued completed state,
- "For later" section,
- a create button embedded in the bottom navigation bar.

### Plan Screen

- current-week day-strip with a per-routine completion dot-matrix (derived from existing routine/event data),
- entry points into the existing Routines screen (Aktiv/Pausiert) and Tasks screen (five sections), relocated to plain routes.

### Progress Screen

- overall-streak ring hero,
- stat tiles: completion rate, longest streak, active routine count, completions this period (all derived from existing cached data; no duration/time tracking),
- completion-over-time chart for the current week,
- category-based habit-breakdown donut chart.

### Routines

- daily routines,
- routines on selected weekdays,
- routines with a weekly target,
- suggested weekdays for weekly targets,
- manual weekday adjustment,
- optional time used for sorting,
- category assignment,
- personal reason,
- normal completion,
- exceeded completion,
- conscious skip when allowed,
- retroactive completion,
- move to tomorrow,
- pause and reactivate,
- persistent history,
- per-routine streak,
- per-routine level progress.

### Tasks

- title,
- optional category,
- optional date,
- optional time,
- optional description,
- completion,
- undo,
- move to tomorrow,
- move to another date,
- overdue handling,
- editing,
- deletion,
- permanent storage of completed tasks.

### Gamification

- per-routine streaks,
- one overall app streak,
- joker system before a routine streak reaches 66,
- three-missed-occurrence protection after reaching 66,
- 66-completion level segments,
- level names,
- progress bars,
- short completion animations,
- stronger animation for exceeded completion,
- short haptic feedback,
- first routine completion of the day triggers an overall streak animation.

### Categories

- create category,
- edit category,
- delete category safely,
- category name,
- category base color,
- generated visual variants for items within a category.

### Data Management

- local database,
- offline-first behavior,
- versioned migrations,
- local backup export,
- local backup import,
- automatic safety backup before import.

### Settings

- display name,
- category management,
- export data,
- import data,
- one local daily reminder (on/off plus a time).

### Notifications

Scope correction (T092), recorded so the reversal is explicit rather than
silent: **local** notifications are in scope, at the product owner's request.

- exactly one local daily reminder at a user-chosen time,
- scheduled on-device only — no push token, no server, no network,
- off by default; nothing is scheduled until the user enables it,
- gentle wording only: the reminder is an invitation and never names a missed
  day, a streak at risk, or a number.

Remote/push notifications, morning reports, and evening reports remain out of
scope (see below).

## Explicitly Excluded from the MVP

- iOS release,
- remote/push notifications (no push token is requested and no server exists; the *local* daily reminder above is in scope and is the Today header bell's destination),
- morning report,
- evening report,
- focus sessions,
- search,
- dark mode,
- cloud synchronization,
- user accounts,
- social features,
- widgets,
- calendar integration,
- wearable integration,
- AI features,
- quantity tracking,
- multiple completions per routine per day,
- priorities,
- subtasks,
- projects,
- task dependencies.
