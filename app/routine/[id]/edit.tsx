import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  getRoutine,
  updateRoutine,
  type Routine,
} from '../../../src/data/repositories/routineRepository';
import { listCategories, type Category } from '../../../src/data/repositories/categoryRepository';
import { db } from '../../../src/data/db/client';
import { RoutineForm, type RoutineFormValues } from '../../../src/ui/components/RoutineForm';
import type { IsoWeekday } from '../../../src/domain/routines/schedule';
import { colors, spacing } from '../../../src/ui/theme';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    getRoutine(db, id).then((found) => {
      if (!cancelled) {
        setRoutine(found);
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
  }, [id]);

  async function handleSubmit(values: RoutineFormValues) {
    // colorVariantSeed and sortOrder are intentionally excluded — the seed
    // is assigned once at creation and never recalculated, and reorder is
    // owned by the Routines screen's drag-and-drop (T032), not this form.
    await updateRoutine(db, id, values);
    router.back();
  }

  if (!routine) {
    return <View style={styles.screen} testID="edit-routine-loading" />;
  }

  return (
    <View style={styles.screen}>
      <RoutineForm
        categories={categories}
        initialValues={{
          name: routine.name,
          categoryId: routine.categoryId,
          scheduleType: routine.scheduleType,
          scheduledWeekdays: (routine.scheduledWeekdays as IsoWeekday[] | null) ?? undefined,
          weeklyTargetCount: routine.weeklyTargetCount,
          timeOfDay: routine.timeOfDay,
          reason: routine.reason,
          allowConsciousSkip: routine.allowConsciousSkip,
        }}
        onSubmit={handleSubmit}
        submitLabel="Speichern"
        testID="edit-routine-form"
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
