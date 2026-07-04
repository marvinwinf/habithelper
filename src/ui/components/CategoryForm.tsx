import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { CategoryBadge } from './CategoryBadge';
import { colors, radius, spacing, typography, type CategoryColorFamily } from '../theme';

export interface CategoryFormValues {
  name: string;
  baseColor: string;
}

export interface CategoryFormProps {
  initialName?: string;
  initialBaseColor?: string;
  submitLabel?: string;
  onSubmit: (values: CategoryFormValues) => void;
  testID?: string;
}

const PALETTE_FAMILIES = Object.keys(colors.categories) as CategoryColorFamily[];

// The preview shows how any one item in this category would look; the
// concrete seed doesn't matter here since categories have no seed of their
// own (only individual routines/tasks do, per docs/DATA_MODEL.md).
const PREVIEW_SEED = 0;

/** Shared name/base-color/preview form used by both the create and edit category screens. */
export function CategoryForm({
  initialName = '',
  initialBaseColor = colors.categories[PALETTE_FAMILIES[0]].base,
  submitLabel = 'Speichern',
  onSubmit,
  testID,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [baseColor, setBaseColor] = useState(initialBaseColor);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Kategoriename"
        style={styles.input}
        testID="category-form-name-input"
      />

      <Text style={styles.label}>Farbe</Text>
      <View style={styles.paletteRow}>
        {PALETTE_FAMILIES.map((family) => {
          const familyBaseColor = colors.categories[family].base;
          const selected = familyBaseColor === baseColor;
          return (
            <Pressable
              key={family}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={family}
              testID={`category-form-color-${family}`}
              onPress={() => setBaseColor(familyBaseColor)}
              style={[
                styles.swatch,
                { backgroundColor: familyBaseColor },
                selected && styles.swatchSelected,
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.label}>Vorschau</Text>
      <CategoryBadge
        label={trimmedName || 'Vorschau'}
        baseColor={baseColor}
        colorVariantSeed={PREVIEW_SEED}
        testID="category-form-preview"
      />

      <Button
        label={submitLabel}
        onPress={() => onSubmit({ name: trimmedName, baseColor })}
        disabled={!canSave}
        testID="category-form-save"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.textPrimary,
  },
});
