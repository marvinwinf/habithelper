import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { FILL_EASING } from './constants';

export const PROGRESS_FILL_ANIMATION_DURATION_MS = 400;

/**
 * An Animated.Value that eases toward `target` whenever it changes, per
 * docs/DESIGN_SYSTEM.md's Motion section (progress transitions stay within
 * the short-animation ceiling). Starts at 0 so the first render sweeps the
 * fill in rather than mounting already full — data arriving async simply
 * retargets the running animation. Reduced motion jumps straight to the
 * target instead of animating.
 *
 * Drives layout/SVG props (stroke offsets, widths), hence the JS driver.
 */
export function useAnimatedProgress(target: number, reducedMotion: boolean): Animated.Value {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(target);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: PROGRESS_FILL_ANIMATION_DURATION_MS,
      easing: FILL_EASING,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, target, reducedMotion]);

  return progress;
}
