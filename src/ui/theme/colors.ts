// Color tokens per docs/DESIGN_SYSTEM.md's Quiet Atelier direction: a warm
// stone-white background, charcoal ink, a single antique-gold accent used
// only to carry meaning (primary action, active nav state, completion,
// streak), and a muted rose for the "missed" state. There is deliberately no
// green "success" color and no pastel category palette — categories are
// distinguished by name and glyph, never by tint.

// Rose does double duty: the "missed" occurrence state and destructive
// actions. The direction forbids an alarm red, and both readings want the
// same muted rose, so they share one constant rather than drifting apart.
//
// Rose on `background` measures 4.25:1 — AA for large text and graphics, but
// under the 4.5:1 that normal-size body text needs. T082 resolves this by
// darkening the rose or confining it to glyphs and large text.
const rose = '#9F6B5C';

export const colors = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  // Reserved for inset fills that are not list surfaces (disabled controls,
  // calendar day cells). List content sits on `surface` separated by hairline
  // `border` dividers, never on a tinted card.
  surfaceMuted: '#F2F0EC',
  border: '#E7E4DD',

  textPrimary: '#1C1917',
  textSecondary: '#78716C',
  textOnAccent: '#FAFAF9',

  accent: '#A16207',
  missed: rose,
  destructive: rose,
} as const;

// Defined now so the token pairings can be contrast-checked as a set; dark
// mode is not shipped in the MVP and nothing consumes these yet. The gold is
// lightened to keep 4.5:1 against the dark surface.
const roseDark = '#9F6B5C';

export const colorsDark = {
  background: '#1C1917',
  surface: '#242220',
  surfaceMuted: '#2A2724',
  border: '#3A3532',

  textPrimary: '#F5F3F0',
  textSecondary: '#A8A29E',
  textOnAccent: '#1C1917',

  accent: '#C08A2E',
  missed: roseDark,
  destructive: roseDark,
} as const;

export type ColorToken = keyof typeof colors;
