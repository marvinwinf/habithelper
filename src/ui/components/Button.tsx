import {
  Pressable,
  Text,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';

import { colors, pressedOpacity, radius, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { background: string; text: string; borderColor?: string }
> = {
  primary: { background: colors.accent, text: colors.textOnAccent },
  secondary: {
    background: colors.surfaceMuted,
    text: colors.textPrimary,
    borderColor: colors.border,
  },
  destructive: { background: colors.destructive, text: colors.textOnAccent },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.background,
          borderColor: variantStyle.borderColor ?? 'transparent',
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: variantStyle.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  label: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.fontWeight,
  },
});
