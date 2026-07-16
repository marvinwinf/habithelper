import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { deleteTask, moveTask, setTaskCompletion } from '../../src/services/taskService';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { compareByDateThenTime } from '../../src/domain/tasks/ordering';
import { confirmTaskDeletion } from '../../src/ui/alerts';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { ScreenHeader } from '../../src/ui/components/ScreenHeader';
import { TaskCard } from '../../src/ui/components/TaskCard';
import { colors, pressedFeedback, spacing, typography } from '../../src/ui/theme';

interface Section {
  key: string;
  title: string;
  tasks: Task[];
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

  // Monotonic reload token: two overlapping reloads (e.g. from completing
  // several tasks quickly) could otherwise resolve their independent per-
  // section queries out of order and leave a task listed as both open and
  // completed. A query only applies its result while its reload is the latest.
  const loadSeq = useRef(0);

  const loadData = useCallback(() => {
    const seq = (loadSeq.current += 1);
    const guard =
      <T,>(setter: (value: T) => void) =>
      (value: T) => {
        if (seq === loadSeq.current) {
          setter(value);
        }
      };
    const today = todayDateString();
    listCategories(db).then(guard(setCategories));
    listOverdueTasks(db, today).then(guard((rows: Task[]) => setOverdue([...rows].sort(compareByDateThenTime))));
    listTasksForToday(db, today).then(guard((rows: Task[]) => setDueToday([...rows].sort(compareByDateThenTime))));
    listUpcomingTasks(db, today).then(guard((rows: Task[]) => setUpcoming([...rows].sort(compareByDateThenTime))));
    listUndatedTasks(db).then(guard((rows: Task[]) => setUndated([...rows].sort(compareByDateThenTime))));
    listCompletedTasks(db).then(
      guard((rows: Task[]) =>
        setCompleted([...rows].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))),
      ),
    );
  }, []);

  // Reload on every focus: this tab stays mounted while create/edit screens
  // are pushed over it, so a mount-only effect would never show a task
  // created via the FAB until an app restart.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const sections: Section[] = [
    { key: 'overdue', title: 'Überfällig', tasks: overdue },
    { key: 'today', title: 'Heute', tasks: dueToday },
    { key: 'upcoming', title: 'Demnächst', tasks: upcoming },
    { key: 'undated', title: 'Ohne Datum', tasks: undated },
  ];
  const allTasks = [...overdue, ...dueToday, ...upcoming, ...undated, ...completed];

  async function handleToggleComplete(task: Task) {
    // Explicit target from the rendered row (not a DB re-read), so a repeated
    // tap can't flip a just-checked task back off.
    await setTaskCompletion(db, task.id, !task.isCompleted);
    loadData();
  }

  function handleEdit(task: Task) {
    router.push(`/task/${task.id}/edit`);
  }

  async function handleMoveToTomorrow(task: Task) {
    await moveTask(db, task.id, addDaysToDateString(todayDateString(), 1));
    loadData();
  }

  function handleDelete(task: Task) {
    confirmTaskDeletion(task.title, async () => {
      await deleteTask(db, task.id);
      loadData();
    });
  }

  function renderTask(item: Task, isOverdue: boolean) {
    const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
    return (
      <TaskCard
        key={item.id}
        testID={`task-row-${item.id}`}
        task={item}
        category={category}
        isOverdue={isOverdue}
        onToggleComplete={() => handleToggleComplete(item)}
        onMoveToTomorrow={() => handleMoveToTomorrow(item)}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
      />
    );
  }

  const hasAnyTask = allTasks.length > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Aufgaben" testID="tasks-header" />

      {!hasAnyTask ? (
        <EmptyState
          title="Noch keine Aufgaben"
          message="Tippe unten rechts auf „+“, um loszulegen."
        />
      ) : (
        // Without a scroll container, task lists taller than the screen were
        // simply cut off and unreachable.
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.list}>
            {sections
              .filter((section) => section.tasks.length > 0)
              .map((section) => (
                <View key={section.key} style={styles.section} testID={`tasks-section-${section.key}`}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.tasks.map((task) => renderTask(task, section.key === 'overdue'))}
                </View>
              ))}

            {completed.length > 0 && (
              <View style={styles.section} testID="tasks-section-completed">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCompletedExpanded((prev) => !prev)}
                  testID="tasks-completed-toggle"
                  style={({ pressed }) => [styles.sectionToggle, pressed && styles.sectionTogglePressed]}
                >
                  <Text style={styles.sectionTitle}>
                    {completedExpanded ? '▾' : '▸'} Erledigt ({completed.length})
                  </Text>
                </Pressable>
                {completedExpanded && completed.map((task) => renderTask(task, false))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectionToggle: {
    paddingVertical: spacing.xs,
  },
  sectionTogglePressed: {
    ...pressedFeedback,
  },
});
