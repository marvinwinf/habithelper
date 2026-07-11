import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { getCategoryColorVariant } from '../theme/categoryVariant';
import { categoryIconName } from '../categoryIcons';

export interface CategoryBadgeProps {
  label: string;
  /** The category's stored icon (category.icon); null/undefined renders the fallback icon. */
  icon?: string | null;
  /** The category's persisted base_color; omit for a neutral, untinted badge. */
  baseColor?: string | null;
  /** The item's persisted color_variant_seed; defaults to 0 for category-level (not item-level) previews. */
  colorVariantSeed?: number;
  testID?: string;
}

/**
 * A pastel pill tinted by the category's color family (docs/DESIGN_SYSTEM.md's
 * Categories section) — falls back to a neutral hairline-outline pill when no
 * `baseColor` is given.
 */
export function CategoryBadge({ label, icon, baseColor, colorVariantSeed = 0, testID }: CategoryBadgeProps) {
  const variant = baseColor ? getCategoryColorVariant(baseColor, colorVariantSeed) : null;

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor: variant ? variant.background : 'transparent',
          borderColor: variant ? 'transparent' : colors.border,
        },
      ]}
    >
      <Ionicons
        name={categoryIconName(icon)}
        size={typography.caption.fontSize}
        color={variant ? variant.accent : colors.textSecondary}
        style={styles.icon}
      />
      <Text
        style={[styles.label, { color: variant ? variant.accent : colors.textPrimary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
  },
});
