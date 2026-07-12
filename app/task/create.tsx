import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createTask } from '../../src/services/taskService';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { db } from '../../src/data/db/client';
import { ScreenHeader } from '../../src/ui/components/ScreenHeader';
import { TaskForm, type TaskFormValues } from '../../src/ui/components/TaskForm';
import { colors, spacing } from '../../src/ui/theme';

export default function CreateTaskScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  // Focus-based (not mount-based) so a category created from a pushed
  // screen appears in the form's options on return.
  useFocusEffect(
    useCallback(() => {
      listCategories(db).then(setCategories);
    }, []),
  );

  async function handleSubmit(values: TaskFormValues) {
    await createTask(db, {
      ...values,
      // Assigned once at creation, never recalculated (docs/DATA_MODEL.md's
      // Category Color Variants section) — not a form field.
      colorVariantSeed: Math.floor(Math.random() * 1000),
    });
    router.back();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Neue Aufgabe" testID="create-task-header" />
      <TaskForm
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Erstellen"
        testID="create-task-form"
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
