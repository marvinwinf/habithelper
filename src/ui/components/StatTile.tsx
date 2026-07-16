import { StyleSheet, Text, View } from 'react-native';

import { useCountUpText } from '../animation/useCountUp';
import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, radius, spacing, typography } from '../theme';

export interface StatTileProps {
  value: string;
  label: string;
  testID?: string;
}

/**
 * A single stat card in the Progress screen's 2×2 overview grid. The number
 * counts up to its value (useCountUpText) so the stat feels earned rather
 * than printed; reduced motion shows the final value immediately.
 */
export function StatTile({ value, label, testID }: StatTileProps) {
  const reducedMotion = useReducedMotion();
  const displayValue = useCountUpText(value, reducedMotion);

  return (
    <View style={styles.tile} testID={testID}>
      <Text style={styles.value}>{displayValue}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  value: {
    fontFamily: typography.title.fontFamily,
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  label: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
});
