import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { getCategoryColorVariant } from '../theme/categoryVariant';
import { categoryIconName } from '../categoryIcons';

export interface CategoryBadgeProps {
  label: string;
  baseColor: string;
  colorVariantSeed: number;
  /** The category's stored icon (category.icon); null/undefined renders the fallback icon. */
  icon?: string | null;
  testID?: string;
}

export function CategoryBadge({
  label,
  baseColor,
  colorVariantSeed,
  icon,
  testID,
}: CategoryBadgeProps) {
  const variant = getCategoryColorVariant(baseColor, colorVariantSeed);

  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: variant.background }]}>
      <Ionicons
        name={categoryIconName(icon)}
        size={typography.caption.fontSize}
        color={variant.accent}
        style={styles.icon}
      />
      <Text style={styles.label} numberOfLines={1}>
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
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.textPrimary,
  },
});
