import { colors, type CategoryColorFamily } from '../colors';
import { getCategoryColorVariant } from '../categoryVariant';

const FAMILIES = Object.keys(colors.categories) as CategoryColorFamily[];
const SEEDS = [0, 1, 2, 3, 4, 5, 7, 13, 21, 100, -1, -5];

describe('getCategoryColorVariant', () => {
  it('is deterministic for the same base color and seed', () => {
    for (const family of FAMILIES) {
      for (const seed of SEEDS) {
        const baseColor = colors.categories[family].base;
        const first = getCategoryColorVariant(baseColor, seed);
        const second = getCategoryColorVariant(baseColor, seed);
        expect(second).toEqual(first);
      }
    }
  });

  it('only ever produces colors from the matching family, never another family', () => {
    for (const family of FAMILIES) {
      const baseColor = colors.categories[family].base;
      const allowedValues = new Set<string>(
        Object.values(colors.categories[family])
      );

      for (const seed of SEEDS) {
        const variant = getCategoryColorVariant(baseColor, seed);
        expect(allowedValues.has(variant.background)).toBe(true);
        expect(allowedValues.has(variant.accent)).toBe(true);
        expect(allowedValues.has(variant.gradientStart)).toBe(true);
        expect(allowedValues.has(variant.gradientEnd)).toBe(true);
      }
    }
  });

  it('is case-insensitive when matching the base color', () => {
    const baseColor = colors.categories.mint.base;
    expect(getCategoryColorVariant(baseColor.toLowerCase(), 3)).toEqual(
      getCategoryColorVariant(baseColor.toUpperCase(), 3)
    );
  });

  it('produces more than one distinct variant across a range of seeds', () => {
    const baseColor = colors.categories.lavender.base;
    const results = new Set(
      SEEDS.map((seed) => JSON.stringify(getCategoryColorVariant(baseColor, seed)))
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('throws for a base color that is not a known palette family', () => {
    expect(() => getCategoryColorVariant('#123456', 0)).toThrow();
  });
});
