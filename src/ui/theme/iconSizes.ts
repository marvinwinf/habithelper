import { radius } from './radius';

// Icon badge size scale for src/ui/components/IconBadge.tsx — the rounded
// icon containers used on routine/task cards and the routine detail hero in
// the design reference mockup (docs/design_reference.png). Each step pairs a
// container diameter, the Ionicons glyph size that reads well inside it, and
// a matching corner radius (a rounded square, not a full circle, per
// docs/DESIGN_SYSTEM.md's "rounded icon container").

export const iconBadgeSizes = {
  sm: { container: 32, icon: 16, radius: radius.md },
  md: { container: 44, icon: 22, radius: radius.lg },
  lg: { container: 64, icon: 30, radius: radius.xl },
} as const;

export type IconBadgeSize = keyof typeof iconBadgeSizes;
