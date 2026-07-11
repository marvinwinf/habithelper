import {
  colors,
  colorsDark,
  fontFamilies,
  iconBadgeSizes,
  radius,
  softShadow,
  spacing,
  typography,
} from '../index';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

describe('color tokens', () => {
  it('defines the Soft Momentum light palette as valid hex strings', () => {
    expect(colors).toEqual({
      background: '#F7F1E6',
      surface: '#FFFCF6',
      surfaceMuted: '#EFE6D5',
      border: '#E4D9C7',
      textPrimary: '#3A342E',
      textSecondary: '#6E6459',
      textOnAccent: '#FFFCF6',
      accent: '#3F7256',
      missed: '#8A7B6A',
      destructive: '#9C4A41',
    });
  });

  it('defines a matching dark palette for future use', () => {
    expect(Object.keys(colorsDark).sort()).toEqual(Object.keys(colors).sort());
    for (const value of Object.values(colorsDark)) {
      expect(value).toMatch(HEX_COLOR);
    }
    expect(colorsDark.accent).toBe('#7FB093');
  });

  it('carries no green success color distinct from the accent', () => {
    expect(colors).not.toHaveProperty('categories');
    expect(colors).not.toHaveProperty('success');
    expect(colors).not.toHaveProperty('streakFlame');
  });

  it('keeps "missed" gentle and distinct from the destructive/delete color', () => {
    expect(colors.missed).not.toBe(colors.destructive);
  });
});

describe('spacing tokens', () => {
  it('defines the 4/8/12/20/32/48 scale', () => {
    expect(spacing).toEqual({ xxs: 4, xs: 8, sm: 12, md: 20, lg: 32, xl: 48 });
  });
});

describe('radius tokens', () => {
  it('defines the soft sm/md/lg scale plus a pill for circular elements', () => {
    expect(radius).toEqual({ sm: 10, md: 18, lg: 26, full: 999 });
  });
});

describe('elevation token', () => {
  it('keeps the card shadow an extremely subtle, warm whisper — never a Material slab', () => {
    // Soft paper: barely-there opacity, a soft (large) blur, and minimal
    // Android elevation, tinted with the warm text color rather than black.
    expect(softShadow.shadowOpacity).toBeLessThanOrEqual(0.1);
    expect(softShadow.shadowColor).toBe(colors.textPrimary);
    expect(softShadow.elevation).toBeLessThanOrEqual(2);
    expect(softShadow.shadowRadius).toBeGreaterThanOrEqual(12);
  });
});

describe('typography tokens', () => {
  it('defines every style with a well-formed size, line height, and weight', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThan(style.fontSize);
      expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(100);
      expect(Number(style.fontWeight)).toBeLessThanOrEqual(900);
      expect(style.fontFamily).toBeTruthy();
    }
  });

  it('gives display/title/streak extra weight for hierarchy rather than a second face', () => {
    const emphasisTokens = ['display', 'title', 'streak'] as const;
    for (const token of emphasisTokens) {
      expect(Number(typography[token].fontWeight)).toBeGreaterThanOrEqual(700);
    }

    const sansTokens = ['heading', 'body', 'bodySmall', 'caption', 'label'] as const;
    for (const token of sansTokens) {
      expect(typography[token].fontFamily).toBe(fontFamilies.sans);
    }
  });

  it('gives the label style normal case rather than small-caps tracking', () => {
    expect(typography.label).not.toHaveProperty('textTransform');
    expect(typography.label).not.toHaveProperty('letterSpacing');
  });
});

describe('icon badge size tokens', () => {
  it('defines an increasing container/icon scale for sm, md, lg', () => {
    const order: (keyof typeof iconBadgeSizes)[] = ['sm', 'md', 'lg'];
    for (let i = 1; i < order.length; i++) {
      const prev = iconBadgeSizes[order[i - 1]];
      const next = iconBadgeSizes[order[i]];
      expect(next.container).toBeGreaterThan(prev.container);
      expect(next.icon).toBeGreaterThan(prev.icon);
      expect(next.icon).toBeLessThan(next.container);
    }
  });

  it('keeps icon containers circular', () => {
    for (const size of Object.values(iconBadgeSizes)) {
      expect(size.radius).toBe(radius.full);
    }
  });
});
