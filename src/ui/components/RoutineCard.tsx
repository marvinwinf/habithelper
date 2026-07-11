import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { CompletionControl } from './CompletionControl';
import { IconBadge } from './IconBadge';
import { Sheet } from './Sheet';
import {
  triggerExceededCompletionHaptic,
  triggerLevelMilestoneHaptic,
  triggerRoutineCompletionHaptic,
} from '../animation/haptics';
import { useLevelUpAnimation } from '../animation/useLevelUpAnimation';
import { useMountAnimation } from '../animation/useMountAnimation';
import { colors, pressedOpacity, radius, softShadow, spacing, typography } from '../theme';
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
  onOpenDetail: () => void;
  onMoveToTomorrow: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
  testID?: string;
}

/**
 * A single routine's Today-screen row, per docs/DESIGN_SYSTEM.md's Routine
 * and Task Item Design: a light soft-paper card lightly tinted by its
 * category's color variant, a "time · schedule" subtitle, and a bold streak
 * numeral. The row itself carries only the completion control — per the
 * design system's List Row Actions rule there is no inline overflow menu;
 * tapping the row opens an actions bottom sheet (Statistik/detail plus
 * docs/ROUTINE_RULES.md's per-occurrence actions), so the list stays focused
 * on viewing and completing (T030/T065).
 */
export function RoutineCard({
  routine,
  category,
  streak,
  state,
  onComplete,
  onExceed,
  onUndo,
  onOpenDetail,
  onMoveToTomorrow,
  onSkip,
  onEdit,
  onPause,
  onDelete,
  testID,
}: RoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const levelUpAnimation = useLevelUpAnimation();
  const mountAnimation = useMountAnimation();
  const isResolved = state !== 'pending';
  const isCompletedOrExceeded = state === 'completed' || state === 'exceeded';
  const isSkipped = state === 'skipped';

  const subtitle = [routine.timeOfDay, scheduleLabel(scheduleFromRoutineRow(routine))]
    .filter(Boolean)
    .join(' · ');

  const variant = category
    ? getCategoryColorVariant(category.baseColor, routine.colorVariantSeed)
    : null;
  const solidFill = category ? getCategorySolidFill(category.baseColor) : null;

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

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
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
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
              <Text style={[styles.name, isSkipped && styles.nameSkipped]}>{routine.name}</Text>
              {subtitle.length > 0 && <Text style={styles.subtitle}>{subtitle}</Text>}
              <View style={styles.streakRow} testID={testID ? `${testID}-streak` : undefined}>
                <Text style={styles.streakLabel}>Streak </Text>
                <Text style={styles.streakValue}>{streak}</Text>
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

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID={`${testID}-menu`}>
        <View style={styles.menu}>
          {/* The list row has no inline overflow menu; this sheet is the one
              place a routine's actions live. "Statistik" opens the full
              Routine Detail (streak, level, calendar). */}
          <Button
            label="Statistik"
            onPress={() => closeMenuThen(onOpenDetail)}
            testID={`${testID}-menu-detail`}
          />
          {/* Move and skip act on today's occurrence, so they disappear once
              it is resolved — writing a second outcome event for the same
              date would leave the occurrence's state ambiguous. */}
          {!isResolved && (
            <Button
              label="Auf morgen verschieben"
              variant="secondary"
              onPress={() => closeMenuThen(onMoveToTomorrow)}
              testID={`${testID}-menu-move`}
            />
          )}
          {!isResolved && routine.allowConsciousSkip && (
            <Button
              label="Bewusst auslassen"
              variant="secondary"
              onPress={() => closeMenuThen(onSkip)}
              testID={`${testID}-menu-skip`}
            />
          )}
          <Button
            label="Bearbeiten"
            variant="secondary"
            onPress={() => closeMenuThen(onEdit)}
            testID={`${testID}-menu-edit`}
          />
          <Button
            label="Pausieren"
            variant="secondary"
            onPress={() => closeMenuThen(onPause)}
            testID={`${testID}-menu-pause`}
          />
          <Button
            label="Löschen"
            variant="destructive"
            onPress={() => closeMenuThen(onDelete)}
            testID={`${testID}-menu-delete`}
          />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: pressedOpacity,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    // Generous internal padding so the card breathes — soft paper, not a
    // tight container (docs/DESIGN_SYSTEM.md's Whitespace and Rhythm).
    padding: spacing.md,
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
    gap: spacing.xs,
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
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  streakValue: {
    fontFamily: typography.title.fontFamily,
    fontWeight: typography.title.fontWeight,
    fontSize: 20,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menu: {
    gap: spacing.sm,
  },
});
