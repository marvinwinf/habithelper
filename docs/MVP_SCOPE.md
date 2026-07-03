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
- routines displayed before tasks,
- visible completion controls,
- completed items remain visible in a subdued completed state,
- "For later" section,
- floating create button.

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
- import data.

## Explicitly Excluded from the MVP

- iOS release,
- push notifications,
- morning report,
- evening report,
- focus sessions,
- statistics dashboard,
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
