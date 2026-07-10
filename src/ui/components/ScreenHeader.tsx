import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, iconBadgeSizes, pressedOpacity, radius, spacing, typography } from '../theme';

export interface ScreenHeaderProps {
  title: string;
  /** Rendered at the trailing edge (e.g. an overflow button); a same-width spacer keeps the title centered when omitted. */
  right?: ReactNode;
  testID?: string;
}

/**
 * Stack-screen header per the design reference mockup: a circular back
 * button on the left and a centered title. Used by screens the root Stack
 * renders headerless (app/_layout.tsx sets headerShown: false).
 */
export function ScreenHeader({ title, right, testID }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zurück"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        testID={testID ? `${testID}-back` : undefined}
      >
        <Ionicons
          name="chevron-back"
          size={iconBadgeSizes.sm.icon}
          color={colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={styles.rightSpacer} />}
    </View>
  );
}

const BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: pressedOpacity,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  rightSpacer: {
    width: BUTTON_SIZE,
  },
});
