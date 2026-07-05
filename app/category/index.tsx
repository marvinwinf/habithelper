import { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { CategoryHasReferencesError, deleteCategory } from '../../src/services/categoryService';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { CategoryBadge } from '../../src/ui/components/CategoryBadge';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { colors, spacing, typography } from '../../src/ui/theme';

// Categories have no color_variant_seed of their own (only routines/tasks
// do, per docs/DATA_MODEL.md); this list just needs *a* representative
// preview per row.
const PREVIEW_SEED = 0;

export default function CategoryListScreen() {
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(() => {
    listCategories(db).then(setCategories);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function handleDelete(target: Category) {
    Alert.alert('Kategorie löschen?', `„${target.name}“ wird endgültig gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(db, target.id);
            loadCategories();
          } catch (error) {
            if (error instanceof CategoryHasReferencesError) {
              Alert.alert(
                'Kategorie in Verwendung',
                'Diese Kategorie wird noch von Routinen oder Aufgaben verwendet und kann derzeit nicht gelöscht werden.',
              );
              return;
            }
            throw error;
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Kategorien</Text>
        <Link href="/category/create" style={styles.createLink} testID="category-list-create-link">
          + Neue Kategorie
        </Link>
      </View>

      {categories.length === 0 ? (
        <EmptyState
          title="Noch keine Kategorien"
          message="Erstelle deine erste Kategorie, um Routinen und Aufgaben zu ordnen."
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} testID={`category-row-${item.id}`}>
              <CategoryBadge
                label={item.name}
                baseColor={item.baseColor}
                colorVariantSeed={PREVIEW_SEED}
                icon={item.icon}
              />
              <View style={styles.rowActions}>
                <Link
                  href={`/category/${item.id}/edit`}
                  style={styles.editLink}
                  testID={`category-edit-link-${item.id}`}
                >
                  Bearbeiten
                </Link>
                <Button
                  label="Löschen"
                  variant="destructive"
                  onPress={() => handleDelete(item)}
                  testID={`category-delete-button-${item.id}`}
                />
              </View>
            </Card>
          )}
        />
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
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
});
