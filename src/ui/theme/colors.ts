// Color tokens per docs/DESIGN_SYSTEM.md's Soft Momentum direction: warm
// off-white background, light theme only, pastel category palette families.
// Each category family carries a small set of same-family tonal stops so
// T014's variant mapping has concrete values to select between.

export const colors = {
  background: '#FAF6F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F3ECE2',
  border: '#E8DFD1',

  textPrimary: '#2B2620',
  textSecondary: '#6B6459',
  textOnAccent: '#FFFFFF',

  accent: '#7C9885',
  destructive: '#C1544A',
  success: '#5B8C6B',
  // Streak flame accent per the design reference mockup — warm orange,
  // deliberately outside the pastel category families so the streak reads
  // as its own signal, not as a category color.
  streakFlame: '#E8853D',

  categories: {
    mint: {
      base: '#8FBFA0',
      light: '#C9E4D2',
      lighter: '#E7F4EC',
      dark: '#5E9A76',
    },
    lavender: {
      base: '#A9A0D6',
      light: '#D5CFEE',
      lighter: '#EFEBF9',
      dark: '#7C71B8',
    },
    apricot: {
      base: '#F0A868',
      light: '#F7CFA0',
      lighter: '#FCEBD8',
      dark: '#D98A44',
    },
    skyBlue: {
      base: '#7FB8D6',
      light: '#BEE0EE',
      lighter: '#E5F3F8',
      dark: '#4F94B8',
    },
    softPeach: {
      base: '#F2A69A',
      light: '#F8CFC7',
      lighter: '#FCEBE7',
      dark: '#DE7E6E',
    },
    warmCream: {
      base: '#D9C7A3',
      light: '#EBDFC7',
      lighter: '#F7F1E4',
      dark: '#B89D6E',
    },
  },
} as const;

export type CategoryColorFamily = keyof typeof colors.categories;
export type CategoryColorStop = keyof typeof colors.categories.mint;
