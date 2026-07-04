import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { CompletionControl } from './CompletionControl';
import { Sheet } from './Sheet';
import { colors, spacing, typography } from '../theme';

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
  onComplete: () => void;
  onExceed: () => void;
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
  const isResolved = state !== 'pending';

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <>
      <Pressable onPress={onOpenDetail} testID={testID}>
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
            <CompletionControl
              completed={state === 'completed'}
              exceeded={state === 'exceeded'}
              disabled={isResolved}
              onComplete={onComplete}
              onExceed={onExceed}
              testID={`${testID}-complete`}
            />
            <Button
              label="⋯"
              variant="secondary"
              onPress={() => setMenuOpen(true)}
              testID={`${testID}-menu-button`}
            />
          </View>
        </Card>
      </Pressable>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID={`${testID}-menu`}>
        <View style={styles.menu}>
          <Button
            label="Auf morgen verschieben"
            onPress={() => closeMenuThen(onMoveToTomorrow)}
            testID={`${testID}-menu-move`}
          />
          {routine.allowConsciousSkip && (
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
