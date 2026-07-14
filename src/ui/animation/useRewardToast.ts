import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// A brief, gentle acknowledgement shown when a routine that has a reward set
// ("Belohnung", docs/DATA_MODEL.md's routine plan fields) is completed — the
// "make it satisfying" close of the habit loop. Fade-only, non-bouncy, and
// purely informational: it never blocks, confirms, or measures anything.
export const REWARD_TOAST_FADE_DURATION_MS = 300;
export const REWARD_TOAST_HOLD_DURATION_MS = 2200;

export interface RewardToast {
  /** The reward text currently shown, or null when the toast is hidden. */
  message: string | null;
  /** Drives the pill's fade (0→1→0). */
  opacity: Animated.Value;
  /** Fades in the given reward, holds, then fades out. A new call replaces
   *  any in-flight toast so rapid completions don't stack. */
  showReward: (reward: string) => void;
}

/**
 * Manages the reward toast's lifecycle so the Today screen only has to call
 * `showReward(reward)` on a completion. Honors the OS reduce-motion setting
 * (instant show/hide instead of a fade), per docs/DESIGN_SYSTEM.md's Motion
 * section, and cleans up its timers on unmount.
 */
export function useRewardToast(reducedMotion: boolean): RewardToast {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const clearPending = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    runningAnimation.current?.stop();
    runningAnimation.current = null;
  }, []);

  const showReward = useCallback(
    (reward: string) => {
      clearPending();
      setMessage(reward);

      const fadeOut = () => {
        const out = Animated.timing(opacity, {
          toValue: 0,
          duration: reducedMotion ? 0 : REWARD_TOAST_FADE_DURATION_MS,
          useNativeDriver: true,
        });
        runningAnimation.current = out;
        out.start(({ finished }) => {
          if (finished) {
            setMessage(null);
          }
        });
      };

      const fadeIn = Animated.timing(opacity, {
        toValue: 1,
        duration: reducedMotion ? 0 : REWARD_TOAST_FADE_DURATION_MS,
        useNativeDriver: true,
      });
      runningAnimation.current = fadeIn;
      fadeIn.start(({ finished }) => {
        if (finished) {
          hideTimer.current = setTimeout(fadeOut, REWARD_TOAST_HOLD_DURATION_MS);
        }
      });
    },
    [clearPending, opacity, reducedMotion],
  );

  useEffect(() => clearPending, [clearPending]);

  return { message, opacity, showReward };
}
