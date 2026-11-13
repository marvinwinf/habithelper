import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// A brief, gentle acknowledgement after a routine completion: the routine's
// own reward ("Belohnung", docs/DATA_MODEL.md's routine plan fields) and/or a
// streak milestone (src/domain/streaks/milestones.ts). Fade-only,
// non-bouncy, and purely informational: it never blocks, confirms, or
// measures anything.
export const REWARD_TOAST_FADE_DURATION_MS = 300;
export const REWARD_TOAST_HOLD_DURATION_MS = 2200;
// A milestone carries more to read (and matters more), so it lingers longer.
export const MILESTONE_TOAST_HOLD_DURATION_MS = 3200;

export type ToastKind = 'reward' | 'milestone';

export interface ToastContent {
  kind: ToastKind;
  /** The main line. */
  message: string;
  /** Optional second line — e.g. the reward beneath a milestone. */
  detail?: string;
}

export interface RewardToast {
  /** The toast currently shown, or null when hidden. */
  content: ToastContent | null;
  /** The main line currently shown, or null when hidden. */
  message: string | null;
  /** Drives the pill's fade (0→1→0). */
  opacity: Animated.Value;
  /** Fades in the given content, holds, then fades out. A new call replaces
   *  any in-flight toast so rapid completions don't stack. */
  showToast: (content: ToastContent) => void;
  /** Shorthand for a reward-only toast. */
  showReward: (reward: string) => void;
}

/**
 * Manages the completion toast's lifecycle so the Today screen only has to
 * call `showToast(...)` on a completion. Honors the OS reduce-motion setting
 * (instant show/hide instead of a fade), per docs/DESIGN_SYSTEM.md's Motion
 * section, and cleans up its timers on unmount.
 */
export function useRewardToast(reducedMotion: boolean): RewardToast {
  const [content, setContent] = useState<ToastContent | null>(null);
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

  const showToast = useCallback(
    (next: ToastContent) => {
      clearPending();
      setContent(next);
      const holdMs =
        next.kind === 'milestone' ? MILESTONE_TOAST_HOLD_DURATION_MS : REWARD_TOAST_HOLD_DURATION_MS;

      const fadeOut = () => {
        const out = Animated.timing(opacity, {
          toValue: 0,
          duration: reducedMotion ? 0 : REWARD_TOAST_FADE_DURATION_MS,
          useNativeDriver: true,
        });
        runningAnimation.current = out;
        out.start(({ finished }) => {
          if (finished) {
            setContent(null);
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
          hideTimer.current = setTimeout(fadeOut, holdMs);
        }
      });
    },
    [clearPending, opacity, reducedMotion],
  );

  const showReward = useCallback(
    (reward: string) => showToast({ kind: 'reward', message: reward }),
    [showToast],
  );

  useEffect(() => clearPending, [clearPending]);

  return { content, message: content?.message ?? null, opacity, showToast, showReward };
}
