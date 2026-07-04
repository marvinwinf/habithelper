import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { getCategoryColorVariant } from '../theme/categoryVariant';

export interface CategoryBadgeProps {
  label: string;
  baseColor: string;
  colorVariantSeed: number;
  testID?: string;
}

export function CategoryBadge({
  label,
  baseColor,
  colorVariantSeed,
  testID,
}: CategoryBadgeProps) {
  const variant = getCategoryColorVariant(baseColor, colorVariantSeed);

  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: variant.background }]}>
      <View style={[styles.dot, { backgroundColor: variant.accent }]} />
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
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  dot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.xxs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.textPrimary,
  },
});
