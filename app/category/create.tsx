import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createCategory } from '../../src/data/repositories/categoryRepository';
import { db } from '../../src/data/db/client';
import { CategoryForm, type CategoryFormValues } from '../../src/ui/components/CategoryForm';
import { colors, spacing } from '../../src/ui/theme';

export default function CreateCategoryScreen() {
  const router = useRouter();

  async function handleSubmit(values: CategoryFormValues) {
    await createCategory(db, values);
    router.back();
  }

  return (
    <View style={styles.screen}>
      <CategoryForm onSubmit={handleSubmit} submitLabel="Erstellen" testID="create-category-form" />
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
