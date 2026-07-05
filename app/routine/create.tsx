import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createRoutine } from '../../src/services/routineService';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { db } from '../../src/data/db/client';
import { RoutineForm, type RoutineFormValues } from '../../src/ui/components/RoutineForm';
import { colors, spacing } from '../../src/ui/theme';

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories(db).then(setCategories);
  }, []);

  async function handleSubmit(values: RoutineFormValues) {
    await createRoutine(db, {
      ...values,
      // Assigned once at creation, never recalculated (docs/DATA_MODEL.md's
      // Category Color Variants section) — not a form field.
      colorVariantSeed: Math.floor(Math.random() * 1000),
    });
    router.back();
  }

  return (
    <View style={styles.screen}>
      <RoutineForm
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Erstellen"
        testID="create-routine-form"
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
