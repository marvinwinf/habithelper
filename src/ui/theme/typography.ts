import { Platform } from 'react-native';

// Type scale per docs/DESIGN_SYSTEM.md's Quiet Atelier direction. Two faces:
// a serif display face used only for screen titles, the greeting, and streak
// numerals, and a sans face for everything functional. No custom font files
// are loaded in the MVP — these resolve to the platform's own serif/sans, so
// swapping in Playfair Display / Inter later means editing this file only.
export const fontFamilies = {
  serif: Platform.select({
    android: 'serif',
    ios: 'Times New Roman',
    default: 'serif',
  }),
  sans: Platform.select({
    android: 'sans-serif',
    ios: 'System',
    default: 'System',
  }),
} as const;

// Small-caps-style tracking for buttons and section labels: the direction
// asks for emphasis via letter-spacing rather than size or weight alone.
// 0.05em at 12px.
const labelTracking = 0.6;

export const typography = {
  // Serif — titles, greeting, streak numerals only.
  display: {
    fontFamily: fontFamilies.serif,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '400',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '400',
  },
  // Base size for the streak numeral; callers may scale it modestly with
  // streak length, which is the direction's sole permitted flourish.
  streak: {
    fontFamily: fontFamilies.serif,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '400',
  },

  // Sans — everything functional.
  heading: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 26,
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
  /** Button labels and section labels: tracked-out uppercase, not bold. */
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: labelTracking,
    textTransform: 'uppercase',
  },
} as const;

export type TypographyToken = keyof typeof typography;
