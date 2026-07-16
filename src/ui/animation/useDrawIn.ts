import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { FILL_EASING } from './constants';

export const DRAW_IN_ANIMATION_DURATION_MS = 400;

/**
 * A 0→1 draw-in progress that replays from the start whenever `key` changes —
 * the "content draws itself in" moment for chart-like surfaces (the donut's
 * segment sweep, the area chart's reveal, the calendar's month fade). Callers
 * derive `key` from the rendered data so a reload with identical values does
 * not replay, while genuinely new content does.
 *
 * Reduced motion snaps to 1 (fully drawn) instead of animating, per
 * docs/DESIGN_SYSTEM.md's Motion section. Uses the JS driver so the value can
 * drive layout/SVG props as well as opacity.
 */
export function useDrawIn(
  key: string,
  reducedMotion: boolean,
  durationMs: number = DRAW_IN_ANIMATION_DURATION_MS,
): Animated.Value {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: FILL_EASING,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, key, reducedMotion, durationMs]);

  return progress;
}
