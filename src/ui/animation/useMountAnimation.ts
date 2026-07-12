import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

export const MOUNT_ANIMATION_DURATION_MS = 250;

// Cap on the per-item stagger so long lists never keep the user waiting —
// items beyond the cap fade in together with the last staggered one.
export const MOUNT_STAGGER_STEP_MS = 30;
export const MOUNT_STAGGER_MAX_STEPS = 5;

/** Staggered mount delay for the item at `index` in a list (capped). */
export function mountStaggerDelayMs(index: number): number {
  return Math.min(index, MOUNT_STAGGER_MAX_STEPS) * MOUNT_STAGGER_STEP_MS;
}

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
 *
 * `delayMs` staggers list items (see mountStaggerDelayMs) so a screen builds
 * up gently instead of switching on all at once.
 */
export function useMountAnimation(delayMs = 0): MountAnimation {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: MOUNT_ANIMATION_DURATION_MS,
      delay: delayMs,
      useNativeDriver: true,
    }).start();
    // delayMs is read once for the single mount play-through; a changed
    // index (e.g. after a reorder) must not replay the fade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return { progress, durationMs: MOUNT_ANIMATION_DURATION_MS };
}
