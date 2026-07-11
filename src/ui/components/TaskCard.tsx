import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { IconBadge } from './IconBadge';
import { Sheet } from './Sheet';
import { useMountAnimation } from '../animation/useMountAnimation';
import { colors, pressedOpacity, radius, spacing, typography } from '../theme';
import { getCategoryColorVariant } from '../theme/categoryVariant';
import { categoryIconName } from '../categoryIcons';
import { todayDateString } from '../../domain/dates';

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
 * A single task's row, per docs/DESIGN_SYSTEM.md's Routine and Task Item
 * Design: a soft card lightly tinted by its category's color variant, title
 * with a short subtitle ("Heute", the date, or "Für später"), a filled-circle
 * completion toggle (which also serves as undo) on the right, and an
 * overflow menu. Shared between the Tasks screen and the Today screen's
 * Tasks/For-later sections (T049/T066).
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

  const subtitle = subtitleFor(task, forLater);
  const variant = category
    ? getCategoryColorVariant(category.baseColor, task.colorVariantSeed)
    : null;

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <>
      <Animated.View style={{ opacity: mountAnimation.progress }}>
        <View
          style={[styles.row, variant && { backgroundColor: variant.background }]}
          testID={testID}
        >
          <IconBadge
            name={categoryIconName(category?.icon)}
            backgroundColor={variant?.gradientStart}
            iconColor={variant?.accent}
          />
          <View style={styles.main}>
            <Text
              style={[styles.title, task.isCompleted && styles.titleCompleted]}
              numberOfLines={1}
            >
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
            // The glyph is a compact 28dp outline; hitSlop grows the tap area
            // to the 44dp minimum without enlarging the visual (T082).
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.toggle,
              task.isCompleted && styles.toggleCompleted,
              pressed && styles.togglePressed,
            ]}
            testID={`${testID}-toggle`}
          >
            {task.isCompleted ? (
              <Text style={[styles.checkmark, styles.checkmarkCompleted]}>✓</Text>
            ) : null}
          </Pressable>
          <Button
            label="⋯"
            variant="secondary"
            onPress={() => setMenuOpen(true)}
            testID={`${testID}-menu-button`}
          />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  titleCompleted: {
    color: colors.textSecondary,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  overdueLabel: {
    fontFamily: typography.caption.fontFamily,
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
  toggleCompleted: {
    borderColor: 'transparent',
    backgroundColor: colors.accent,
  },
  togglePressed: {
    opacity: pressedOpacity,
  },
  checkmark: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
  },
  checkmarkCompleted: {
    color: colors.textOnAccent,
  },
  menu: {
    gap: spacing.sm,
  },
});
