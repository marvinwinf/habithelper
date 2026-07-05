import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { Sheet } from './Sheet';
import { colors, radius, spacing, typography } from '../theme';

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
  onToggleComplete: () => void;
  onMoveToTomorrow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}

/**
 * A single task's card, per docs/SCREEN_SPECIFICATIONS.md's Task Card: a
 * completion control (which also serves as undo), date/time, category, an
 * overdue label that is text-only (never the sole status signal, per
 * docs/DESIGN_SYSTEM.md), and an overflow menu. Shared between the Tasks
 * screen and the Today screen's Tasks/For-later sections (T049).
 */
export function TaskCard({
  task,
  category,
  isOverdue,
  onToggleComplete,
  onMoveToTomorrow,
  onEdit,
  onDelete,
  testID,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <>
      <Card style={[styles.card, task.isCompleted && styles.cardSubdued]} testID={testID}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          onPress={onToggleComplete}
          style={[styles.toggle, task.isCompleted && styles.toggleChecked]}
          testID={`${testID}-toggle`}
        >
          {task.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {category && (
              <CategoryBadge
                label={category.name}
                baseColor={category.baseColor}
                colorVariantSeed={task.colorVariantSeed}
                icon={category.icon}
              />
            )}
            {task.date && <Text style={styles.metaText}>{task.date}</Text>}
            {task.timeOfDay && <Text style={styles.metaText}>{task.timeOfDay}</Text>}
          </View>
          {isOverdue && (
            <Text style={styles.overdueLabel} testID={`${testID}-overdue-label`}>
              Überfällig
            </Text>
          )}
        </View>
        <Button
          label="⋯"
          variant="secondary"
          onPress={() => setMenuOpen(true)}
          testID={`${testID}-menu-button`}
        />
      </Card>

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
  checkmark: {
    color: colors.textOnAccent,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  overdueLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.destructive,
  },
  menu: {
    gap: spacing.sm,
  },
});
