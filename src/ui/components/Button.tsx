import {
  Pressable,
  Text,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';

import { colors, pressedFeedback, radius, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
}

// Per docs/DESIGN_SYSTEM.md's Buttons and Interaction section: a solid
// accent-filled primary (Soft Momentum uses the sage accent generously,
// unlike Quiet Atelier's "precious, rarely-used" rule), a soft neutral-filled
// secondary, and a terracotta outline for destructive.
const VARIANT_STYLES: Record<
  ButtonVariant,
  { background: string; text: string; borderColor: string }
> = {
  primary: {
    background: colors.accent,
    text: colors.textOnAccent,
    borderColor: 'transparent',
  },
  secondary: {
    background: colors.surfaceMuted,
    text: colors.textPrimary,
    borderColor: 'transparent',
  },
  destructive: {
    background: 'transparent',
    text: colors.destructive,
    borderColor: colors.destructive,
  },
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
          borderColor: variantStyle.borderColor,
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
    // Keeps every button a >=44dp touch target regardless of its short
    // label (docs/DESIGN_SYSTEM.md's Accessibility section, T082); padding
    // alone left the caption-sized label at ~40dp.
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    ...pressedFeedback,
  },
  label: {
    ...typography.label,
  },
});
