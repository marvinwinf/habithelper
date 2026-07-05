import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import {
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
  listUndatedTasks,
  listUpcomingTasks,
  type Task,
} from '../../src/data/repositories/taskRepository';
import { deleteTask, moveTask, toggleTaskCompletion } from '../../src/services/taskService';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { confirmTaskDeletion } from '../../src/ui/alerts';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { CategoryBadge } from '../../src/ui/components/CategoryBadge';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Sheet } from '../../src/ui/components/Sheet';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

interface Section {
  key: string;
  title: string;
  tasks: Task[];
}

// Ascending by date (nulls last, since undated tasks only ever appear in
// their own section anyway), then by time (nulls last), per
// docs/SCREEN_SPECIFICATIONS.md's "sorting is based on date and time."
function compareByDateThenTime(a: Task, b: Task): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date.localeCompare(b.date);
  }
  if (a.timeOfDay !== b.timeOfDay) {
    if (a.timeOfDay === null) return 1;
    if (b.timeOfDay === null) return -1;
    return a.timeOfDay.localeCompare(b.timeOfDay);
  }
  return 0;
}

export default function TasksScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [dueToday, setDueToday] = useState<Task[]>([]);
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [undated, setUndated] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const today = todayDateString();
    listCategories(db).then(setCategories);
    listOverdueTasks(db, today).then((rows) => setOverdue([...rows].sort(compareByDateThenTime)));
    listTasksForToday(db, today).then((rows) => setDueToday([...rows].sort(compareByDateThenTime)));
    listUpcomingTasks(db, today).then((rows) => setUpcoming([...rows].sort(compareByDateThenTime)));
    listUndatedTasks(db).then((rows) => setUndated([...rows].sort(compareByDateThenTime)));
    listCompletedTasks(db).then((rows) =>
      setCompleted([...rows].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))),
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const sections: Section[] = [
    { key: 'overdue', title: 'Überfällig', tasks: overdue },
    { key: 'today', title: 'Heute', tasks: dueToday },
    { key: 'upcoming', title: 'Demnächst', tasks: upcoming },
    { key: 'undated', title: 'Ohne Datum', tasks: undated },
  ];
  const allTasks = [...overdue, ...dueToday, ...upcoming, ...undated, ...completed];
  const menuTask = allTasks.find((t) => t.id === menuTaskId);

  function closeMenu() {
    setMenuTaskId(null);
  }

  async function handleToggleComplete(task: Task) {
    await toggleTaskCompletion(db, task.id);
    loadData();
  }

  function handleEdit(task: Task) {
    closeMenu();
    router.push(`/task/${task.id}/edit`);
  }

  async function handleMoveToTomorrow(task: Task) {
    closeMenu();
    await moveTask(db, task.id, addDaysToDateString(todayDateString(), 1));
    loadData();
  }

  function handleDelete(task: Task) {
    closeMenu();
    confirmTaskDeletion(task.title, async () => {
      await deleteTask(db, task.id);
      loadData();
    });
  }

  function renderTask(item: Task, isOverdue: boolean) {
    const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
    return (
      <Card key={item.id} style={styles.row} testID={`task-row-${item.id}`}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.isCompleted }}
          onPress={() => handleToggleComplete(item)}
          style={[styles.toggle, item.isCompleted && styles.toggleChecked]}
          testID={`task-row-${item.id}-toggle`}
        >
          {item.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={[styles.taskTitle, item.isCompleted && styles.taskTitleDone]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            {category && (
              <CategoryBadge
                label={category.name}
                baseColor={category.baseColor}
                colorVariantSeed={item.colorVariantSeed}
              />
            )}
            {item.date && <Text style={styles.metaText}>{item.date}</Text>}
            {item.timeOfDay && <Text style={styles.metaText}>{item.timeOfDay}</Text>}
          </View>
          {/* Subtle text label, not a colored background — no visually
              aggressive warning states, and color is never the only signal
              (docs/DESIGN_SYSTEM.md's Accessibility section). */}
          {isOverdue && (
            <Text style={styles.overdueLabel} testID={`task-row-${item.id}-overdue-label`}>
              Überfällig
            </Text>
          )}
        </View>
        <Button
          label="⋯"
          variant="secondary"
          onPress={() => setMenuTaskId(item.id)}
          testID={`task-row-${item.id}-menu-button`}
        />
      </Card>
    );
  }

  const hasAnyTask = allTasks.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Aufgaben</Text>
        {/* TODO(T050): replace with the floating create button once it exists. */}
        <Link href="/task/create" style={styles.createLink} testID="tasks-create-link">
          + Neue Aufgabe
        </Link>
      </View>

      {!hasAnyTask ? (
        <EmptyState
          title="Noch keine Aufgaben"
          message="Tippe oben auf „+ Neue Aufgabe“, um loszulegen."
        />
      ) : (
        <View style={styles.list}>
          {sections
            .filter((section) => section.tasks.length > 0)
            .map((section) => (
              <View key={section.key} testID={`tasks-section-${section.key}`}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.tasks.map((task) => renderTask(task, section.key === 'overdue'))}
              </View>
            ))}

          {completed.length > 0 && (
            <View testID="tasks-section-completed">
              <Pressable
                accessibilityRole="button"
                onPress={() => setCompletedExpanded((prev) => !prev)}
                testID="tasks-completed-toggle"
                style={styles.sectionToggle}
              >
                <Text style={styles.sectionTitle}>
                  {completedExpanded ? '▾' : '▸'} Erledigt ({completed.length})
                </Text>
              </Pressable>
              {completedExpanded && completed.map((task) => renderTask(task, false))}
            </View>
          )}
        </View>
      )}

      <Sheet visible={menuTaskId !== null} onClose={closeMenu} testID="task-menu-sheet">
        {menuTask && (
          <View style={styles.menu}>
            <Button label="Bearbeiten" onPress={() => handleEdit(menuTask)} testID="task-menu-edit" />
            {!menuTask.isCompleted && (
              <Button
                label="Auf morgen verschieben"
                variant="secondary"
                onPress={() => handleMoveToTomorrow(menuTask)}
                testID="task-menu-move"
              />
            )}
            <Button
              label="Löschen"
              variant="destructive"
              onPress={() => handleDelete(menuTask)}
              testID="task-menu-delete"
            />
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  createLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  list: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectionToggle: {
    paddingVertical: spacing.xs,
  },
  row: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  rowMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  taskTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  taskTitleDone: {
    opacity: 0.5,
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
