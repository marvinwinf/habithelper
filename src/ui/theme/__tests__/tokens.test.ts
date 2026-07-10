import {
  colors,
  colorsDark,
  fontFamilies,
  iconBadgeSizes,
  radius,
  spacing,
  typography,
} from '../index';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

describe('color tokens', () => {
  it('defines the Quiet Atelier light palette as valid hex strings', () => {
    expect(colors).toEqual({
      background: '#FAFAF9',
      surface: '#FFFFFF',
      surfaceMuted: '#F2F0EC',
      border: '#E7E4DD',
      textPrimary: '#1C1917',
      textSecondary: '#78716C',
      textOnAccent: '#FAFAF9',
      accent: '#A16207',
      missed: '#9F6B5C',
      destructive: '#9F6B5C',
    });
  });

  it('defines a matching dark palette for future use', () => {
    expect(Object.keys(colorsDark).sort()).toEqual(Object.keys(colors).sort());
    for (const value of Object.values(colorsDark)) {
      expect(value).toMatch(HEX_COLOR);
    }
    expect(colorsDark.accent).toBe('#C08A2E');
  });

  it('carries no pastel category families and no green success color', () => {
    expect(colors).not.toHaveProperty('categories');
    expect(colors).not.toHaveProperty('success');
    expect(colors).not.toHaveProperty('streakFlame');
  });

  it('uses one rose for both the missed state and destructive actions', () => {
    expect(colors.missed).toBe(colors.destructive);
  });
});

describe('spacing tokens', () => {
  it('defines the 8/12/20/32/48 scale', () => {
    expect(spacing).toEqual({ xs: 8, sm: 12, md: 20, lg: 32, xl: 48 });
  });
});

describe('radius tokens', () => {
  it('defines the near-square 2/4 scale plus a rare pill', () => {
    expect(radius).toEqual({ sm: 2, md: 4, full: 999 });
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

  it('reserves the serif face for titles, display text, and streak numerals', () => {
    const serifTokens = ['display', 'title', 'streak'] as const;
    for (const token of serifTokens) {
      expect(typography[token].fontFamily).toBe(fontFamilies.serif);
    }

    const sansTokens = ['heading', 'body', 'bodySmall', 'caption', 'label'] as const;
    for (const token of sansTokens) {
      expect(typography[token].fontFamily).toBe(fontFamilies.sans);
    }
  });

  it('gives the label style small-caps-style tracking rather than extra size', () => {
    expect(typography.label.textTransform).toBe('uppercase');
    expect(typography.label.letterSpacing).toBeGreaterThan(0);
    expect(typography.label.fontSize).toBe(typography.caption.fontSize);
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

  it('keeps icon containers near-square', () => {
    for (const size of Object.values(iconBadgeSizes)) {
      expect(size.radius).toBe(radius.md);
    }
  });
});
