import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

export const MILESTONE_PULSE_DURATION_MS = 360;

// How far a milestone pulse swells at its midpoint — barely past rest, so the
// acknowledgement reads as a gentle breath, never a bounce
// (docs/DESIGN_SYSTEM.md's Motion and Gamification sections).
export const MILESTONE_PULSE_SCALE = 1.04;

export interface MilestonePulseAnimation {
  /** 0→1 over one pulse; map with `pulseScale` for the swell-and-settle. */
  progress: Animated.Value;
  durationMs: number;
  start: (onDone?: () => void) => void;
}

/**
 * Maps a pulse's 0→1 progress to a scale that swells to
 * MILESTONE_PULSE_SCALE at the midpoint and settles back to rest.
 */
export function pulseScale(progress: Animated.Value): Animated.AnimatedInterpolation<number> {
  return progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, MILESTONE_PULSE_SCALE, 1],
  });
}

/**
 * One gentle swell-and-settle for quiet milestone moments (the Today progress
 * block when the day's last routine is completed). Follows useStreakBurst's
 * 0→1 progress shape; under reduced motion `start` is a no-op (the moment is
 * already acknowledged textually) and only reports completion.
 */
export function useMilestonePulse(reducedMotion: boolean): MilestonePulseAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  const start = useCallback(
    (onDone?: () => void) => {
      if (reducedMotion) {
        onDone?.();
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: MILESTONE_PULSE_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDone?.();
        }
      });
    },
    [progress, reducedMotion],
  );

  return { progress, durationMs: MILESTONE_PULSE_DURATION_MS, start };
}
