import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

export const MOUNT_ANIMATION_DURATION_MS = 240;

export interface MountAnimation {
  progress: Animated.Value;
  durationMs: number;
}

/**
 * Soft fade/rise entrance played once when a component first mounts, per
 * docs/DESIGN_SYSTEM.md's Motion section ("soft card fade or scale"). Intended
 * for list cards (RoutineCard/TaskCard) so items entering the list feel
 * alive rather than popping in instantly — re-renders of an already-mounted
 * card do not replay it, since the effect only runs once.
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
