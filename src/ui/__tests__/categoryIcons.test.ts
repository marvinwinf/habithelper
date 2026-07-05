import { Ionicons } from '@expo/vector-icons';

import {
  CATEGORY_ICON_OPTIONS,
  FALLBACK_CATEGORY_ICON,
  categoryIconName,
} from '../categoryIcons';

describe('categoryIcons', () => {
  it('offers only names that actually exist in the Ionicons glyph map', () => {
    for (const option of CATEGORY_ICON_OPTIONS) {
      expect(Ionicons.glyphMap[option]).toBeDefined();
    }
    expect(Ionicons.glyphMap[FALLBACK_CATEGORY_ICON]).toBeDefined();
  });

  it('resolves a curated icon to itself', () => {
    expect(categoryIconName('book')).toBe('book');
  });

  it('falls back for NULL (pre-migration categories)', () => {
    expect(categoryIconName(null)).toBe(FALLBACK_CATEGORY_ICON);
    expect(categoryIconName(undefined)).toBe(FALLBACK_CATEGORY_ICON);
  });

  it('falls back for a stored name outside the curated set', () => {
    expect(categoryIconName('not-a-real-icon')).toBe(FALLBACK_CATEGORY_ICON);
  });
});
