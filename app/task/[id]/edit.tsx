import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { getTask, type Task } from '../../../src/data/repositories/taskRepository';
import { listCategories, type Category } from '../../../src/data/repositories/categoryRepository';
import { editTask } from '../../../src/services/taskService';
import { db } from '../../../src/data/db/client';
import { ScreenHeader } from '../../../src/ui/components/ScreenHeader';
import { TaskForm, type TaskFormValues } from '../../../src/ui/components/TaskForm';
import { colors, spacing } from '../../../src/ui/theme';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);

  // Focus-based (not mount-based) so a category created from a pushed
  // screen appears in the form's options on return.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTask(db, id).then((found) => {
        if (!cancelled) {
          setTask(found);
        }
      });
      listCategories(db).then((found) => {
        if (!cancelled) {
          setCategories(found);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  async function handleSubmit(values: TaskFormValues) {
    // colorVariantSeed and sortOrder are intentionally excluded — the seed
    // is assigned once at creation and never recalculated, and reorder is
    // owned by the Tasks screen (T046), not this form.
    await editTask(db, id, values);
    router.back();
  }

  if (!task) {
    return <View style={styles.screen} testID="edit-task-loading" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Aufgabe bearbeiten" testID="edit-task-header" />
      <TaskForm
        categories={categories}
        initialValues={{
          title: task.title,
          categoryId: task.categoryId,
          date: task.date,
          timeOfDay: task.timeOfDay,
          description: task.description,
        }}
        onSubmit={handleSubmit}
        submitLabel="Speichern"
        testID="edit-task-form"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
});
