import { colors, iconBadgeSizes, radius, shadows, spacing, typography } from '../index';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

describe('color tokens', () => {
  it('defines every flat color as a valid hex string', () => {
    const flatKeys: (keyof typeof colors)[] = [
      'background',
      'surface',
      'surfaceMuted',
      'border',
      'textPrimary',
      'textSecondary',
      'textOnAccent',
      'accent',
      'destructive',
      'success',
    ];

    for (const key of flatKeys) {
      expect(colors[key]).toMatch(HEX_COLOR);
    }
  });

  it('defines each category family with a full, same-family set of tonal stops', () => {
    const expectedFamilies = [
      'mint',
      'lavender',
      'apricot',
      'skyBlue',
      'softPeach',
      'warmCream',
    ] as const;
    const expectedStops = ['base', 'light', 'lighter', 'dark'] as const;

    expect(Object.keys(colors.categories).sort()).toEqual(
      [...expectedFamilies].sort()
    );

    for (const family of expectedFamilies) {
      const stops = colors.categories[family];
      expect(Object.keys(stops).sort()).toEqual([...expectedStops].sort());
      for (const stop of expectedStops) {
        expect(stops[stop]).toMatch(HEX_COLOR);
      }
    }
  });
});

describe('spacing tokens', () => {
  it('defines a monotonically increasing scale of positive numbers', () => {
    const values = Object.values(spacing);
    expect(values.every((value) => typeof value === 'number' && value > 0)).toBe(
      true
    );
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });
});

describe('radius tokens', () => {
  it('defines a monotonically increasing scale of positive numbers', () => {
    const { full, ...scale } = radius;
    const values = Object.values(scale);
    expect(values.every((value) => typeof value === 'number' && value > 0)).toBe(
      true
    );
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
    expect(full).toBeGreaterThan(Math.max(...values));
  });
});

describe('typography tokens', () => {
  it('defines every style with a well-formed size, line height, and weight', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThan(style.fontSize);
      expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(100);
      expect(Number(style.fontWeight)).toBeLessThanOrEqual(900);
    }
  });
});

describe('shadow tokens', () => {
  it('defines a low-contrast soft shadow usable on both platforms', () => {
    expect(shadows.soft.shadowOpacity).toBeGreaterThan(0);
    expect(shadows.soft.shadowOpacity).toBeLessThan(0.2);
    expect(shadows.soft.elevation).toBeGreaterThan(0);
    expect(shadows.soft.shadowColor).toMatch(HEX_COLOR);
  });
});

describe('icon badge size tokens', () => {
  it('defines an increasing container/icon/radius scale for sm, md, lg', () => {
    const order: (keyof typeof iconBadgeSizes)[] = ['sm', 'md', 'lg'];
    for (let i = 1; i < order.length; i++) {
      const prev = iconBadgeSizes[order[i - 1]];
      const next = iconBadgeSizes[order[i]];
      expect(next.container).toBeGreaterThan(prev.container);
      expect(next.icon).toBeGreaterThan(prev.icon);
      expect(next.icon).toBeLessThan(next.container);
    }
  });
});
