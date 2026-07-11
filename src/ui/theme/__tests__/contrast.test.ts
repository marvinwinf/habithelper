import { colors, colorsDark } from '../index';

// WCAG 2.1 relative luminance + contrast ratio, so the documented token
// pairings (docs/ACCESSIBILITY.md) stay regression-proof: a future tweak to a
// color token that drops a real pairing below its AA bar fails here rather
// than shipping silently. `NORMAL` = 4.5:1 (body/label text under 18pt),
// `LARGE_OR_GRAPHIC` = 3.0:1 (>=18pt/14pt-bold text, icons, and other
// non-text graphics).
const NORMAL = 4.5;
const LARGE_OR_GRAPHIC = 3.0;

function channelLuminance(component: number): number {
  const c = component / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

type Pairing = {
  name: string;
  fg: keyof typeof colors;
  bg: keyof typeof colors;
  min: number;
};

// Every text/icon-on-background pairing the app actually renders, each tagged
// with the WCAG bar its usage requires (see docs/ACCESSIBILITY.md).
const LIGHT_PAIRINGS: Pairing[] = [
  { name: 'primary text on background', fg: 'textPrimary', bg: 'background', min: NORMAL },
  { name: 'primary text on surface', fg: 'textPrimary', bg: 'surface', min: NORMAL },
  { name: 'primary text on surfaceMuted (calendar day number)', fg: 'textPrimary', bg: 'surfaceMuted', min: NORMAL },
  { name: 'secondary text on background', fg: 'textSecondary', bg: 'background', min: NORMAL },
  { name: 'secondary text on surface (task subtitle)', fg: 'textSecondary', bg: 'surface', min: NORMAL },
  { name: 'accent text on background', fg: 'accent', bg: 'background', min: NORMAL },
  { name: 'accent text on surface', fg: 'accent', bg: 'surface', min: NORMAL },
  { name: 'on-accent stone on accent (FAB, exceeded cell)', fg: 'textOnAccent', bg: 'accent', min: NORMAL },
  { name: 'destructive/overdue label on background', fg: 'destructive', bg: 'background', min: NORMAL },
  { name: 'destructive/overdue label on surface', fg: 'destructive', bg: 'surface', min: NORMAL },
  { name: 'destructive label on surfaceMuted', fg: 'destructive', bg: 'surfaceMuted', min: NORMAL },
  // Icon/graphic-only pairings: state glyphs and swatches on inset cells.
  { name: 'accent glyph on surfaceMuted (completed check, joker star)', fg: 'accent', bg: 'surfaceMuted', min: LARGE_OR_GRAPHIC },
  { name: 'secondary glyph on surfaceMuted (skipped/moved/paused icons)', fg: 'textSecondary', bg: 'surfaceMuted', min: LARGE_OR_GRAPHIC },
];

const DARK_PAIRINGS: Pairing[] = [
  { name: 'primary text on background', fg: 'textPrimary', bg: 'background', min: NORMAL },
  { name: 'primary text on surface', fg: 'textPrimary', bg: 'surface', min: NORMAL },
  { name: 'secondary text on background', fg: 'textSecondary', bg: 'background', min: NORMAL },
  { name: 'secondary text on surface', fg: 'textSecondary', bg: 'surface', min: NORMAL },
  { name: 'accent text on background', fg: 'accent', bg: 'background', min: NORMAL },
  { name: 'accent text on surface', fg: 'accent', bg: 'surface', min: NORMAL },
  { name: 'on-accent ink on accent', fg: 'textOnAccent', bg: 'accent', min: NORMAL },
  { name: 'destructive label on background', fg: 'destructive', bg: 'background', min: NORMAL },
  { name: 'destructive label on surface', fg: 'destructive', bg: 'surface', min: NORMAL },
];

describe('token contrast (WCAG AA)', () => {
  describe('light palette', () => {
    it.each(LIGHT_PAIRINGS)('$name meets its AA bar', ({ fg, bg, min }) => {
      expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
    });
  });

  describe('dark palette (defined for future use)', () => {
    it.each(DARK_PAIRINGS)('$name meets its AA bar', ({ fg, bg, min }) => {
      expect(contrastRatio(colorsDark[fg], colorsDark[bg])).toBeGreaterThanOrEqual(min);
    });
  });

  it('keeps "missed" above the graphic bar on every light surface (glyph/dot use only, never small text)', () => {
    for (const surface of ['background', 'surface', 'surfaceMuted'] as const) {
      expect(contrastRatio(colors.missed, colors[surface])).toBeGreaterThanOrEqual(LARGE_OR_GRAPHIC);
    }
  });

  it('keeps the destructive terracotta above AA for small text on every light surface', () => {
    for (const surface of ['background', 'surface', 'surfaceMuted'] as const) {
      expect(contrastRatio(colors.destructive, colors[surface])).toBeGreaterThanOrEqual(NORMAL);
    }
  });
});
