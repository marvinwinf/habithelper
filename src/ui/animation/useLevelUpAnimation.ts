import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

import { POP_EASING } from './constants';

const RISE_DURATION_MS = 200;
const SETTLE_DURATION_MS = 175;

export const LEVEL_UP_ANIMATION_DURATION_MS = RISE_DURATION_MS + SETTLE_DURATION_MS;

export interface LevelUpAnimation {
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/**
 * Level-up milestone animation: a two-stage 0→1→0 pulse — a gentle
 * overshoot rise (`POP_EASING`) then a plain settle back down — that
 * consumers map to a brief scale/opacity pulse (docs/DESIGN_SYSTEM.md's
 * Gamification section: a gentle acknowledgement, never a loss-framed or
 * flashy celebration), within the short-animation bound.
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
          easing: POP_EASING,
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
