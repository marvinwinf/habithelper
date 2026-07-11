// Spacing scale per docs/DESIGN_SYSTEM.md's Soft Momentum direction —
// generous but efficient: open enough to breathe, tight enough that cards
// still read as organized sections rather than editorial whitespace.

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;
