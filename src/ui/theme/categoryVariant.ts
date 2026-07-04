// Category color variant mapping (TASKS.md's T014). Per docs/DATA_MODEL.md's
// Category Color Variants section, `(base_color, color_variant_seed)` must
// map deterministically to a concrete style value, and items in the same
// category must only ever get same-family variants. Rather than deriving
// variants algorithmically (which risks drifting into unrelated hues), this
// selects among a small set of recipes built purely from the matching
// family's own token stops (colors.ts) — a re-theme only has to edit those
// tokens or recipes, never the persisted seeds.

import { colors, type CategoryColorFamily } from './colors';

export interface CategoryColorVariant {
  background: string;
  accent: string;
  gradientStart: string;
  gradientEnd: string;
}

type VariantRecipe = (family: (typeof colors.categories)[CategoryColorFamily]) => CategoryColorVariant;

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
  return (Object.keys(colors.categories) as CategoryColorFamily[]).find(
    (family) => colors.categories[family].base.toLowerCase() === normalized
  );
}

/**
 * Deterministically maps a category's base color and an item's persisted
 * `color_variant_seed` to a concrete, same-family style value. Throws if
 * `baseColor` is not one of docs/DESIGN_SYSTEM.md's palette family base
 * colors, since only those are offered by the category form (T022).
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

  return VARIANT_RECIPES[recipeIndex](colors.categories[family]);
}
