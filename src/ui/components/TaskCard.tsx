import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { CardSheen } from './CardSheen';
import { CompletionControl } from './CompletionControl';
import { IconBadge } from './IconBadge';
import { Sheet } from './Sheet';
import { useMountAnimation } from '../animation/useMountAnimation';
import {
  colors,
  listCardMinHeight,
  pressedOpacity,
  radius,
  softShadow,
  spacing,
  typography,
} from '../theme';
import { getCategoryColorVariant, getCategorySolidFill } from '../theme/categoryVariant';
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
  /** Staggered mount-fade delay for list rendering (see mountStaggerDelayMs). */
  mountDelayMs?: number;
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
 * Design: a light soft-paper card lightly tinted by its category's color
 * variant, title with a short subtitle ("Heute", the date, or "Für später"),
 * and the same soft-circle completion control routines use (which also
 * serves as undo) on the right. Per the design system's List Row Actions
 * rule the row has no inline overflow menu; tapping the card opens an
 * actions bottom sheet (edit, move, delete). Shared between the Tasks screen
 * and the Today screen's Tasks/For-later sections (T049/T066).
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
  mountDelayMs = 0,
  testID,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mountAnimation = useMountAnimation(mountDelayMs);

  const subtitle = subtitleFor(task, forLater);
  const variant = category
    ? getCategoryColorVariant(category.baseColor, task.colorVariantSeed)
    : null;
  const solidFill = category ? getCategorySolidFill(category.baseColor) : null;

  function closeMenuThen(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <>
      <Animated.View style={{ opacity: mountAnimation.progress }}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            variant && { backgroundColor: variant.background },
            pressed && styles.rowPressed,
          ]}
          testID={testID}
        >
          {/* Soft light-gradient over the category tint so the card reads as
              gently lit paper rather than a flat color block. */}
          {variant && <CardSheen testID={testID ? `${testID}-sheen` : undefined} />}
          <IconBadge
            name={categoryIconName(category?.icon)}
            backgroundColor={solidFill?.background}
            iconColor={solidFill?.iconColor}
          />
          <View style={styles.main}>
            <Text
              style={[styles.title, task.isCompleted && styles.titleCompleted]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {/* One compact meta line — subtitle and (if present) the overdue
                marker share it so every card stays two lines tall and lines
                up with the routine cards at the shared minimum height. The
                overdue marker stays a subtle text label, never a colored
                background, and color is never the only signal
                (docs/DESIGN_SYSTEM.md's Accessibility section). */}
            {(subtitle.length > 0 || isOverdue) && (
              <View style={styles.metaRow}>
                {subtitle.length > 0 && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
                {isOverdue && (
                  <Text style={styles.overdueLabel} testID={`${testID}-overdue-label`}>
                    Überfällig
                  </Text>
                )}
              </View>
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
          {/* Same soft-circle control as routines — one completion language
              across the whole list, including the gentle fill pop. Tasks have
              no exceeded state, so a long press toggles just like a tap. */}
          <CompletionControl
            completed={task.isCompleted}
            onComplete={onToggleComplete}
            onExceed={onToggleComplete}
            accessibilityRole="checkbox"
            testID={`${testID}-toggle`}
          />
        </Pressable>
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
    // Breathing room horizontally, compact vertically: matches RoutineCard
    // so routines and tasks line up as one calm, even rhythm
    // (docs/DESIGN_SYSTEM.md's Whitespace and Rhythm).
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: listCardMinHeight,
    borderRadius: radius.lg,
    // Soft hairline + subtle shadow rather than a full 1px stroke.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...softShadow,
  },
  rowPressed: {
    opacity: pressedOpacity,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
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
  overdueLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.destructive,
  },
  menu: {
    gap: spacing.sm,
  },
});
