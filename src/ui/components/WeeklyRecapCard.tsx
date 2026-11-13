import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { weeklyRecapMessage, type WeeklyRecap } from '../../domain/progress/weeklyRecap';
import { useMountAnimation } from '../animation/useMountAnimation';
import { colors, radius, spacing, typography } from '../theme';
import { categoryPalette } from '../theme/categoryVariant';

export interface WeeklyRecapCardProps {
  recap: WeeklyRecap;
  testID?: string;
}

/**
 * Monday's look back at the week that just ended (T096). Takes the Focus of
 * the day card's slot on Mondays — same size, same gentle fade-in — so the
 * Today screen never grows an extra block (docs/DESIGN_SYSTEM.md's Weekly
 * Look-back). Warm apricot tint under the Focus card's color-freedom
 * exception; text stays on the standard tokens.
 */
export function WeeklyRecapCard({ recap, testID }: WeeklyRecapCardProps) {
  const mount = useMountAnimation();
  const completionsLabel = recap.completions === 1 ? 'Erledigung' : 'Erledigungen';
  const details = [
    `an ${recap.activeDays} von 7 Tagen`,
    recap.steadiest ? `am beständigsten: ${recap.steadiest.name} (${recap.steadiest.count}×)` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View style={[styles.card, { opacity: mount.progress }]} testID={testID}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>Deine letzte Woche</Text>
        <Text style={styles.headline} testID={testID ? `${testID}-completions` : undefined}>
          {recap.completions} {completionsLabel}
        </Text>
        <Text style={styles.details} testID={testID ? `${testID}-details` : undefined}>
          {details}
        </Text>
        <Text style={styles.message} testID={testID ? `${testID}-message` : undefined}>
          {weeklyRecapMessage(recap)}
        </Text>
      </View>
      <Ionicons
        name="sunny-outline"
        size={40}
        color={categoryPalette.apricot.dark}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: categoryPalette.apricot.lighter,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: colors.accent,
  },
  headline: {
    fontFamily: typography.title.fontFamily,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  details: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.textSecondary,
  },
  message: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
});
