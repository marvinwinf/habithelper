import { Ionicons } from '@expo/vector-icons';

import { growthStageForStreak } from '../../domain/streaks/growthStage';
import { colors, typography } from '../theme';

export interface StreakGrowthIconProps {
  streak: number;
  size?: number;
  testID?: string;
}

/**
 * The small plant beside a routine's streak count (T097): seed → sprout →
 * leaf → bud → bloom → rose as the streak grows (src/domain/streaks/
 * growthStage.ts). Decorative — the adjacent "Streak N" text carries the
 * information, and callers put the stage name in that text's
 * accessibilityLabel so color/shape is never the only signal.
 */
export function StreakGrowthIcon({
  streak,
  size = typography.caption.fontSize + 2,
  testID,
}: StreakGrowthIconProps) {
  const { icon, stage } = growthStageForStreak(streak);
  return (
    <Ionicons
      name={icon}
      size={size}
      color={colors.accent}
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID={testID ? `${testID}-${stage}` : undefined}
    />
  );
}

/** "Streak 8, Blatt" — the spoken form of a streak with its growth stage. */
export function streakAccessibilityLabel(streak: number): string {
  return `Streak ${streak}, ${growthStageForStreak(streak).label}`;
}
