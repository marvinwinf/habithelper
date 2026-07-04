import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

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
  const [widthAnim] = useState(() => new Animated.Value(clampedValue));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: FILL_ANIMATION_DURATION_MS,
      useNativeDriver: false, // width is a layout property
    }).start();
  }, [clampedValue, widthAnim]);

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
