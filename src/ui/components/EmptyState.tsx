import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useMountAnimation } from '../animation/useMountAnimation';
import { colors, spacing, typography } from '../theme';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  testID?: string;
}

/** No mascots or illustrations per docs/DESIGN_SYSTEM.md — `icon` is caller-supplied. */
export function EmptyState({ icon, title, message, testID }: EmptyStateProps) {
  const mountAnimation = useMountAnimation();

  return (
    <Animated.View testID={testID} style={[styles.container, { opacity: mountAnimation.progress }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.fontWeight,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
