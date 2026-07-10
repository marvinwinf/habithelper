import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';

import { Card } from './Card';
import { colors, spacing, typography } from '../theme';

export interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value: string;
  testID?: string;
}

/** One tile of the routine detail's stat row (Streak / Rekord / Wiederholungen), per the design reference mockup (T069). */
export function StatTile({
  icon,
  iconColor = colors.textSecondary,
  label,
  value,
  testID,
}: StatTileProps) {
  return (
    <Card style={styles.tile} testID={testID}>
      <Ionicons name={icon} size={typography.body.fontSize} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  value: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
});
