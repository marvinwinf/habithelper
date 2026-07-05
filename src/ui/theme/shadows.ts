import { colors } from './colors';

// Low-contrast elevation per docs/DESIGN_SYSTEM.md's "Low-contrast shadows"
// direction — a single soft token reused wherever a card needs to lift off
// the warm off-white background, per the design reference mockup
// (docs/design_reference.png). Includes both the iOS shadow* properties and
// Android's elevation so the same object works cross-platform, even though
// the MVP ships Android-only.

export const shadows = {
  soft: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export type ShadowToken = keyof typeof shadows;
