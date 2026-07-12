import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  getCategory,
  updateCategory,
  type Category,
} from '../../../src/data/repositories/categoryRepository';
import { db } from '../../../src/data/db/client';
import { CategoryForm, type CategoryFormValues } from '../../../src/ui/components/CategoryForm';
import { ScreenHeader } from '../../../src/ui/components/ScreenHeader';
import { colors, spacing } from '../../../src/ui/theme';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<Category | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCategory(db, id).then((found) => {
      if (!cancelled) {
        setCategory(found);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(values: CategoryFormValues) {
    await updateCategory(db, id, values);
    router.back();
  }

  if (!category) {
    return <View style={styles.screen} testID="edit-category-loading" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Kategorie bearbeiten" testID="edit-category-header" />
      <CategoryForm
        initialName={category.name}
        initialBaseColor={category.baseColor}
        initialIcon={category.icon}
        onSubmit={handleSubmit}
        submitLabel="Speichern"
        testID="edit-category-form"
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
