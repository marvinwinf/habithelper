import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { IconBadge } from './IconBadge';
import { Sheet } from './Sheet';
import { useMountAnimation } from '../animation/useMountAnimation';
import { colors, pressedOpacity, radius, spacing, typography } from '../theme';
import { getCategoryColorVariant } from '../theme/categoryVariant';
import { categoryIconName } from '../categoryIcons';
import { todayDateString } from '../../domain/dates';

// Mirrors RoutineCard's mount entrance distance — small enough to read as a
// soft settle rather than a slide-in.
const MOUNT_RISE_DISTANCE = 8;

export interface TaskCardTask {
  id: string;
  title: string;
  date: string | null;
  timeOfDay: string | null;
  isCompleted: boolean;
  colorVariantSeed: number;
}

export interface TaskCardCategory {
  name: string;
  baseColor: string;
  icon?: string | null;
}

export interface TaskCardProps {
  task: TaskCardTask;
  category?: TaskCardCategory;
  isOverdue: boolean;
  /** Renders the For-later treatment (bookmark + "Für später" subtitle), per the design reference. */
  forLater?: boolean;
  onToggleComplete: () => void;
  onMoveToTomorrow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}

function subtitleFor(task: TaskCardTask, forLater: boolean): string {
  const dateLabel = forLater
    ? 'Für später'
    : task.date === todayDateString()
      ? 'Heute'
      : task.date;
  return [dateLabel, task.timeOfDay].filter(Boolean).join(' · ');
}

/**
 * A single task's card, per docs/SCREEN_SPECIFICATIONS.md's Task Card and
 * the design reference mockup: rounded icon container (category icon,
 * neutral fallback), title with a short subtitle ("Heute", the date, or
 * "Für später"), completion toggle (which also serves as undo) on the
 * right, and an overflow menu. Deliberately stays on the neutral surface —
 * task cards are visually quieter than routine cards per
 * docs/DESIGN_SYSTEM.md. Shared between the Tasks screen and the Today
 * screen's Tasks/For-later sections (T049/T066).
 */
export function TaskCard({
  task,
  category,
  isOverdue,
  forLater = false,
  onToggleComplete,
  onMoveToTomorrow,
  onEdit,
  onDelete,
  testID,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mountAnimation = useMountAnimation();

  const variant = category
    ? getCategoryColorVariant(category.baseColor, task.colorVariantSeed)
    : undefined;
  const subtitle = subtitleFor(task, forLater);

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

  const mountTranslateY = mountAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MOUNT_RISE_DISTANCE, 0],
  });

  return (
    <>
      <Animated.View
        style={{
          opacity: mountAnimation.progress,
          transform: [{ translateY: mountTranslateY }],
        }}
      >
        <Card style={[styles.card, task.isCompleted && styles.cardSubdued]} testID={testID}>
          <IconBadge
            name={categoryIconName(category?.icon)}
            backgroundColor={variant?.background ?? colors.surfaceMuted}
            iconColor={variant?.accent ?? colors.textSecondary}
          />
          <View style={styles.main}>
            <Text style={styles.title} numberOfLines={1}>
              {task.title}
            </Text>
            {subtitle.length > 0 && <Text style={styles.subtitle}>{subtitle}</Text>}
            {/* Subtle text label, not a colored background — no visually
                aggressive warning states, and color is never the only signal
                (docs/DESIGN_SYSTEM.md's Accessibility section). */}
            {isOverdue && (
              <Text style={styles.overdueLabel} testID={`${testID}-overdue-label`}>
                Überfällig
              </Text>
            )}
          </View>
          {forLater && (
            <Ionicons
              name="bookmark-outline"
              size={typography.body.fontSize}
              color={colors.textSecondary}
              testID={`${testID}-bookmark`}
            />
          )}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.isCompleted }}
            onPress={onToggleComplete}
            style={({ pressed }) => [
              styles.toggle,
              task.isCompleted && styles.toggleChecked,
              pressed && styles.togglePressed,
            ]}
            testID={`${testID}-toggle`}
          >
            {task.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
          <Button
            label="⋯"
            variant="secondary"
            onPress={() => setMenuOpen(true)}
            testID={`${testID}-menu-button`}
          />
        </Card>
      </Animated.View>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID={`${testID}-menu`}>
        <View style={styles.menu}>
          <Button
            label="Bearbeiten"
            onPress={() => closeMenuThen(onEdit)}
            testID={`${testID}-menu-edit`}
          />
          {!task.isCompleted && (
            <Button
              label="Auf morgen verschieben"
              variant="secondary"
              onPress={() => closeMenuThen(onMoveToTomorrow)}
              testID={`${testID}-menu-move`}
            />
          )}
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
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardSubdued: {
    opacity: 0.5,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  overdueLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.destructive,
  },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  togglePressed: {
    opacity: pressedOpacity,
  },
  checkmark: {
    color: colors.textOnAccent,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
  },
  menu: {
    gap: spacing.sm,
  },
});
