# Accessibility Verification

This document records the accessibility verification of the Soft Momentum
design's token set (re-run after the Quiet Atelier → Soft Momentum revival).
It covers three things the design must guarantee:

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

Tokens: background `#F7F1E6`, surface `#FFFCF6`, surface-muted `#EFE6D5`, text
`#3A342E`, muted-text `#6E6459`, on-accent `#FFFCF6`, accent (sage) `#3F7256`,
missed (taupe) `#8A7B6A`, destructive (terracotta) `#9C4A41`.

| Foreground | Background | Ratio | Bar | Result |
|---|---|---|---|---|
| text | background | 10.92:1 | 4.5 | PASS |
| text | surface | 11.99:1 | 4.5 | PASS |
| text | surface-muted (calendar day number) | 9.91:1 | 4.5 | PASS |
| muted text | background | 5.15:1 | 4.5 | PASS |
| muted text | surface (task subtitle) | 5.65:1 | 4.5 | PASS |
| muted text | surface-muted | 4.67:1 | 4.5 | PASS |
| accent (sage) text | background | 4.98:1 | 4.5 | PASS |
| accent text | surface | 5.46:1 | 4.5 | PASS |
| accent glyph | surface-muted (completed check, joker star) | 4.52:1 | 3.0 | PASS |
| on-accent stone | accent (FAB, primary button, CompletionControl fill, exceeded day) | 5.46:1 | 4.5 | PASS |
| destructive (terracotta) | background | 5.38:1 | 4.5 | PASS |
| destructive | surface (destructive label in sheet) | 5.91:1 | 4.5 | PASS |
| destructive | surface-muted | 4.89:1 | 4.5 | PASS |
| missed (taupe) glyph | background | 3.65:1 | 3.0 | PASS |
| missed glyph | surface | 4.00:1 | 3.0 | PASS |
| missed glyph | surface-muted (calendar "missed" icon) | 3.31:1 | 3.0 | PASS |

### Why missed and destructive are no longer one color

Quiet Atelier aliased "missed" and "destructive" to the same rose. Soft
Momentum's Gamification direction ("progress can continue even after an
imperfect day," never a loss-framed or punishing state) means a missed
occurrence must read as gentle and neutral, not as a warning — so `missed` is
tuned only to the 3:1 graphic bar and is used exclusively for icons/dots,
never for small text. `destructive` stays a distinct, more assertive
terracotta tuned to the 4.5:1 text bar, since it is reserved for real,
confirmed delete actions where a clearer signal is appropriate.

### Non-informational pairings (excluded)

- **Hairline borders (`border` `#E4D9C7`)** on cards measure a low ratio
  against `surface`/`background`. These are decorative card outlines, not
  text and not a control boundary required to operate anything, so WCAG
  1.4.3/1.4.11 do not impose a minimum.

## Dark palette (defined for future use, not shipped)

Dark mode is not enabled in the MVP, but the tokens are contrast-checked as a
set so the palette is ready.

| Foreground | Background | Ratio | Bar | Result |
|---|---|---|---|---|
| text `#F3EEE4` | background `#231F1A` | 14.16:1 | 4.5 | PASS |
| text | surface `#2B2620` | 12.96:1 | 4.5 | PASS |
| muted text `#BBAE9B` | background | 7.52:1 | 4.5 | PASS |
| muted text | surface | 6.88:1 | 4.5 | PASS |
| accent `#7FB093` | background | 6.65:1 | 4.5 | PASS |
| accent | surface | 6.09:1 | 4.5 | PASS |
| on-accent `#1B2620` | accent | 6.35:1 | 4.5 | PASS |
| destructive `#E0968B` | background | 6.94:1 | 4.5 | PASS |
| destructive | surface | 6.36:1 | 4.5 | PASS |
| missed `#8A7D6D` | background | 4.08:1 | 3.0 | PASS |
| missed | surface | 3.74:1 | 3.0 | PASS |

## Touch targets (≥44dp)

| Control | Size | Note |
|---|---|---|
| `CompletionControl` (routine complete/exceed) | 48×48 | `spacing.xl` box |
| `Button` (all variants) | ≥44 tall | `minHeight: 44` |
| `TaskCard` completion toggle | 28 + 8 hitSlop = 44 | visual glyph stays compact |
| `CreateFab` | 56×56 | — |
| Calendar month nav (`‹`/`›`) | 48×48 | `spacing.xl` box |
| Calendar day cell | ~48dp cell, 86% visual | full cell allocation ≥44dp |
| Bottom tab items | 64dp bar | see `app/(tabs)/_layout.tsx` |

## Non-color signals per state

Every state carries a shape/glyph/typographic distinction so color is never
the sole information carrier:

- **Completed** — filled accent circle + checkmark, with a brief pop.
- **Exceeded** — double check (`✓✓`) / `checkmark-done` icon.
- **Skipped** — title dims to muted text; outline-circle glyph in the calendar.
- **Missed** — distinct `close` (×) glyph in the calendar, taupe (never
  destructive-red); framed as neutral, not a failure.
- **Moved** — `arrow-forward` glyph.
- **Paused** — italic/reduced-opacity row + a text label (`pause` glyph in the
  calendar).
- **Joker-protected** — `star` glyph.
- **Overdue task** — an "Überfällig" text label, not a color-only cue.

The calendar legend pairs each swatch with its written label. Category
identity now does carry color (the pastel `categoryPalette` family), but every
category is also labeled by name/glyph — color tints, it never replaces, the
signal.

## Destructive confirmation

Deleting a routine, task, or category routes through a native confirmation
`Alert` before the deletion runs; the destructive `Button` is also visually
distinct (terracotta outline + terracotta label). Covered by existing
destructive-confirmation tests (e.g. `app/category/__tests__/index.test.tsx`,
`app/routine/[id]/__tests__/index.test.tsx`).

## Manual re-verification checklist

- [ ] Android accessibility scanner / TalkBack spot-check on Today, Routines,
      Tasks, Routine detail, Category list, and each create/edit form.
- [ ] Confirm the destructive "Löschen" label and the task "Überfällig" label
      are comfortably legible on-device (terracotta on the warm background).
- [ ] Confirm the completion "pop" and level-up pulse both collapse to an
      instant state change with reduced-motion enabled on-device.
- [ ] Confirm every category color swatch in `CategoryForm` is distinguishable
      by more than color alone for a color-blind user (name label is always
      shown alongside the swatch).
- [ ] Confirm the task completion toggle is easy to hit despite its small glyph.
