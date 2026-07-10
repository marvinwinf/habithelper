import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { categoryIconName } from '../categoryIcons';

export interface CategoryBadgeProps {
  label: string;
  /** The category's stored icon (category.icon); null/undefined renders the fallback icon. */
  icon?: string | null;
  testID?: string;
}

/**
 * Categories are told apart by name and glyph, never by hue (Quiet Atelier,
 * docs/DESIGN_SYSTEM.md) — this always renders in the neutral/hairline
 * style, regardless of the category's stored base_color.
 */
export function CategoryBadge({ label, icon, testID }: CategoryBadgeProps) {
  return (
    <View testID={testID} style={styles.badge}>
      <Ionicons
        name={categoryIconName(icon)}
        size={typography.caption.fontSize}
        color={colors.textSecondary}
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
    borderWidth: 1,
    borderColor: colors.border,
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
