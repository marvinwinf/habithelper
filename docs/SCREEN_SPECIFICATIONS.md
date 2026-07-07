# Screen Specifications

## Main Navigation

Bottom navigation contains four tabs:

1. Heute
2. Routinen
3. Aufgaben
4. Einstellungen

A central floating create button opens a type selection:

- Routine
- Aufgabe

## Today Screen

### Header

- Time-based greeting, for example "Guten Morgen, Marvin".
- Current date.
- Subtle overall app streak.
- Daily routine progress only.

### Content Order

1. Routines.
2. Tasks.
3. For later.

### Routine Card

Shows:

- name,
- category visual treatment,
- optional time,
- current streak,
- weekly progress when relevant,
- separate completion button,
- overflow menu.

Interactions:

- tap card: open routine detail,
- tap completion button: complete,
- long press completion button: exceeded,
- tap completion button again once completed or exceeded: undo (see `docs/ROUTINE_RULES.md`'s Undo Completion),
- overflow menu: move to tomorrow, conscious skip, edit, pause, delete.

Completed routines remain visible in a subdued completed state and move toward the end of the section.

### Task Card

Shows:

- title,
- category visual treatment,
- date or time when present,
- completion control,
- overflow menu.

Overdue tasks are highlighted clearly but not aggressively.

Completed tasks remain visible in a subdued state.

### First Completion of the Day

The first actual routine completion of the day triggers:

- short overall streak animation,
- short haptic feedback,
- positive visual confirmation.

## Create Item Flow

The floating create button opens a type choice:

- Routine
- Aufgabe

Each type opens its own full-screen form.

## Create Routine Screen

Visible fields:

- Name
- Kategorie
- Häufigkeit
- Uhrzeit

Frequency options:

- Täglich
- Wochentage
- X-mal pro Woche

Weekly-target selection displays suggested Monday-to-Sunday choices that the user can edit.

Collapsed additional settings:

- personal reason,
- conscious skip allowed.

Actions:

- create new category,
- save.

No routine suggestions and no live card preview are required.

## Create Task Screen

Visible fields:

- title,
- category,
- optional date,
- optional time.

Collapsed additional settings:

- optional description.

Tasks may be created without a date.

## Category Management

Category list supports:

- create,
- edit,
- delete.

Category form contains:

- name,
- base color,
- preview.

Deleting an assigned category must not delete tasks or routines. The user must choose reassignment, removal of category, or cancellation.

## Routines Screen

Two tabs:

- Aktiv
- Pausiert

Each routine card shows:

- name,
- category treatment,
- current streak.

Interactions:

- tap card: open detail,
- drag and drop: reorder,
- overflow menu: edit, pause or reactivate, delete.

## Routine Detail Screen

Top area shows:

- routine name,
- category,
- current streak,
- level,
- progress bar toward next 66-completion level.

Additional content:

- personal reason in a lower or collapsible section,
- available jokers before streak 66,
- personal streak record,
- total successful completions,
- editable weekdays, for weekly-target ("X times a week") routines only,
- monthly calendar history.

Calendar states:

- completed,
- exceeded,
- missed,
- consciously skipped,
- joker protected,
- paused,
- moved.

Past days can be edited for retroactive completion.

## Tasks Screen

Sections:

1. Überfällig
2. Heute
3. Demnächst
4. Ohne Datum
5. Erledigt

The completed section is collapsed by default.

Sorting is based on date and time.

Long press can be used for manual reordering or moving where appropriate.

Completed tasks remain stored permanently.

## Settings Screen

Contains:

- display name,
- category management,
- export backup,
- import backup.
