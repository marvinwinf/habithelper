import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors, radius, softShadow, spacing, typography } from '../theme';

export interface RewardToastProps {
  /** The reward text to show, or null when hidden (nothing renders). */
  message: string | null;
  /** Fade driver from useRewardToast. */
  opacity: Animated.Value;
  testID?: string;
}

/**
 * A gentle, non-interactive pill that briefly acknowledges a routine's
 * reward on completion ("make it satisfying"). Absolutely positioned near
 * the bottom of the screen so the routine list never reflows; fade-only,
 * per docs/DESIGN_SYSTEM.md's Motion and Gamification sections. Renders
 * nothing when there is no message.
 */
export function RewardToast({ message, opacity, testID }: RewardToastProps) {
  if (message === null) {
    return null;
  }

  return (
    <Animated.View
      accessibilityRole="text"
      pointerEvents="none"
      style={[styles.container, { opacity }]}
      testID={testID}
    >
      <Ionicons name="gift-outline" size={typography.body.fontSize} color={colors.accent} />
      <Text style={styles.text} numberOfLines={2} testID={testID ? `${testID}-text` : undefined}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  text: {
    flexShrink: 1,
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
