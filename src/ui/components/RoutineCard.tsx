import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { CompletionControl } from './CompletionControl';
import { Sheet } from './Sheet';
import {
  triggerExceededCompletionHaptic,
  triggerLevelMilestoneHaptic,
  triggerRoutineCompletionHaptic,
} from '../animation/haptics';
import { useCompletionAnimation } from '../animation/useCompletionAnimation';
import { useLevelUpAnimation } from '../animation/useLevelUpAnimation';
import { colors, spacing, typography } from '../theme';

// Same short pulse for both, scaled to a visibly bigger peak for exceeded —
// "exceeded completion receives a stronger animation" (docs/ROUTINE_RULES.md)
// — rather than a second animation hook, since the two only ever differ in
// magnitude, not timing or shape.
const NORMAL_SCALE_PEAK = 1.12;
const EXCEEDED_SCALE_PEAK = 1.35;
// The level-up milestone scales the whole card, not just the completion
// control, so it reads as visually distinct from a normal/exceeded pulse
// (T042) rather than just a bigger version of the same effect.
const LEVEL_UP_CARD_SCALE_PEAK = 1.05;

export type RoutineCardOccurrenceState = 'pending' | 'completed' | 'exceeded' | 'skipped';

export interface RoutineCardRoutine {
  id: string;
  name: string;
  timeOfDay: string | null;
  allowConsciousSkip: boolean;
  colorVariantSeed: number;
}

export interface RoutineCardCategory {
  name: string;
  baseColor: string;
}

export interface RoutineCardProps {
  routine: RoutineCardRoutine;
  category?: RoutineCardCategory;
  /** Placeholder until T037/T039 wire the real routine_state_cache streak. */
  streak: number;
  state: RoutineCardOccurrenceState;
  // Resolving to `true` signals this completion crossed a 66-completion
  // level boundary (T042's leveledUp signal, docs/ROUTINE_RULES.md's
  // Levels section) — triggers the milestone animation exactly once, on
  // that specific completion.
  onComplete: () => void | Promise<boolean>;
  onExceed: () => void | Promise<boolean>;
  onOpenDetail: () => void;
  onMoveToTomorrow: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
  testID?: string;
}

/**
 * A single routine's Today-screen card, per docs/SCREEN_SPECIFICATIONS.md's
 * Routine Card: completion controls, tap-to-open-detail, and an overflow
 * menu wired to docs/ROUTINE_RULES.md's per-occurrence actions (T030).
 */
export function RoutineCard({
  routine,
  category,
  streak,
  state,
  onComplete,
  onExceed,
  onOpenDetail,
  onMoveToTomorrow,
  onSkip,
  onEdit,
  onPause,
  onDelete,
  testID,
}: RoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastAction, setLastAction] = useState<'complete' | 'exceed' | null>(null);
  const completionAnimation = useCompletionAnimation();
  const levelUpAnimation = useLevelUpAnimation();
  const isResolved = state !== 'pending';

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
    setLastAction('complete');
    completionAnimation.start();
    triggerRoutineCompletionHaptic();
    maybeStartLevelUpMilestone(await onComplete());
  }

  async function handleExceed() {
    setLastAction('exceed');
    completionAnimation.start();
    triggerExceededCompletionHaptic();
    maybeStartLevelUpMilestone(await onExceed());
  }

  const completionScale = completionAnimation.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, lastAction === 'exceed' ? EXCEEDED_SCALE_PEAK : NORMAL_SCALE_PEAK, 1],
  });

  const cardScale = levelUpAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, LEVEL_UP_CARD_SCALE_PEAK],
  });

  return (
    <>
      <Pressable onPress={onOpenDetail} testID={testID}>
        <Animated.View style={{ transform: [{ scale: cardScale }] }}>
          <Card style={[styles.card, isResolved && styles.cardSubdued]}>
            <View style={styles.main}>
              <Text style={styles.name}>{routine.name}</Text>
              <View style={styles.metaRow}>
                {category && (
                  <CategoryBadge
                    label={category.name}
                    baseColor={category.baseColor}
                    colorVariantSeed={routine.colorVariantSeed}
                  />
                )}
                {routine.timeOfDay && <Text style={styles.time}>{routine.timeOfDay}</Text>}
              </View>
              {/* TODO(T037/T039): replace with the real streak from routine_state_cache once wired. */}
              <Text style={styles.streak}>Streak: {streak}</Text>
            </View>
            <View style={styles.actions}>
              <Animated.View style={{ transform: [{ scale: completionScale }] }}>
                <CompletionControl
                  completed={state === 'completed'}
                  exceeded={state === 'exceeded'}
                  disabled={isResolved}
                  onComplete={handleComplete}
                  onExceed={handleExceed}
                  testID={`${testID}-complete`}
                />
              </Animated.View>
              <Button
                label="⋯"
                variant="secondary"
                onPress={() => setMenuOpen(true)}
                testID={`${testID}-menu-button`}
              />
            </View>
          </Card>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardSubdued: {
    opacity: 0.5,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  time: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  streak: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
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
