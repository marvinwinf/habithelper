import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

export const COMPLETION_ANIMATION_DURATION_MS = 250;

export interface CompletionAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/**
 * Drives the gold underline draw-in on completion (docs/DESIGN_SYSTEM.md's
 * signature interaction): a plain 0→1 ease fade, no scale/bounce/spring.
 */
export function useCompletionAnimation(): CompletionAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  const start = useCallback(
    (onDone?: () => void) => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: COMPLETION_ANIMATION_DURATION_MS,
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
