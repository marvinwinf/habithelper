import { useCallback, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export interface CompletionControlProps {
  onComplete: (event: GestureResponderEvent) => void;
  onExceed: (event: GestureResponderEvent) => void;
  completed?: boolean;
  exceeded?: boolean;
  disabled?: boolean;
  /** Category accent tinting the control (T065): pending border and done fill. Defaults to the app accent. */
  accentColor?: string;
  longPressThresholdMs?: number;
  testID?: string;
}

// Platform-standard long-press duration; not a design token (it's an
// interaction timing constant, not a visual style value).
const DEFAULT_LONG_PRESS_THRESHOLD_MS = 500;

/**
 * Tap-to-complete / long-press-to-exceed control. A short tap fires
 * `onComplete`; holding past `longPressThresholdMs` fires `onExceed` instead
 * — the two are mutually exclusive for a single press by construction: the
 * pending timer is what decides which callback fires, and `onPressOut`
 * always cancels it first.
 */
export function CompletionControl({
  onComplete,
  onExceed,
  completed = false,
  exceeded = false,
  disabled = false,
  accentColor = colors.accent,
  longPressThresholdMs = DEFAULT_LONG_PRESS_THRESHOLD_MS,
  testID,
}: CompletionControlProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) {
        return;
      }
      longPressFiredRef.current = false;
      clearPendingTimeout();
      timeoutRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onExceed(event);
      }, longPressThresholdMs);
    },
    [clearPendingTimeout, disabled, longPressThresholdMs, onExceed]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) {
        return;
      }
      const wasLongPress = longPressFiredRef.current;
      clearPendingTimeout();
      longPressFiredRef.current = false;
      if (!wasLongPress) {
        onComplete(event);
      }
    },
    [clearPendingTimeout, disabled, onComplete]
  );

  const isDone = completed || exceeded;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, checked: isDone }}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={[
        styles.control,
        {
          backgroundColor: isDone ? accentColor : colors.surfaceMuted,
          borderColor: isDone ? 'transparent' : accentColor,
        },
        disabled && styles.disabled,
      ]}
    >
      {isDone ? (
        <Text style={styles.checkmark}>{exceeded ? '✓✓' : '✓'}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  checkmark: {
    color: colors.textOnAccent,
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
  },
});
