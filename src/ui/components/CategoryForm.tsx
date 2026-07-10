import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { CategoryBadge } from './CategoryBadge';
import { IconBadge } from './IconBadge';
import { colors, pressedOpacity, radius, spacing, typography, type CategoryColorFamily } from '../theme';
import { getCategoryColorVariant, legacyCategoryPalette } from '../theme/categoryVariant';
import { CATEGORY_ICON_OPTIONS } from '../categoryIcons';

export interface CategoryFormValues {
  name: string;
  baseColor: string;
  icon: string | null;
}

export interface CategoryFormProps {
  initialName?: string;
  initialBaseColor?: string;
  initialIcon?: string | null;
  submitLabel?: string;
  onSubmit: (values: CategoryFormValues) => void;
  testID?: string;
}

const PALETTE_FAMILIES = Object.keys(legacyCategoryPalette) as CategoryColorFamily[];

// The preview shows how any one item in this category would look; the
// concrete seed doesn't matter here since categories have no seed of their
// own (only individual routines/tasks do, per docs/DATA_MODEL.md).
const PREVIEW_SEED = 0;

/** Shared name/base-color/preview form used by both the create and edit category screens. */
export function CategoryForm({
  initialName = '',
  initialBaseColor = legacyCategoryPalette[PALETTE_FAMILIES[0]].base,
  initialIcon = null,
  submitLabel = 'Speichern',
  onSubmit,
  testID,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [baseColor, setBaseColor] = useState(initialBaseColor);
  const [icon, setIcon] = useState<string | null>(initialIcon);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;
  const previewVariant = getCategoryColorVariant(baseColor, PREVIEW_SEED);

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
          const familyBaseColor = legacyCategoryPalette[family].base;
          const selected = familyBaseColor === baseColor;
          return (
            <Pressable
              key={family}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={family}
              testID={`category-form-color-${family}`}
              onPress={() => setBaseColor(familyBaseColor)}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: familyBaseColor },
                selected && styles.swatchSelected,
                pressed && styles.pressed,
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.label}>Symbol</Text>
      <View style={styles.paletteRow}>
        {CATEGORY_ICON_OPTIONS.map((option) => {
          const selected = option === icon;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
              testID={`category-form-icon-${option}`}
              onPress={() => setIcon(option)}
              style={({ pressed }) => [
                styles.iconOption,
                selected && styles.iconOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <IconBadge
                name={option}
                size="sm"
                backgroundColor={selected ? previewVariant.background : colors.surfaceMuted}
                iconColor={selected ? previewVariant.accent : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Vorschau</Text>
      <CategoryBadge
        label={trimmedName || 'Vorschau'}
        baseColor={baseColor}
        colorVariantSeed={PREVIEW_SEED}
        icon={icon}
        testID="category-form-preview"
      />

      <Button
        label={submitLabel}
        onPress={() => onSubmit({ name: trimmedName, baseColor, icon })}
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
  pressed: {
    opacity: pressedOpacity,
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
  iconOption: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  iconOptionSelected: {
    borderColor: colors.accent,
  },
});
