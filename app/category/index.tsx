import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { CategoryHasReferencesError, deleteCategory } from '../../src/services/categoryService';
import { categoryIconName } from '../../src/ui/categoryIcons';
import { Button } from '../../src/ui/components/Button';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { IconBadge } from '../../src/ui/components/IconBadge';
import { ScreenHeader } from '../../src/ui/components/ScreenHeader';
import { Sheet } from '../../src/ui/components/Sheet';
import {
  colors,
  iconBadgeSizes,
  listCardMinHeight,
  pressedFeedback,
  radius,
  softShadow,
  spacing,
  typography,
} from '../../src/ui/theme';
import { getCategoryColorVariant, getCategorySolidFill } from '../../src/ui/theme/categoryVariant';

/**
 * Category management, restyled to match the routine/task list language
 * (docs/DESIGN_SYSTEM.md's List Row Actions): each category is a tinted
 * soft-paper row — solid icon badge, name, chevron — with no inline actions;
 * tapping the row opens a bottom sheet carrying Bearbeiten/Löschen.
 */
export default function CategoryListScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  // Navigation chosen in the sheet, deferred until its exit animation has
  // finished (Sheet's onDismissed) so the two transitions don't race.
  const pendingActionRef = useRef<(() => void) | null>(null);

  const menuCategory = categories.find((c) => c.id === menuCategoryId);

  const loadCategories = useCallback(() => {
    listCategories(db).then(setCategories);
  }, []);

  // Reload on every focus: create/edit screens are pushed over this list,
  // so a mount-only effect would keep showing the stale list on return.
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  function handleEdit(target: Category) {
    pendingActionRef.current = () => router.push(`/category/${target.id}/edit`);
    setMenuCategoryId(null);
  }

  function handleSheetDismissed() {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }

  function handleDelete(target: Category) {
    // The confirmation dialog opens right away (over the closing sheet) —
    // only navigation waits for the sheet's dismissal.
    setMenuCategoryId(null);
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
      <ScreenHeader title="Kategorien" testID="category-list-header" />

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
          renderItem={({ item }) => {
            const variant = getCategoryColorVariant(item.baseColor, 0);
            const solidFill = getCategorySolidFill(item.baseColor);
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuCategoryId(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: variant.background },
                  pressed && styles.rowPressed,
                ]}
                testID={`category-row-${item.id}`}
              >
                <IconBadge
                  name={categoryIconName(item.icon)}
                  backgroundColor={solidFill.background}
                  iconColor={solidFill.iconColor}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={iconBadgeSizes.sm.icon}
                  color={colors.textSecondary}
                />
              </Pressable>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Neue Kategorie"
          onPress={() => router.push('/category/create')}
          testID="category-list-create-button"
        />
      </View>

      <Sheet
        visible={menuCategoryId !== null}
        onClose={() => setMenuCategoryId(null)}
        onDismissed={handleSheetDismissed}
        testID="category-menu-sheet"
      >
        {menuCategory && (
          <View style={styles.menu}>
            <Button
              label="Bearbeiten"
              onPress={() => handleEdit(menuCategory)}
              testID={`category-edit-button-${menuCategory.id}`}
            />
            <Button
              label="Löschen"
              variant="destructive"
              onPress={() => handleDelete(menuCategory)}
              testID={`category-delete-button-${menuCategory.id}`}
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
  list: {
    gap: spacing.sm,
  },
  // Same soft-paper row language as routine/task cards: tinted background,
  // hairline border, shared minimum height.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: listCardMinHeight,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...softShadow,
  },
  rowPressed: {
    ...pressedFeedback,
  },
  name: {
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
  footer: {
    paddingTop: spacing.md,
  },
  menu: {
    gap: spacing.sm,
  },
});
