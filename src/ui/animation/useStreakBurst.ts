import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

export const STREAK_BURST_ANIMATION_DURATION_MS = 400;

export interface StreakBurstAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/** First-completion-of-day streak highlight: a quick pop, stronger than a normal completion. */
export function useStreakBurst(): StreakBurstAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  const start = useCallback(
    (onDone?: () => void) => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: STREAK_BURST_ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDone?.();
        }
      });
    },
    [progress]
  );

  return { progress, durationMs: STREAK_BURST_ANIMATION_DURATION_MS, start };
}
