# Design System

## Design Direction

Working direction: Soft Momentum.

The visual style combines:

- calm, spacious wellness-app softness,
- clear dashboard hierarchy,
- large and direct interaction targets,
- subtle gamification.

The result should feel modern, polished, rounded, friendly, and slightly playful without becoming childish.

## Core Visual Style

- Light theme only in the MVP.
- Warm off-white app background.
- Soft pastel palette.
- Rounded cards and controls.
- Large corner radii.
- Low-contrast shadows.
- Clear typography hierarchy.
- Generous spacing.
- Icons instead of mascots or illustrations.
- Short visible animations.
- No visually aggressive warning states.

## Category Colors

Each category has one base color.

Items in the same category should use related but distinct visual variants.

Variants may adjust:

- lightness,
- saturation,
- warmth,
- subtle same-family gradient position.

The app must not use unrelated multi-color gradients inside one category item.

Each item's selected variant must remain stable across sorting, app restarts, migrations, and updates.

## Suggested Palette Families

- Mint green
- Lavender
- Apricot
- Sky blue
- Soft peach
- Warm cream neutrals

## Card Treatment

Routine cards may use:

- very light category-tinted background,
- subtle same-family gradient,
- stronger category accent for icon, progress, or completion control,
- rounded icon container,
- minimal shadow.

Task cards should be slightly more neutral than routine cards because routines are the primary product focus.

## Motion

Animations should be visible but short.

Examples:

- progress bar fill,
- checkmark transition,
- soft card fade or scale,
- first-completion streak highlight,
- stronger exceeded animation,
- level-up milestone animation.

Animations must not block interaction for long periods.

## Haptics

Use short haptic feedback for:

- routine completion,
- exceeded completion,
- first routine completion of the day,
- major level milestone.

## Accessibility

- Category color must never be the only source of information.
- Text contrast must remain readable on pastel backgrounds.
- Status must also use icons, labels, or shape changes.
- Touch targets must be comfortably sized.
- Destructive actions must be visually distinct and confirmed.

## Reference Image

Use the provided three-screen concept mockup as a visual direction reference, not as a pixel-perfect implementation requirement.

The implementation should preserve the style principles while remaining practical and consistent across real Android screen sizes.
