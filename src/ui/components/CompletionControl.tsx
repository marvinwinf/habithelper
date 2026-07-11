import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';

import { useCompletionAnimation } from '../animation/useCompletionAnimation';
import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, pressedOpacity, radius, spacing, typography } from '../theme';

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
 *
 * Visually a soft circle (docs/DESIGN_SYSTEM.md's Routine and Task Item
 * Design) that fills with the accent color and a checkmark on completion,
 * with a gentle pop (`useCompletionAnimation`'s overshoot easing) rather than
 * an instant swap — skipped in favor of an instant state change under
 * reduced motion.
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
  const isDone = completed || exceeded;
  const wasDoneRef = useRef(isDone);
  const pop = useCompletionAnimation();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const wasDone = wasDoneRef.current;
    wasDoneRef.current = isDone;
    if (isDone === wasDone) {
      return;
    }
    if (!isDone) {
      pop.progress.setValue(0);
    } else if (reducedMotion) {
      pop.progress.setValue(1);
    } else {
      pop.start();
    }
  }, [isDone, reducedMotion, pop]);

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, checked: isDone }}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={({ pressed }) => [
        styles.control,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            backgroundColor: accentColor,
            opacity: pop.progress,
            transform: [
              {
                scale: pop.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      />
      {isDone ? (
        <Animated.Text
          style={[styles.checkmark, { color: colors.textOnAccent, opacity: pop.progress }]}
        >
          {exceeded ? '✓✓' : '✓'}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
  },
  checkmark: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
  },
});
