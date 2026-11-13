// Growing streak glyph (T097): instead of the same flame for every streak, a
// routine's streak is pictured as a plant that grows in stages as the streak
// passes the milestones in milestones.ts — progress you can see at a glance,
// without points or badges (docs/DESIGN_SYSTEM.md's Gamification). A reset
// streak simply shows a seed again: a neutral fresh start, never a wilted or
// dead plant.

export type GrowthStage = 'seed' | 'sprout' | 'leaf' | 'bud' | 'bloom' | 'rose';

export interface GrowthStageInfo {
  stage: GrowthStage;
  /** Ionicons glyph for the stage. */
  icon: 'ellipse-outline' | 'leaf-outline' | 'leaf' | 'flower-outline' | 'flower' | 'rose';
  /** Spoken stage name for screen readers. */
  label: string;
}

// Lower bounds, ascending; thresholds line up with STREAK_MILESTONES so the
// plant visibly changes on the same completions that earn a milestone line.
const STAGES: readonly (GrowthStageInfo & { from: number })[] = [
  { from: 0, stage: 'seed', icon: 'ellipse-outline', label: 'Samen' },
  { from: 1, stage: 'sprout', icon: 'leaf-outline', label: 'Keimling' },
  { from: 7, stage: 'leaf', icon: 'leaf', label: 'Blatt' },
  { from: 21, stage: 'bud', icon: 'flower-outline', label: 'Knospe' },
  { from: 66, stage: 'bloom', icon: 'flower', label: 'Blüte' },
  { from: 100, stage: 'rose', icon: 'rose', label: 'Rose' },
];

/** The growth stage pictured for a given current streak. */
export function growthStageForStreak(streak: number): GrowthStageInfo {
  let current = STAGES[0];
  for (const candidate of STAGES) {
    if (streak >= candidate.from) {
      current = candidate;
    }
  }
  const { stage, icon, label } = current;
  return { stage, icon, label };
}
