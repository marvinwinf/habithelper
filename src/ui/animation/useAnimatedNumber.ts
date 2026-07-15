import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { MAX_SHORT_ANIMATION_DURATION_MS } from './constants';

export const NUMBER_COUNT_ANIMATION_DURATION_MS = MAX_SHORT_ANIMATION_DURATION_MS;

/**
 * Rolls a displayed integer toward its target instead of snapping — the
 * Today header's Gesamt-Streak counts up when the cache loads and ticks over
 * when the streak advances (docs/DESIGN_SYSTEM.md's Streak and Progress
 * Visualization). Counts through intermediate integers via an Animated
 * listener, so it stays a plain number for the Text it feeds. Reduced motion
 * collapses to an instant swap, per the Motion section.
 */
export function useAnimatedNumber(target: number, reducedMotion: boolean): number {
  const [displayValue, setDisplayValue] = useState(target);
  const [animatedValue] = useState(() => new Animated.Value(target));

  useEffect(() => {
    if (reducedMotion) {
      // No roll under reduced motion (the hook returns `target` directly
      // below); just keep the backing value in sync so a later toggle back
      // resumes from the right spot.
      animatedValue.stopAnimation();
      animatedValue.setValue(target);
      return;
    }
    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });
    const animation = Animated.timing(animatedValue, {
      toValue: target,
      duration: NUMBER_COUNT_ANIMATION_DURATION_MS,
      // The listener feeds a Text's children (not a style prop), which only
      // the JS driver can do.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        // Guarantees convergence even when the roll is a no-op (from == to),
        // where the listener may never fire.
        setDisplayValue(target);
      }
    });
    return () => {
      animation.stop();
      animatedValue.removeListener(listenerId);
    };
  }, [target, reducedMotion, animatedValue]);

  return reducedMotion ? target : displayValue;
}
