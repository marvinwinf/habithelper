import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

export const MOUNT_ANIMATION_DURATION_MS = 250;

export interface MountAnimation {
  progress: Animated.Value;
  durationMs: number;
}

/**
 * Soft fade-in played once when a component first mounts, per
 * docs/DESIGN_SYSTEM.md's Motion section (fade-only — no slide/scale).
 * Intended for list cards (RoutineCard/TaskCard) and the empty state so
 * items entering feel alive rather than popping in instantly — re-renders of
 * an already-mounted component do not replay it, since the effect only runs
 * once.
 */
export function useMountAnimation(): MountAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: MOUNT_ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return { progress, durationMs: MOUNT_ANIMATION_DURATION_MS };
}
