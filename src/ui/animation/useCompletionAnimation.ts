import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

export const COMPLETION_ANIMATION_DURATION_MS = 220;

export interface CompletionAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/** Short scale/fade pulse for a normal routine completion. */
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
