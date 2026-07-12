import { LayoutAnimation } from 'react-native';

// Rows glide to their new positions only after a short hold, so the
// completion pop on the control is seen first and THEN the card settles into
// its new place — two readable beats instead of one muddled moment.
export const LIST_SETTLE_DELAY_MS = 220;
export const LIST_SETTLE_DURATION_MS = 280;

/**
 * Queues a gentle ease for the NEXT layout change: list rows that move (a
 * completed routine re-sorting below the pending ones, remaining rows
 * closing a gap) glide instead of jumping. Only `update` is configured —
 * newly created or removed rows keep their own fade handling
 * (useMountAnimation), and per docs/DESIGN_SYSTEM.md's Motion section the
 * whole thing is skipped under reduced motion.
 */
export function animateListSettle(reducedMotion: boolean): void {
  if (reducedMotion) {
    return;
  }
  LayoutAnimation.configureNext({
    duration: LIST_SETTLE_DELAY_MS + LIST_SETTLE_DURATION_MS,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
      delay: LIST_SETTLE_DELAY_MS,
      duration: LIST_SETTLE_DURATION_MS,
    },
  });
}
