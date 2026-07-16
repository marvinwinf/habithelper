import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, iconBadgeSizes, pressedFeedback, spacing, typography } from '../theme';

export type NavRowIconName = keyof typeof Ionicons.glyphMap;

export interface NavRowProps {
  label: string;
  href: Href;
  /** Optional leading Ionicons glyph. */
  icon?: NavRowIconName;
  testID?: string;
}

/**
 * A full-width tappable navigation row with a trailing chevron — the app's
 * one affordance for "this leads somewhere" (Settings' category management,
 * the Plan screen's manage links). Replaces bare accent-colored text links,
 * whose small touch targets and low affordance read as body text
 * (docs/DESIGN_SYSTEM.md's Buttons and Interaction section).
 */
export function NavRow({ label, href, icon, testID }: NavRowProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={testID}
      >
        {icon && (
          <Ionicons name={icon} size={iconBadgeSizes.sm.icon} color={colors.textSecondary} />
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={iconBadgeSizes.sm.icon}
          color={colors.textSecondary}
        />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // Full-height touch target (T082) without any card chrome of its own,
    // so the row can sit inside an existing Card section or stand alone.
    minHeight: 44,
  },
  pressed: {
    ...pressedFeedback,
  },
  label: {
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
});
