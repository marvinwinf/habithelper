import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { ToastContent } from '../animation/useRewardToast';
import { colors, radius, softShadow, spacing, typography } from '../theme';

export interface RewardToastProps {
  /** What to show, or null when hidden (nothing renders). */
  content: ToastContent | null;
  /** Fade driver from useRewardToast. */
  opacity: Animated.Value;
  testID?: string;
}

/**
 * A gentle, non-interactive pill that briefly acknowledges a completion: the
 * routine's reward ("make it satisfying") and/or a streak milestone.
 * Absolutely positioned near the bottom of the screen so the routine list
 * never reflows; fade-only, per docs/DESIGN_SYSTEM.md's Motion and
 * Gamification sections. Announced politely to screen readers. Renders
 * nothing when there is no content.
 */
export function RewardToast({ content, opacity, testID }: RewardToastProps) {
  if (content === null) {
    return null;
  }

  const isMilestone = content.kind === 'milestone';

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[styles.container, isMilestone && styles.milestoneContainer, { opacity }]}
      testID={testID}
    >
      <Ionicons
        name={isMilestone ? 'sparkles-outline' : 'gift-outline'}
        size={isMilestone ? typography.heading.fontSize : typography.body.fontSize}
        color={colors.accent}
        testID={testID ? `${testID}-icon-${content.kind}` : undefined}
      />
      <View style={styles.textBlock}>
        <Text
          style={[styles.text, isMilestone && styles.milestoneText]}
          numberOfLines={2}
          testID={testID ? `${testID}-text` : undefined}
        >
          {content.message}
        </Text>
        {content.detail ? (
          <Text
            style={styles.detail}
            numberOfLines={1}
            testID={testID ? `${testID}-detail` : undefined}
          >
            {content.detail}
          </Text>
        ) : null}
      </View>
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
  // A milestone gets a little more room and a softer, card-like shape so its
  // two lines read comfortably — still the same quiet pill family.
  milestoneContainer: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  textBlock: {
    flexShrink: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  text: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  milestoneText: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.label.fontWeight,
  },
  detail: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
