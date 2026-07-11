// Category color variant mapping (TASKS.md's T014). Per docs/DATA_MODEL.md's
// Category Color Variants section, `(base_color, color_variant_seed)` must
// map deterministically to a concrete style value, and items in the same
// category must only ever get same-family variants.
//
// docs/DESIGN_SYSTEM.md's Soft Momentum direction restores category color
// coding: each family below reads as one of the spec's pastel roles (mint ~
// sage/Health, skyBlue ~ Work/Focus, lavender ~ Personal care, softPeach ~
// Social/soft rose, apricot ~ Household, warmCream as a spare sixth family).

export const categoryPalette = {
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
} as const;

export type CategoryColorFamily = keyof typeof categoryPalette;
export type CategoryColorStop = keyof typeof categoryPalette.mint;

export interface CategoryColorVariant {
  background: string;
  accent: string;
  gradientStart: string;
  gradientEnd: string;
}

type VariantRecipe = (
  family: (typeof categoryPalette)[CategoryColorFamily]
) => CategoryColorVariant;

const VARIANT_RECIPES: readonly VariantRecipe[] = [
  (family) => ({
    background: family.lighter,
    accent: family.base,
    gradientStart: family.light,
    gradientEnd: family.lighter,
  }),
  (family) => ({
    background: family.light,
    accent: family.dark,
    gradientStart: family.base,
    gradientEnd: family.light,
  }),
  (family) => ({
    background: family.lighter,
    accent: family.dark,
    gradientStart: family.lighter,
    gradientEnd: family.light,
  }),
  (family) => ({
    background: family.light,
    accent: family.base,
    gradientStart: family.lighter,
    gradientEnd: family.base,
  }),
];

function findFamilyByBaseColor(baseColor: string): CategoryColorFamily | undefined {
  const normalized = baseColor.toLowerCase();
  return (Object.keys(categoryPalette) as CategoryColorFamily[]).find(
    (family) => categoryPalette[family].base.toLowerCase() === normalized
  );
}

/**
 * Deterministically maps a category's base color and an item's persisted
 * `color_variant_seed` to a concrete, same-family style value. Throws if
 * `baseColor` is not one of the palette family base colors, since only those
 * are offered by the category form (T022).
 */
export function getCategoryColorVariant(
  baseColor: string,
  colorVariantSeed: number
): CategoryColorVariant {
  const family = findFamilyByBaseColor(baseColor);
  if (!family) {
    throw new Error(`Unknown category base color: ${baseColor}`);
  }

  const recipeIndex =
    ((colorVariantSeed % VARIANT_RECIPES.length) + VARIANT_RECIPES.length) %
    VARIANT_RECIPES.length;

  return VARIANT_RECIPES[recipeIndex](categoryPalette[family]);
}
