# Design System

## Design Direction

Working direction: Soft Momentum.

The visual style combines:

- warm, calm surfaces (off-white background, a lightly lifted cream card surface),
- a single muted sage-green accent used generously for primary actions, progress, and streaks,
- soft rounded geometry everywhere (cards, buttons, inputs, pills, circular icons),
- pastel category colors that gently tint each routine/task's identity,
- restrained, purposeful gamification (streaks, milestones — never punishment),
- short, gentle motion, including a subtle spring on completion.

The result should feel friendly, calm, and lightweight — pleasant to open repeatedly throughout the day. Playful without becoming childish; modern without feeling cold or corporate.

Soft Momentum was this app's original direction before the "Quiet Atelier" MVP restyle; this revives and refreshes it rather than starting over — most of the underlying plumbing (category palette, `color_variant_seed`) survived that detour and is live again.

## Core Visual Style

- Light theme as the primary/default MVP theme (dark tokens defined for future use, not shipped as default).
- Warm off-white app background (`background`); cards sit on a lightly lifted cream `surface` — the two-tone contrast is what reads as "layered," not a shadow.
- Dark warm-gray primary text, never pure black; medium warm-gray secondary text.
- One muted sage accent (`accent`) carries primary actions, progress fill, streak numerals, selected/focus states. It's used more freely than a "precious" accent — that's the point of Soft Momentum.
- Pastel category colors (see Categories below) tint a routine/task's card lightly — one dominant color per card, never several competing hues on one screen.
- Soft, consistently rounded geometry: `sm`/`md`/`lg` radii plus a `full` pill/circle step — see Spacing, Radius, Surfaces.
- Cards read as soft paper: a lightly lifted `surface`, a soft low-contrast border (lighter than a hairline divider), generous internal padding, and — where it genuinely helps lift a card off the background — an extremely subtle, low-opacity shadow. Layering stays gentle: never a hard border, never a pronounced floating panel, never competing tonal steps on one screen.
- One typeface, hierarchy from weight and size, not a second display face.
- Icons are simple, rounded, and circular-badged; used a bit more freely than Quiet Atelier's hairline sparsity, but still support labels rather than replace them.
- Motion is short and gentle: fades for mount/dismiss, a subtle spring for completion and milestones — never a bounce/overshoot loop or long transition.
- No status is punishing: a missed day reads as neutral, not alarming; only real destructive actions (delete) use an assertive color, and always with confirmation.

## Visual Hierarchy and Reading Order

Every screen must have one obvious reading order — sections must not all carry the same visual weight. The eye should be guided top-to-bottom by deliberate contrast in size, weight, spacing, and color emphasis, not left to scan an even grid of equal-looking blocks.

The Today screen's canonical order is **Greeting → Daily progress (overall streak + today's completion) → Focus of the day → Today's routines → Tasks** (see `docs/SCREEN_SPECIFICATIONS.md`). Routines are always prioritized over tasks. When adding to any screen, place it in the reading order on purpose and give it a weight proportional to its importance; simplify or remove before you add.

## Whitespace and Rhythm

The layout should breathe — Soft Momentum reads as calm paper, and crowding kills that feeling.

- Prefer generous vertical spacing **between** sections (use the larger `lg`/`xl` steps for section gaps) so each section reads as its own quiet block.
- Give cards generous internal padding; content should never crowd a card's edges.
- When a screen feels compressed, the fix is more space and fewer elements — never tighter packing. Add whitespace before adding UI.

## List Row Actions (no overflow menus)

Routine and task **list rows do not show a three-dot / overflow menu**. A list is for viewing and completing items — that is its entire job, and per-row menus add visual noise to the screen that matters most.

- Tapping a row opens an actions bottom sheet (or, where one exists, the item's dedicated detail screen) — that is the single place item actions live.
- Item actions belong only in that sheet/detail, never inline on the row: **Statistik** (opens the routine detail — streak, level, calendar), **Edit** (the form is where category, and therefore color, is changed), **Pause/Reactivate**, **Delete**, plus the routine's today-occurrence actions (**move to tomorrow**, **conscious skip**).
- The only inline control a list row carries is its completion control.

## Color Tokens

| Token | Light | Dark (future) |
|---|---|---|
| background | `#F7F1E6` | `#231F1A` |
| surface | `#FFFCF6` | `#2B2620` |
| surface muted | `#EFE6D5` | `#332C24` |
| text | `#3A342E` | `#F3EEE4` |
| muted text | `#6E6459` | `#BBAE9B` |
| text on accent | `#FFFCF6` | `#1B2620` |
| border | `#E4D9C7` | `#453C31` |
| accent (sage) | `#3F7256` | `#7FB093` |
| missed (taupe) | `#8A7B6A` | `#8A7D6D` |
| destructive (terracotta) | `#9C4A41` | `#E0968B` |

`missed` and `destructive` are deliberately different colors now (they were aliased under Quiet Atelier): a missed day is not a failure state and must never look like one, so it sits at a gentle, low-saturation taupe that only needs to clear the graphic/icon contrast bar (3:1) — it is never used for small text. `destructive` is reserved for real, confirmed deletions and is tuned to clear 4.5:1 for small text on every light surface (see `docs/ACCESSIBILITY.md`).

Category identity does **not** live in this table — see `src/ui/theme/categoryVariant.ts` and Categories below.

## Typography

One typeface (the platform system sans) for the whole app — no separate display/serif face. Hierarchy comes from weight and size:

- `display` / `title` / `streak`: bold (700), sized for confident section titles and the streak numeral — prominent but not oversized.
- `heading` / `body` / `bodySmall` / `caption`: regular/medium weight, functional text.
- `label` (buttons, section headings): medium weight (600), normal case — no small-caps/letter-spacing treatment.

No custom font files are bundled in the MVP: `fontFamilies.serif`/`.sans` in `src/ui/theme/typography.ts` both resolve to the platform's own sans face. The `serif` token name is kept only so `typography.display/title/streak` don't need touching elsewhere; swapping in a genuinely rounded display font (e.g. Baloo 2, Quicksand) later is a change to that one file plus a font-loading step.

## Categories

Categories are told apart by a pastel color family in addition to name/icon — reviving the mapping that Quiet Atelier had retired to "legacy" compatibility-only status. `src/ui/theme/categoryVariant.ts`'s `categoryPalette` defines six families (`mint`, `lavender`, `apricot`, `skyBlue`, `softPeach`, `warmCream`), each with `base`/`light`/`lighter`/`dark` stops; `getCategoryColorVariant(base_color, color_variant_seed)` deterministically maps a category's persisted `base_color` and an item's persisted `color_variant_seed` to a same-family `{background, accent, gradientStart, gradientEnd}` variant. No new migration is needed — `base_color`, `icon`, and `color_variant_seed` were never removed from the data model.

Suggested role mapping when presenting category choices: Health → `mint` (sage), Work/Focus → `skyBlue`, Personal care → `lavender`, Social → `softPeach` (soft rose), Household → `apricot`, with `warmCream` as a spare sixth family.

A screen should still show one dominant color at a time — a category's tint applies to its own card only; it must never spill into unrelated chrome (nav bar, headers, primary buttons all stay on the sage `accent`).

## Spacing, Radius, Surfaces

- Spacing scale: 4 / 8 / 12 / 20 / 32 / 48 (`xxs`…`xl`) — the 4px step exists for tight card-internal padding.
- Radius scale: `sm` 10px (compact controls/tags), `md` 18px (buttons, input fields), `lg` 26px (cards, sheets), `full` 999px (pills, toggles, circular icon badges).
- Cards (`src/ui/components/Card.tsx`) use `radius.lg` (or larger for hero/soft-paper cards), generous internal padding, and a soft low-contrast `border`, sitting on `surface` against the `background`. Tonal contrast does most of the layering; an extremely subtle, low-opacity shadow may reinforce it where a card needs to lift off the background, but it must stay barely perceptible — never a Material drop shadow.
- Use the larger spacing steps (`lg` 20 / `xl` 32, or more) for gaps between sections so the screen breathes; reserve the 4/8/12 steps for spacing inside a card.

## Buttons and Interaction

- Primary actions: solid `accent` (sage) fill, `textOnAccent` label, `radius.md`, normal-case medium-weight label.
- Secondary actions: soft `surfaceMuted` fill or outline, not underlined text.
- Destructive actions: `destructive` terracotta text/outline, and always require confirmation.
- Every tappable control gets a gentle press response: `pressedOpacity` (0.85) plus `pressedScale` (0.96) — a small scale-down reads as tactile, per `src/ui/theme/interaction.ts`.

## Routine and Task Item Design

- Each row is a light, soft-paper card (`radius.lg` or larger, `surface` background, soft low-contrast border, generous internal padding), lightly tinted by its category's `getCategoryColorVariant` background when a category is set. Keep the card feeling light — lean on the tint and gentle rounding, not heavy borders or backgrounds — with at most an extremely subtle shadow.
- Leading: circular `IconBadge` (now fully round, `radius.full`). Title in the functional weight, then one compact meta line: for routines the "time · schedule" subtitle plus a small flame-and-count streak, for tasks the date/subtitle (plus the overdue marker when relevant). Rows stay two text lines tall and share a common minimum height (`listCardMinHeight`) so routines and tasks line up as one even rhythm — the bold, prominent streak numeral treatment stays on the Today header and routine detail, not on list rows.
- No overflow / three-dot menu on the row. The row carries only its title, category treatment, streak/date, and completion control; all other actions live in the routine/task detail screen or a bottom sheet opened by tapping the row (see List Row Actions above).
- Completion control: one shared circular control (`CompletionControl`, a compact 36dp visual with hitSlop keeping the touch target ≥44dp) that fills with the accent color and shows a checkmark on completion, with a quick, gentle spring (`GENTLE_SPRING`) rather than a plain fade — tactile, not flashy. Routines and tasks use the same control so completion reads identically everywhere; tasks simply have no exceeded state.

## Completed / Skipped / Missed / Paused States

- Completed: `CompletionControl` fills with the accent + checkmark, brief spring pop.
- Skipped: title dims to muted text, outline-circle glyph.
- Missed: a small taupe (`missed` token) dot/glyph — never the destructive terracotta, never a filled red state. Framing stays "you can continue," not "you failed."
- Paused: reduced opacity + a text label, not a badge.

Every state keeps a shape/glyph/typographic difference so color is never the only signal (see Accessibility).

## Streak and Progress Visualization

- The streak count, bold and prominent, remains the primary visual, sized modestly by streak length.
- Level/milestone moments get a brief, gentle acknowledgement (a short spring pulse, a small supportive message) — never confetti, never a loss-framed warning.
- Progress bars (`src/ui/components/ProgressBar.tsx`) keep rounded ends and a low-contrast track, filled with the accent color.

## Navigation

- Bottom navigation has four destinations — **Today**, **Plan**, **Progress**, **Me** — plus a floating create button embedded in the center of the bar itself (not a separate FAB floating above it). The active destination uses a soft pill-shaped fill (`radius.full`, `surfaceMuted`/accent-tinted) rather than an underline — selection should look tactile and filled, not just marked.
- The Routines Active/Paused control uses the same pill-selected treatment.

## Dashboard Color Freedom (Progress screen and Focus of the day)

Soft Momentum's "one accent, category tint stays on its own card" rule governs every list/form screen. The **Progress** dashboard and the **Focus of the day** card are the one deliberate exception: streak rings, the completion-over-time chart, and the habit-breakdown donut may each carry their own color (sage for movement/primary, warm apricot/peach for secondary series, muted plum for a fourth) so the data reads at a glance. This exception is scoped narrowly:

- it applies only to the Progress screen's chart/stat surfaces and the Today screen's Focus-of-the-day card — not to the tab bar, headers, buttons, or any list row elsewhere,
- every chart still sits on the warm off-white/cream surface tokens, uses the same rounded-card geometry, and keeps text at the standard `textPrimary`/`textSecondary` tokens,
- category-tinted routine/task rows on Today, Plan, and the Routines list keep the existing one-dominant-color-per-card rule untouched.

## Focus of the Day

A small daily-highlight card on the Today screen, above the routine list: an accent-tinted (sage) card with a short label ("Fokus des Tages") and a one-line prompt, plus a decorative placeholder icon/illustration. Content is a rotating static list keyed by day-of-year in the MVP — no personalization or backend involved.

## Streak Ring

The Progress screen's hero streak uses a circular ring (filled arc, `accent`-colored progress against a `surfaceMuted` track) with the streak number centered inside, rather than the plain bold numeral used elsewhere. The plain numeral treatment on Today/routine detail is unchanged — the ring is specific to the Progress dashboard's hero moment.

## Icon Style

- Simple, friendly Ionicons glyphs in circular badges (`IconBadge`, now `radius.full`). Icons support labels; they don't replace important text.

## Motion and Micro-interactions

- Fades/timings stay short (`MAX_SHORT_ANIMATION_DURATION_MS`, 400ms ceiling) for mount/dismiss/progress transitions.
- Completion and milestone moments use `GENTLE_SPRING` (`src/ui/animation/constants.ts`) — a quick, non-bouncy settle (high friction relative to tension), not a plain fade and not an exaggerated bounce.
- Bottom sheets animate their two layers independently (`src/ui/components/Sheet.tsx`): the scrim only fades — it never moves — while the panel alone slides up from below with a gentle ease-out, and dismissal plays the reverse before unmounting. Never slide the whole modal subtree (scrim included) as one pane. Follow-up navigation waits for the sheet's exit (its `onDismissed`) instead of racing it.
- List cards fade in with a small capped stagger (`mountStaggerDelayMs`) so a screen builds up gently; rows that re-sort after a completion/undo glide to their new position after a short hold (`animateListSettle`) so the completion pop reads first.
- Screen-level transitions are deliberate and consistent: tabs cross-fade, pushed stack screens slide in from the right.
- Reduced-motion settings collapse any spring/fade/slide to an instant state change.

## Gamification

- Streaks, weekly completion summaries, and gentle milestone text are the full extent of gamification — no points/currency, no leaderboards, no countdown pressure.
- A broken streak is communicated neutrally (the `missed` taupe, a plain count reset) — never a loss-framed message or a red warning state.

## Accessibility

- Category (or any) color must never be the only source of information — every state above pairs color with a shape/glyph/typographic change.
- Text contrast: verified per-pairing in `src/ui/theme/__tests__/contrast.test.ts` against WCAG AA (4.5:1 normal text, 3:1 large text/icons); see `docs/ACCESSIBILITY.md` for the full table.
- Touch targets remain minimum 44dp.
- Destructive actions stay visually distinct (terracotta) and require explicit confirmation.

## Reference

`docs/design_reference.png` is the original Soft Momentum mockup this direction is reviving — useful as a loose visual reference, though the token values above are the source of truth. Screens are built directly from the token/style rules above; validate each screen against Usability → Accessibility → Clarity → Consistency → Calm appearance → Delight → Decoration, in that priority order, before considering it done.
