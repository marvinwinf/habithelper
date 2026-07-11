import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

import { POP_EASING } from './constants';

export const COMPLETION_ANIMATION_DURATION_MS = 280;

export interface CompletionAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/**
 * Drives the completion "pop" (docs/DESIGN_SYSTEM.md's signature
 * interaction): a 0→1 timing eased with a gentle overshoot (`POP_EASING`),
 * which `CompletionControl` maps to a scale/opacity pop on its fill.
 */
export function useCompletionAnimation(): CompletionAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  const start = useCallback(
    (onDone?: () => void) => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: COMPLETION_ANIMATION_DURATION_MS,
        easing: POP_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDone?.();
        }
      });
    },
    [progress]
  );

  return { progress, durationMs: COMPLETION_ANIMATION_DURATION_MS, start };
}
