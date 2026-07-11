import { Platform } from 'react-native';

// Type scale per docs/DESIGN_SYSTEM.md's Soft Momentum direction: one
// friendly, highly-readable sans everywhere — hierarchy comes from weight
// and size, not from a second display face. `serif` is kept as a token name
// (rather than deleted) purely so `typography.display/title/streak` don't
// need touching; it now resolves to the same rounded system sans as `sans`.
// No custom font files are bundled in the MVP.
export const fontFamilies = {
  serif: Platform.select({ android: 'sans-serif-medium', ios: 'System', default: 'System' }),
  sans: Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' }),
} as const;

export const typography = {
  // Confident but not oversized — hierarchy comes from weight, not scale.
  display: {
    fontFamily: fontFamilies.serif,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  // Base size for the streak numeral; callers may scale it modestly with
  // streak length, the direction's one permitted gamified flourish.
  streak: {
    fontFamily: fontFamilies.serif,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
  },

  heading: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  /** Button labels and section headings: medium weight, normal case. */
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
} as const;

export type TypographyToken = keyof typeof typography;
