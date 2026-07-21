import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CompletionControl } from './CompletionControl';
import { IconBadge } from './IconBadge';
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
  /**
   * Tapping the card body requests the screen-level actions sheet for this
   * task. The card deliberately does NOT own the sheet itself: a per-row
   * Sheet renders a native Modal inside the row, and on Android removing the
   * row (deleting the task, moving it to another day) tears that Modal down
   * mid-lifecycle, which can leave a transparent, touch-swallowing window
   * over the whole app. The screen owns a single Sheet instead (same pattern
   * as the Routines screen, which never exhibited the bug).
   */
  onOpenMenu: () => void;
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
 * rule the row has no inline overflow menu; tapping the card opens the
 * screen's actions bottom sheet (edit, move, delete). Shared between the
 * Tasks screen and the Today screen's Tasks/For-later sections (T049/T066).
 */
export function TaskCard({
  task,
  category,
  isOverdue,
  forLater = false,
  onToggleComplete,
  onOpenMenu,
  mountDelayMs = 0,
  testID,
}: TaskCardProps) {
  const mountAnimation = useMountAnimation(mountDelayMs);

  const subtitle = subtitleFor(task, forLater);
  const variant = category
    ? getCategoryColorVariant(category.baseColor, task.colorVariantSeed)
    : null;
  const solidFill = category ? getCategorySolidFill(category.baseColor) : null;

  return (
    <Animated.View style={{ opacity: mountAnimation.progress }}>
      <Pressable
        onPress={onOpenMenu}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          variant && { backgroundColor: variant.background },
          pressed && styles.rowPressed,
        ]}
        testID={testID}
      >
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
    paddingVertical: spacing.xs,
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
    ...pressedFeedback,
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
});
