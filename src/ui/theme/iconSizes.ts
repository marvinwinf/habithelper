import { radius } from './radius';

// Icon container size scale for src/ui/components/IconBadge.tsx. Each step
// pairs a container size, the Ionicons glyph size that reads well inside it,
// and a corner radius — near-square per docs/DESIGN_SYSTEM.md's Quiet
// Atelier geometry, since the direction has no rounded icon containers.

export const iconBadgeSizes = {
  sm: { container: 32, icon: 16, radius: radius.md },
  md: { container: 44, icon: 22, radius: radius.md },
  lg: { container: 64, icon: 30, radius: radius.md },
} as const;

export type IconBadgeSize = keyof typeof iconBadgeSizes;
