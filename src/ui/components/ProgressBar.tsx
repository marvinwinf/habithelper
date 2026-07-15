import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, radius, spacing } from '../theme';

export interface ProgressBarProps {
  value: number;
  fillColor?: string;
  trackColor?: string;
  testID?: string;
}

// Short, visible fill animation per docs/DESIGN_SYSTEM.md's Motion section;
// duration will move to a shared token once T018's animation hooks land.
const FILL_ANIMATION_DURATION_MS = 300;

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function ProgressBar({
  value,
  fillColor = colors.accent,
  trackColor = colors.surfaceMuted,
  testID,
}: ProgressBarProps) {
  const clampedValue = clamp01(value);
  const reducedMotion = useReducedMotion();
  // Starts at 0 so the fill draws in to its value on mount — the bar arrives
  // alive rather than pre-filled — and every later value change animates the
  // same way. Reduced motion collapses both to an instant jump (the Motion
  // section's rule); accessibilityValue below always reports the target
  // value, never the animated one.
  const [widthAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: reducedMotion ? 0 : FILL_ANIMATION_DURATION_MS,
      useNativeDriver: false, // width is a layout property
    }).start();
  }, [clampedValue, widthAnim, reducedMotion]);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedValue * 100) }}
      style={[styles.track, { backgroundColor: trackColor }]}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: spacing.xs,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
