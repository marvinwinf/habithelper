import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CompletionControl } from './CompletionControl';
import { IconBadge } from './IconBadge';
import {
  triggerExceededCompletionHaptic,
  triggerLevelMilestoneHaptic,
  triggerRoutineCompletionHaptic,
} from '../animation/haptics';
import { useLevelUpAnimation } from '../animation/useLevelUpAnimation';
import { useMountAnimation } from '../animation/useMountAnimation';
import {
  colors,
  listCardMinHeight,
  pressedFeedback,
  radius,
  softShadow,
  spacing,
  typography,
} from '../theme';
import { getCategoryColorVariant, getCategorySolidFill } from '../theme/categoryVariant';
import { categoryIconName } from '../categoryIcons';
import { scheduleFromRoutineRow } from '../../domain/routines/schedule';
import { scheduleLabel } from '../../domain/routines/scheduleLabel';
import type { ScheduleType } from '../../data/db/schema';

// The level-up milestone briefly dims the whole row (an opacity dip, not a
// scale/bounce, per docs/DESIGN_SYSTEM.md's fade-only Motion section) so it
// reads as visually distinct from a normal/exceeded completion (T042), which
// only shows via CompletionControl's own gold underline draw-in.
const LEVEL_UP_FADE_OPACITY = 0.4;

export type RoutineCardOccurrenceState = 'pending' | 'completed' | 'exceeded' | 'skipped';

export interface RoutineCardRoutine {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  scheduledWeekdays: readonly number[] | null;
  weeklyTargetCount: number | null;
  timeOfDay: string | null;
  allowConsciousSkip: boolean;
  colorVariantSeed: number;
}

export interface RoutineCardCategory {
  name: string;
  baseColor: string;
  icon?: string | null;
}

export interface RoutineCardProps {
  routine: RoutineCardRoutine;
  category?: RoutineCardCategory;
  /** The routine's real current streak from routine_state_cache (T065). */
  streak: number;
  state: RoutineCardOccurrenceState;
  // Resolving to `true` signals this completion crossed a 66-completion
  // level boundary (T042's leveledUp signal, docs/ROUTINE_RULES.md's
  // Levels section) — triggers the milestone animation exactly once, on
  // that specific completion.
  onComplete: () => void | Promise<boolean>;
  onExceed: () => void | Promise<boolean>;
  // Undoes a misclicked completed/exceeded occurrence back to pending,
  // correctly reverting the routine's streak/level/joker state and (if this
  // was the day's sole completion) the overall app streak.
  onUndo: () => void | Promise<void>;
  /**
   * Tapping the card body requests the screen-level actions sheet for this
   * routine. The card deliberately does NOT own the sheet itself: a per-row
   * Sheet renders a native Modal inside the row, and on Android removing the
   * row (deleting the routine) tears that Modal down mid-lifecycle, which can
   * leave a transparent, touch-swallowing window over the whole app. The
   * screen owns a single Sheet instead (same pattern as the Routines screen,
   * which never exhibited the bug).
   */
  onOpenMenu: () => void;
  /** Staggered mount-fade delay for list rendering (see mountStaggerDelayMs). */
  mountDelayMs?: number;
  testID?: string;
}

/**
 * A single routine's Today-screen row, per docs/DESIGN_SYSTEM.md's Routine
 * and Task Item Design: a light soft-paper card lightly tinted by its
 * category's color variant, with one compact meta line carrying the
 * "time · schedule" subtitle and the streak. The row itself carries only the
 * completion control — per the
 * design system's List Row Actions rule there is no inline overflow menu;
 * tapping the row opens the screen's actions bottom sheet
 * (Statistik/detail plus docs/ROUTINE_RULES.md's per-occurrence actions),
 * so the list stays focused on viewing and completing (T030/T065).
 */
export function RoutineCard({
  routine,
  category,
  streak,
  state,
  onComplete,
  onExceed,
  onUndo,
  onOpenMenu,
  mountDelayMs = 0,
  testID,
}: RoutineCardProps) {
  const levelUpAnimation = useLevelUpAnimation();
  const mountAnimation = useMountAnimation(mountDelayMs);
  const isCompletedOrExceeded = state === 'completed' || state === 'exceeded';
  const isSkipped = state === 'skipped';

  const subtitle = [routine.timeOfDay, scheduleLabel(scheduleFromRoutineRow(routine))]
    .filter(Boolean)
    .join(' · ');

  const variant = category
    ? getCategoryColorVariant(category.baseColor, routine.colorVariantSeed)
    : null;
  const solidFill = category ? getCategorySolidFill(category.baseColor) : null;

  function maybeStartLevelUpMilestone(leveledUp: void | boolean) {
    if (leveledUp) {
      levelUpAnimation.start();
      triggerLevelMilestoneHaptic();
    }
  }

  async function handleComplete() {
    // Tapping an already-completed/exceeded control undoes it instead of
    // firing a redundant completion — the misclick-recovery path.
    if (isCompletedOrExceeded) {
      await onUndo();
      return;
    }
    triggerRoutineCompletionHaptic();
    maybeStartLevelUpMilestone(await onComplete());
  }

  async function handleExceed() {
    if (isCompletedOrExceeded) {
      await onUndo();
      return;
    }
    triggerExceededCompletionHaptic();
    maybeStartLevelUpMilestone(await onExceed());
  }

  // Mount fades the row in (0→1); a level-up milestone briefly dips it (1→0.4
  // and back). Multiplied so both drive the single opacity with no transform.
  const levelUpDip = levelUpAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, LEVEL_UP_FADE_OPACITY],
  });
  const rowOpacity = Animated.multiply(mountAnimation.progress, levelUpDip);

  return (
    <Pressable
      onPress={onOpenMenu}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Animated.View style={{ opacity: rowOpacity }}>
        <View style={[styles.row, variant && { backgroundColor: variant.background }]}>
          <IconBadge
            name={categoryIconName(category?.icon)}
            backgroundColor={solidFill?.background}
            iconColor={solidFill?.iconColor}
          />
          <View style={styles.main}>
            <Text style={[styles.name, isSkipped && styles.nameSkipped]} numberOfLines={1}>
              {routine.name}
            </Text>
            {/* One compact meta line — subtitle and streak share it so every
                card stays two lines tall and all list cards line up at the
                shared minimum height. */}
            <View style={styles.metaRow}>
              {subtitle.length > 0 && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={typography.caption.fontSize} color={colors.accent} />
                <Text style={styles.streakLabel} testID={testID ? `${testID}-streak` : undefined}>
                  Streak {streak}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <CompletionControl
              completed={state === 'completed'}
              exceeded={state === 'exceeded'}
              // Only a conscious skip stays locked — a completed/exceeded
              // control remains tappable so a misclick can be undone.
              disabled={isSkipped}
              onComplete={handleComplete}
              onExceed={handleExceed}
              testID={`${testID}-complete`}
            />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    ...pressedFeedback,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    // Breathing room horizontally, compact vertically: every list card sits
    // at the same shared minimum height so routines and tasks line up as one
    // calm, even rhythm (docs/DESIGN_SYSTEM.md's Whitespace and Rhythm). The
    // vertical padding is kept tight so more cards fit on the Today screen.
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: listCardMinHeight,
    borderRadius: radius.lg,
    // Soft hairline + subtle shadow instead of a full 1px stroke: the card
    // lifts by tone and shadow, not by a hard border.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  nameSkipped: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    flexShrink: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  streakLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.label.fontWeight,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
