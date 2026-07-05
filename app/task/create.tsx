import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createTask } from '../../src/services/taskService';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { db } from '../../src/data/db/client';
import { TaskForm, type TaskFormValues } from '../../src/ui/components/TaskForm';
import { colors, spacing } from '../../src/ui/theme';

export default function CreateTaskScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories(db).then(setCategories);
  }, []);

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
