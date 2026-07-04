import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

const RISE_DURATION_MS = 300;
const SETTLE_DURATION_MS = 250;

export const LEVEL_UP_ANIMATION_DURATION_MS = RISE_DURATION_MS + SETTLE_DURATION_MS;

export interface LevelUpAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/**
 * Level-up milestone animation: a two-stage rise-then-settle pulse, the
 * strongest of the three completion-related animations, distinct from
 * routine completion and streak-burst feedback.
 */
export function useLevelUpAnimation(): LevelUpAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  const start = useCallback(
    (onDone?: () => void) => {
      progress.setValue(0);
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: RISE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: SETTLE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onDone?.();
        }
      });
    },
    [progress]
  );

  return { progress, durationMs: LEVEL_UP_ANIMATION_DURATION_MS, start };
}
