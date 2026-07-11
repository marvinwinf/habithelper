// Color tokens per docs/DESIGN_SYSTEM.md's Soft Momentum direction: warm
// off-white surfaces with gentle layering (no shadows needed — `surface` and
// `background` differ just enough to read as a card), a single muted sage
// green as the app's calm "primary" accent (buttons, progress, streak,
// focus), and a soft warm taupe for "missed" so an off day never reads as a
// warning. Category identity comes from the pastel family palette in
// categoryVariant.ts, not from this file.

export const colors = {
  background: '#F7F1E6',
  surface: '#FFFCF6',
  // Inset fills: disabled controls, calendar day cells, muted chip
  // backgrounds — a touch more saturated than `surface` for gentle contrast.
  surfaceMuted: '#EFE6D5',
  border: '#E4D9C7',

  textPrimary: '#3A342E',
  textSecondary: '#6E6459',
  textOnAccent: '#FFFCF6',

  // Muted sage — the one dominant accent: primary buttons, progress fill,
  // streak numeral, selected states, focus rings.
  accent: '#3F7256',
  // A gentle warm taupe, not a color associated with failure — an imperfect
  // day should never look punished (see Gamification in the design doc).
  // Used for glyphs/dots (3:1 graphic bar), never for small text.
  missed: '#8A7B6A',
  // Distinct from `missed`: only real destructive confirmations (delete
  // routine/task/category) use this muted terracotta. Clears 4.5:1 for
  // small text on every light surface (see docs/ACCESSIBILITY.md).
  destructive: '#9C4A41',
} as const;

// Defined for future use; no runtime theme switch consumes this yet.
export const colorsDark = {
  background: '#231F1A',
  surface: '#2B2620',
  surfaceMuted: '#332C24',
  border: '#453C31',

  textPrimary: '#F3EEE4',
  textSecondary: '#BBAE9B',
  textOnAccent: '#1B2620',

  accent: '#7FB093',
  missed: '#8A7D6D',
  destructive: '#E0968B',
} as const;

export type ColorToken = keyof typeof colors;
