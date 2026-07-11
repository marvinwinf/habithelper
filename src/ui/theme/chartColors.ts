// Colors for the Progress dashboard and Focus of the day card only — the
// scoped multi-color exception documented in docs/DESIGN_SYSTEM.md's
// Dashboard Color Freedom section. Never used on list rows, forms, or chrome.

export const chartColors = {
  primary: '#3F7256', // sage — matches colors.accent
  secondary: '#D98E5E', // warm apricot
  tertiary: '#E7A9A0', // soft peach
  quaternary: '#7C6C88', // muted plum
  neutral: '#9A9083', // warm gray, for "other"/unclassified segments
} as const;

export const chartPalette = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.tertiary,
  chartColors.quaternary,
  chartColors.neutral,
] as const;
