// Corner radius scale per docs/DESIGN_SYSTEM.md's Quiet Atelier direction:
// near-square, considered geometry. Only the rare surface that needs any
// softening gets `sm`/`md`; `full` is reserved for the occasional pill (a
// single tag), not for cards or buttons.

export const radius = {
  sm: 2,
  md: 4,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;
