import { Platform } from 'react-native';

// Type scale per docs/DESIGN_SYSTEM.md's Soft Momentum direction. Body and
// functional text use the platform sans; the confident moments —
// display/title/streak (screen titles, the greeting, streak numerals) — use
// Quicksand, a rounded display face that carries the app's soft warmth
// (T100). Quicksand is embedded natively at build time by expo-font's config
// plugin (app.json) as one "Quicksand" family with real 600/700 weights, so
// `fontWeight: '700'` selects the true bold file instead of a synthesized
// one, and nothing has to load at runtime. `serif` is kept as the token name
// so existing references don't need touching.
export const DISPLAY_FONT_FAMILY = 'Quicksand';

export const fontFamilies = {
  serif: DISPLAY_FONT_FAMILY,
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
