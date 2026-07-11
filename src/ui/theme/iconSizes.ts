import { radius } from './radius';

// Icon container size scale for src/ui/components/IconBadge.tsx. Each step
// pairs a container size with the Ionicons glyph size that reads well inside
// it; containers are fully circular per docs/DESIGN_SYSTEM.md's Soft
// Momentum shape language ("circular icons").

export const iconBadgeSizes = {
  sm: { container: 32, icon: 16, radius: radius.full },
  md: { container: 44, icon: 22, radius: radius.full },
  lg: { container: 64, icon: 30, radius: radius.full },
} as const;

export type IconBadgeSize = keyof typeof iconBadgeSizes;
