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

// Per docs/DESIGN_SYSTEM.md's Buttons and Interaction section: solid
// charcoal-on-stone primary, an underlined (not filled/ghost) secondary, and
// a rose outline for destructive — gold is reserved for meaning-carrying
// elements (primary action feedback, streak, completion), never a button fill.
const VARIANT_STYLES: Record<
  ButtonVariant,
  { background: string; text: string; borderColor: string; underline?: boolean }
> = {
  primary: {
    background: colors.textPrimary,
    text: colors.textOnAccent,
    borderColor: 'transparent',
  },
  secondary: {
    background: 'transparent',
    text: colors.textPrimary,
    borderColor: 'transparent',
    underline: true,
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
      <Text
        style={[
          styles.label,
          { color: variantStyle.text },
          variantStyle.underline && styles.labelUnderline,
        ]}
      >
        {label}
      </Text>
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
    // small-caps label (docs/DESIGN_SYSTEM.md's Accessibility section, T082);
    // padding alone left the caption-sized label at ~40dp.
    minHeight: 44,
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
    ...typography.label,
  },
  labelUnderline: {
    textDecorationLine: 'underline',
  },
});
