// Spacing scale per docs/DESIGN_SYSTEM.md's Quiet Atelier direction —
// deliberately coarse and more generous than the previous scale, so screens
// get their hierarchy from negative space rather than from borders and fills.

export const spacing = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;
