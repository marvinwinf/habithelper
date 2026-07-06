import type { Ionicons } from '@expo/vector-icons';

// Curated Ionicons set offered by the category form (T063). The database
// stores the raw glyph name (category.icon, nullable); this module is the
// single UI-layer mapping from that stored value to something renderable —
// including the fallback for categories created before migration 0001 or
// holding a name that a future icon-set update no longer ships.

export type CategoryIconName = keyof typeof Ionicons.glyphMap;

export const CATEGORY_ICON_OPTIONS: readonly CategoryIconName[] = [
  'book',
  'walk',
  'basket',
  'barbell',
  'bed',
  'brush',
  'cafe',
  'cart',
  'heart',
  'home',
  'leaf',
  'musical-notes',
  'people',
  'restaurant',
  'school',
  'water',
];

export const FALLBACK_CATEGORY_ICON: CategoryIconName = 'pricetag';

/**
 * Resolves a category's stored icon value to a renderable Ionicons name,
 * falling back for NULL (pre-migration rows) and for names outside the
 * curated set (defensive: a stored value the current set no longer offers).
 */
export function categoryIconName(icon: string | null | undefined): CategoryIconName {
  if (icon && (CATEGORY_ICON_OPTIONS as readonly string[]).includes(icon)) {
    return icon as CategoryIconName;
  }
  return FALLBACK_CATEGORY_ICON;
}
