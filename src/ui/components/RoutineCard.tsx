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
import { colors, pressedOpacity, spacing, typography } from '../theme';
import { categoryIconName } from '../categoryIcons';
import { scheduleFromRoutineRow } from '../../domain/routines/schedule';
import { scheduleLabel } from '../../domain/routines/scheduleLabel';
import type { ScheduleType } from '../../data/db/schema';

// The level-up milestone scales the whole row so it reads as visually
// distinct from a normal/exceeded completion (T042), which now only shows
// via CompletionControl's own gold underline draw-in (no per-tap scale).
const LEVEL_UP_ROW_SCALE_PEAK = 1.05;
// How far the row rises into place during its mount animation — small
// enough to read as a soft settle, not a slide-in.
const MOUNT_RISE_DISTANCE = 8;

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
 * and Task Item Design: a single-surface hairline-divided row (no card, no
 * category tint), a "time · schedule" subtitle, a serif streak numeral, and
 * an overflow menu wired to docs/ROUTINE_RULES.md's per-occurrence actions
 * (T030/T065).
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

  const rowScale = levelUpAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, LEVEL_UP_ROW_SCALE_PEAK],
  });

  const mountTranslateY = mountAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MOUNT_RISE_DISTANCE, 0],
  });

  return (
    <>
      <Pressable
        onPress={onOpenDetail}
        testID={testID}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Animated.View
          style={{
            opacity: mountAnimation.progress,
            transform: [{ scale: rowScale }, { translateY: mountTranslateY }],
          }}
        >
          <View style={styles.row}>
            <IconBadge name={categoryIconName(category?.icon)} />
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
              <Button
                label="⋯"
                variant="secondary"
                onPress={() => setMenuOpen(true)}
                testID={`${testID}-menu-button`}
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID={`${testID}-menu`}>
        <View style={styles.menu}>
          {/* Move and skip act on today's occurrence, so they disappear once
              it is resolved — writing a second outcome event for the same
              date would leave the occurrence's state ambiguous. */}
          {!isResolved && (
            <Button
              label="Auf morgen verschieben"
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
