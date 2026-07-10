# Design System

## Design Direction

Working direction: Quiet Atelier.

The visual style combines:

- restrained, quietly premium neutrals (charcoal / warm stone),
- a single precious accent color used only for meaning (primary action, streak, completion),
- typographic hierarchy over graphic/gamified widgets,
- generous negative space,
- near-square, considered geometry.

The result should feel elegant, calm, and confident — polished and quietly luxurious without becoming ornate, dark-academia, or corporate-luxury cold.

## Core Visual Style

- Light theme as the primary/default MVP theme (dark tokens defined for future use, not shipped as default).
- Warm stone-white app background, not pure white.
- Charcoal primary text; single antique-gold accent; muted rose for "missed" (never alarm red, never a green "success" color distinct from the accent).
- No pastel category color-coding and no per-item background tinting.
- Near-square corners (2–4px radius) on the rare surfaces that have any.
- No card containers for list content — hairline dividers on a single surface instead.
- No shadows, no gradients, no decorative textures.
- Clear typographic hierarchy: a serif display face for titles/greeting/streak numerals only; a sans face for everything functional.
- Generous, editorial spacing.
- Icons used sparingly, hairline stroke — hierarchy comes from type and space, not iconography.
- Short, deliberate fades (no bounce/spring motion).
- No visually aggressive warning states; every status also has a non-color signal (icon/glyph, underline, italic, label).

## Color Tokens

| Token | Light | Dark (future) |
|---|---|---|
| background | `#FAFAF9` | `#1C1917` |
| surface | `#FFFFFF` | `#242220` |
| surface muted | `#F2F0EC` | `#2A2724` |
| text | `#1C1917` | `#F5F3F0` |
| muted text | `#78716C` | `#A8A29E` |
| text on accent | `#FAFAF9` | `#1C1917` |
| border | `#E7E4DD` | `#3A3532` |
| accent (gold) | `#A16207` | `#C08A2E` |
| missed (rose) | `#8F5A49` | `#BC8878` |

`surface muted` is reserved for inset fills that are not list surfaces (disabled controls, calendar day cells) — never to tint an item by category. Destructive actions reuse the `missed` rose; there is no separate destructive token. The rose is deliberately a deep, muted clay tone (not the lighter `#9F6B5C` used pre-T082): destructive and overdue labels render it at caption size, so it must clear WCAG AA (4.5:1) for small text on every light surface — see `docs/ACCESSIBILITY.md`.

The accent color is the only color used for meaning (primary action, active nav state, completed mark, streak numeral). It must not be reused decoratively elsewhere. "Missed" uses the rose token; there is no separate green "success" color — completion is communicated by the accent plus a non-color signal (underline/glyph), not by color alone.

## Typography

- Display/serif (Playfair Display or Cormorant): screen titles, greeting text, and streak numerals only.
- Functional/sans (Inter or Jost): everything else — list items, buttons, labels, body text.
- Buttons and section labels use small-caps-style treatment with slightly increased letter-spacing (+0.02–0.05em) rather than size/weight alone for emphasis.

No custom font files are bundled in the MVP: the `serif`/`sans` family tokens in `src/ui/theme/typography.ts` resolve to the platform's own faces (Noto Serif / Roboto on Android). Swapping in Playfair Display and Inter is a change to that one file plus a font-loading step at the app root.

## Categories

Categories are distinguished by name and (optionally) a small hairline icon — not by background color or tint. The existing per-category base color and stable color-variant seed remain in the data model for backward compatibility but are no longer used to tint UI surfaces; category color values, if shown at all, are limited to a small neutral-weight icon glyph.

## Spacing, Radius, Surfaces

- Spacing scale: 8 / 12 / 20 / 32 / 48 (more generous than the previous scale).
- Radius scale: 2px (small) / 4px (default) / 999px (pill, rare — e.g. a single tag).
- No card elevation. List content sits on a single surface separated by 1px hairline dividers (`border` token). A focused/leading item may show a 1px inset border in the accent color at reduced opacity — this is the only permitted "highlight" treatment.

## Buttons and Interaction

- Primary actions: solid charcoal-on-stone (light) button, small-caps label.
- Secondary actions: underlined text, not filled/ghost buttons.
- Destructive actions remain visually distinct (rose/muted-red text or outline) and require confirmation, per Accessibility below.

## Routine and Task Item Design

- No card container, no category tint. A single-surface row with a hairline divider below it.
- Leading: optional hairline category icon. Title in sans. Trailing: serif streak numeral for routines (size may grow slightly with streak length) or a date/subtitle for tasks.
- Completion control: a small outline glyph (not a filled circle/checkbox) that becomes a gold check mark on completion, with a thin gold underline drawing in beneath the title (~250ms fade, left-to-right).

## Completed / Skipped / Missed / Paused States

- Completed: gold underline beneath the title + gold check glyph.
- Skipped: title dims to the muted-text token, no colored icon.
- Missed: a small muted-rose dot in the row's leading margin; the row itself does not change color.
- Paused: row set in italic, reduced opacity; a text label, not a badge.

Every state must remain distinguishable without color (shape/glyph/typography difference), per Accessibility below.

## Streak and Progress Visualization

- No rings, badges, flame icons, or dot-rows. The streak count itself, set in the serif display face, is the primary visual — its size may scale modestly with streak length as the sole "gamified" flourish.
- A weekly/period summary, where needed, is a single thin horizontal rule-based graph, not a multi-segment bar or ring widget.
- Level/milestone information (where retained) is presented as text, not a colorful multi-tile stat block.

## Navigation

- A minimal bottom bar (or a top segmented control for ≤3 destinations) with ultra-thin icon strokes.
- Active state: a small gold underline/dot beneath the icon+label — no filled pill background, no floating card-style bar.

## Icon Style

- Hairline stroke (1px), used sparingly and only where it aids scanning (category glyphs, nav icons, a small set of state glyphs). No icon-heavy card decoration.

## Motion and Micro-interactions

- 250–350ms ease-in-out fades; no spring/bounce/overshoot.
- The signature interaction is the gold underline drawing in on completion (~250ms).
- No animation blocks interaction; `prefers-reduced-motion`/reduced-motion settings disable the underline draw-in in favor of an instant state change.

## Accessibility

- Category (or any) color must never be the only source of information — every state above pairs color with a shape/glyph/typographic change.
- Text contrast: charcoal-on-stone and gold-on-stone pass WCAG AA at minimum for body text (verify each token pairing, especially gold text/icons on the stone background, at implementation time); dark-mode gold token (`#C08A2E`) exists specifically to keep 4.5:1 on the dark surface once dark mode ships.
- Touch targets remain minimum 44dp regardless of the visually minimal row design (achieved via row padding, not visual size).
- Destructive actions remain visually distinct (rose/muted-red) and require explicit confirmation.

The verified contrast table for every real text/icon-on-surface pairing, the touch-target audit, and the non-color-signal inventory live in `docs/ACCESSIBILITY.md` (re-verified against this token set in T082).

## Reference

`docs/design_reference.png` (the prior Soft Momentum mockup) is retired as the implementation reference. No new reference mockup exists yet; screens are built directly from the token/style rules above, validated against the Pre-Delivery Checklist in the `ui-ux-pro-max` skill (contrast, touch targets, icon consistency, reduced-motion) before each task is considered done.
