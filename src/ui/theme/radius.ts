// Corner radius scale per docs/DESIGN_SYSTEM.md's "large corner radii,
// rounded cards and controls" direction.

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
