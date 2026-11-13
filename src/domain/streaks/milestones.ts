// Streak milestones: the gentle "you're building something" moments a
// routine's streak passes on its way up (docs/DESIGN_SYSTEM.md's Gamification
// section — "gentle milestone text" is in scope; points, confetti and
// loss-framed copy are not). Research on habit apps consistently finds that
// celebrating distinct milestones (7, 30, 100…) delights, while a celebration
// on *every* check-in wears out — so only these thresholds speak up.

/** Ascending streak lengths that earn an acknowledgement. */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365];

/**
 * The milestone a completion just reached, or null. Fires only when the
 * streak moves from below a threshold to at-or-above it, so a repeated tap
 * (unchanged streak) or a streak that merely continues past a milestone
 * never re-announces it. If one jump crosses several thresholds (only
 * possible via a recalculation), the highest is reported.
 */
export function reachedStreakMilestone(previousStreak: number, currentStreak: number): number | null {
  if (currentStreak <= previousStreak) {
    return null;
  }
  let reached: number | null = null;
  for (const milestone of STREAK_MILESTONES) {
    if (previousStreak < milestone && currentStreak >= milestone) {
      reached = milestone;
    }
  }
  return reached;
}

/**
 * Supportive, never pressuring copy for a reached milestone. It names what
 * the user did, not what they could lose — no "don't break it" framing.
 */
export function streakMilestoneMessage(milestone: number, routineName: string): string {
  if (milestone >= 365) {
    return `Ein ganzes Jahr ${routineName}. Das bist jetzt einfach du.`;
  }
  if (milestone === 66) {
    return `${milestone}× ${routineName} in Folge — das wird zur Gewohnheit.`;
  }
  if (milestone >= 100) {
    return `${milestone}× ${routineName} in Folge. Beeindruckend beständig.`;
  }
  if (milestone >= 21) {
    return `${milestone}× ${routineName} in Folge — das trägt schon.`;
  }
  if (milestone >= 7) {
    return `${milestone}× ${routineName} in Folge. Schön drangeblieben!`;
  }
  return `${milestone}× ${routineName} in Folge — ein guter Anfang.`;
}
