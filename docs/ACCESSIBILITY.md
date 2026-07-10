# Accessibility Verification

This document records the accessibility re-verification of the Quiet Atelier
design (T082, re-running the T058 review against the more monochrome token
set). It covers three things the design must guarantee:

1. every text/icon-on-surface pairing meets WCAG AA contrast,
2. every interactive target is at least 44dp,
3. no state relies on color as its only signal, and destructive actions are
   confirmed.

Contrast figures are the WCAG 2.1 relative-luminance ratio. The bars are
**4.5:1** for normal-size text (body/label under 18pt) and **3.0:1** for large
text (≥18pt, or ≥14pt bold), icons, and other non-text graphics. The ratios
below are asserted automatically in `src/ui/theme/__tests__/contrast.test.ts`,
so a future token change that drops a pairing below its bar fails CI.

## Light palette (shipped)

Tokens: background `#FAFAF9`, surface `#FFFFFF`, surface-muted `#F2F0EC`, text
`#1C1917`, muted-text `#78716C`, on-accent `#FAFAF9`, accent `#A16207`, rose
`#8F5A49`.

| Foreground | Background | Ratio | Bar | Result |
|---|---|---|---|---|
| text (charcoal) | background | 16.74:1 | 4.5 | PASS |
| text | surface | 17.49:1 | 4.5 | PASS |
| text | surface-muted (calendar day number) | 15.37:1 | 4.5 | PASS |
| muted text | background (weekday/legend/dimmed) | 4.59:1 | 4.5 | PASS |
| muted text | surface (task subtitle) | 4.80:1 | 4.5 | PASS |
| accent (gold) text | background | 4.71:1 | 4.5 | PASS |
| accent text | surface | 4.92:1 | 4.5 | PASS |
| on-accent stone | accent (FAB label, exceeded day number) | 4.71:1 | 4.5 | PASS |
| rose | background (destructive/overdue label) | 5.40:1 | 4.5 | PASS |
| rose | surface (destructive label in sheet) | 5.64:1 | 4.5 | PASS |
| rose | surface-muted | 4.95:1 | 4.5 | PASS |
| accent glyph | surface-muted (completed check, joker star) | 4.33:1 | 3.0 | PASS |
| muted-text glyph | surface-muted (skipped/moved/paused icons) | 4.22:1 | 3.0 | PASS |

### T082 changes that this table depended on

- **Rose darkened `#9F6B5C` → `#8F5A49`.** The old rose was only 4.25:1 on the
  stone background — fine as a glyph but under 4.5:1, and the destructive
  `Button` label and the task "Überfällig" label both render rose at caption
  size. The deeper clay-rose clears AA for small text on every light surface
  while staying a muted, non-alarm tone.
- **Exceeded calendar day number switched to on-accent stone.** The exceeded
  cell fills with the gold accent; the day number was charcoal, which measures
  only **3.55:1** on gold (fails AA for small text). It now uses the on-accent
  stone (`#FAFAF9`), 4.71:1. All other cells keep charcoal on their light
  fills.

### Non-informational pairings (excluded)

- **Hairline dividers / `border` `#E7E4DD`** measure ~1.2:1 on the surfaces.
  These are decorative row separators, not text and not a control boundary
  required to operate anything, so WCAG 1.4.3/1.4.11 do not impose a minimum;
  they are intentionally faint per the design direction.

## Dark palette (defined for future use, not shipped)

Dark mode is not enabled in the MVP, but the tokens are contrast-checked as a
set so the palette is ready. The dark rose is lightened to `#BC8878` (from the
former `#9F6B5C`) for the same reason the light rose was darkened.

| Foreground | Background | Ratio | Bar | Result |
|---|---|---|---|---|
| text `#F5F3F0` | background `#1C1917` | 15.79:1 | 4.5 | PASS |
| text | surface `#242220` | 14.31:1 | 4.5 | PASS |
| muted text `#A8A29E` | background | 6.93:1 | 4.5 | PASS |
| muted text | surface | 6.29:1 | 4.5 | PASS |
| accent `#C08A2E` | background | 5.76:1 | 4.5 | PASS |
| accent | surface | 5.22:1 | 4.5 | PASS |
| on-accent ink `#1C1917` | accent | 5.76:1 | 4.5 | PASS |
| rose `#BC8878` | background | 5.77:1 | 4.5 | PASS |
| rose | surface | 5.23:1 | 4.5 | PASS |

## Touch targets (≥44dp)

| Control | Size | Note |
|---|---|---|
| `CompletionControl` (routine complete/exceed) | 48×48 | `spacing.xl` box |
| `Button` (all variants) | ≥44 tall | `minHeight: 44` added in T082; padding alone left it ~40dp |
| `TaskCard` completion toggle | 28 + 8 hitSlop = 44 | `hitSlop` added in T082; visual glyph stays compact |
| `CreateFab` | 56×56 | — |
| Calendar month nav (`‹`/`›`) | 48×48 | `spacing.xl` box |
| Calendar day cell | ~48dp cell, 86% visual | full cell allocation ≥44dp; adjacent cells make hitSlop inappropriate |
| Bottom tab items | 64dp bar | see `app/(tabs)/_layout.tsx` |

## Non-color signals per state

Every state carries a shape/glyph/typographic distinction so color is never the
sole information carrier (verified against `docs/DESIGN_SYSTEM.md`):

- **Completed** — gold check glyph + gold underline draw-in.
- **Exceeded** — double check (`✓✓`) / `checkmark-done` icon.
- **Skipped** — title dims to muted text; outline-circle glyph in the calendar.
- **Missed** — distinct `close` (×) glyph in the calendar; monochrome, not a
  colored fill.
- **Moved** — `arrow-forward` glyph.
- **Paused** — italic/reduced-opacity row + a text label (`pause` glyph in the
  calendar).
- **Joker-protected** — `star` glyph.
- **Overdue task** — an "Überfällig" text label, not a color-only cue.

The calendar legend pairs each swatch with its written label, and calendar
status icons are monochrome-plus-gold (T080) — no state is distinguished by hue
alone.

## Destructive confirmation

Deleting a routine, task, or category routes through a native confirmation
`Alert` before the deletion runs; the destructive `Button` is also visually
distinct (rose outline + rose label). This is covered by existing
destructive-confirmation tests (e.g. `app/category/__tests__/index.test.tsx`,
`app/routine/[id]/__tests__/index.test.tsx`).

## Manual re-verification checklist

- [ ] Android accessibility scanner / TalkBack spot-check on Today, Routines,
      Tasks, Routine detail, and each create/edit form.
- [ ] Confirm the destructive "Löschen" label and the task "Überfällig" label
      are comfortably legible on-device (rose on stone).
- [ ] Confirm an exceeded day in a routine calendar shows a legible day number
      on the gold cell.
- [ ] Confirm the task completion toggle is easy to hit despite its small glyph.
