# Screen Specifications

## Main Navigation

Bottom navigation contains four destinations:

1. Heute
2. Plan
3. Progress
4. Me

A create button is embedded in the center of the bottom navigation bar itself (not a FAB floating above it) and opens a type selection:

- Routine
- Aufgabe

"Me" carries the same content the Settings screen (below) describes — display name, category management, export/import — just relabeled and re-iconed to match the new navigation.

The standalone Routinen and Aufgaben tabs are retired as top-level tabs; the screens themselves are unchanged and relocated to plain (non-tab) routes, reachable via two entry links on the new **Plan** screen ("Alle Routinen verwalten" / "Alle Aufgaben verwalten"). Today's due items still surface on the Today screen exactly as before.

## Today Screen

### Visual Hierarchy

The screen reads top-to-bottom in one deliberate order, with each section given weight proportional to its importance (see `docs/DESIGN_SYSTEM.md`'s Visual Hierarchy and Reading Order):

1. Greeting,
2. Daily progress (overall streak + today's completion),
3. Focus of the day,
4. Today's routines,
5. Tasks.

Sections must not all carry equal visual weight — spacing, type size/weight, and accent emphasis should guide the eye through this order at a glance. Routines are prioritized over tasks. Keep generous whitespace between these sections so the screen feels calm rather than compressed.

### Header

- Leading shortcuts icon (opens a small sheet linking to Kategorien verwalten and Me); trailing bell icon (placeholder only — opens a small sheet noting notifications aren't available yet; carries no push-notification functionality, per `docs/MVP_SCOPE.md`).
- Time-based greeting, for example "Guten Morgen, Marvin", with a short static subtitle line under it.
- Current date.
- Subtle overall app streak.
- Daily routine progress only.

### Focus of the Day

A card between the header and the routine list: accent-tinted, short "Fokus des Tages" label, a one-line rotating prompt (static list keyed by day-of-year), and a placeholder decorative icon/illustration. See `docs/DESIGN_SYSTEM.md`'s Focus of the Day section.

### Content Order

1. Focus of the day.
2. Routines.
3. Tasks.
4. For later.

### Routine Card

A light, soft-paper card (see `docs/DESIGN_SYSTEM.md`) focused only on viewing and completing. Shows:

- name,
- category visual treatment,
- optional time,
- current streak,
- weekly progress when relevant,
- separate completion button.

No overflow / three-dot menu on the row.

Interactions:

- tap card: open routine detail (the single place item actions live),
- tap completion button: complete,
- long press completion button: exceeded,
- tap completion button again once completed or exceeded: undo (see `docs/ROUTINE_RULES.md`'s Undo Completion).

All non-completion actions (move to tomorrow, conscious skip, edit, pause, change color, statistics, delete) live in the Routine Detail screen or a bottom sheet opened from it — never inline on the row (see `docs/DESIGN_SYSTEM.md`'s List Row Actions).

Completed routines remain visible in a subdued completed state and move toward the end of the section.

### Task Card

Shows:

- title,
- category visual treatment,
- date or time when present,
- completion control.

No overflow / three-dot menu on the row. Tapping the card opens the task's detail (or a bottom sheet), where edit/delete and other actions live.

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

- tap card: open detail (where all item actions live),
- drag and drop: reorder.

No overflow / three-dot menu on the row. Edit, pause or reactivate, change color, statistics, and delete are reached from the Routine Detail screen or a bottom sheet opened from it (see `docs/DESIGN_SYSTEM.md`'s List Row Actions).

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

### Actions

This screen (or a bottom sheet opened from it) is the single home for every routine action — the list rows no longer carry an overflow menu (see `docs/DESIGN_SYSTEM.md`'s List Row Actions). Actions available here:

- Edit,
- Pause / Reactivate,
- Change color,
- Statistics,
- Delete (destructive, terracotta, always confirmed),
- plus the Today-context actions where applicable (move to tomorrow, conscious skip).

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

## Plan Screen

Reachable from the bottom navigation (see Main Navigation). Two parts:

1. **Week overview**: a day-strip (Mon–Sun, current week) with the current day highlighted; below it, each due routine for the visible week shown as a row of per-day completion dots (completed/exceeded = filled accent, missed = muted taupe dot, not-due/future = hollow outline) — built from existing `routine`/`routine_event` data, no new schema.
2. **Manage links**: "Alle Routinen verwalten" and "Alle Aufgaben verwalten", opening the existing Routines screen (Aktiv/Pausiert tabs, reorder; item actions via detail/bottom sheet, no row overflow menu) and Tasks screen (five sections) unchanged, now reachable as plain routes instead of tabs.

## Progress Screen

Reachable from the bottom navigation. A read-only dashboard, built entirely from existing cached/derived data (no new schema):

- **Streak hero**: a card with a short encouragement line and a circular streak ring (see `docs/DESIGN_SYSTEM.md`'s Streak Ring) showing the overall app streak.
- **Overview stat tiles** (2×2): completion rate for the visible period, longest streak across all routines, total active routines, and completions this period. (The mockup's "Total time" tile has no backing field in the data model — no duration is tracked per completion — so it is not implemented; this is a deliberate adaptation, not a silent scope cut.)
- **Completion over time**: a line/area chart of daily routine-completion rate across the current week.
- **Habit breakdown**: a donut chart of active routines grouped by category, with a color-keyed legend.

## Settings Screen ("Me")

Reachable from the bottom navigation as **Me**. Contains:

- display name,
- category management,
- export backup,
- import backup.
