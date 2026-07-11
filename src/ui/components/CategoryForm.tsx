import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { CategoryBadge } from './CategoryBadge';
import { IconBadge } from './IconBadge';
import { colors, pressedOpacity, radius, spacing, typography, type CategoryColorFamily } from '../theme';
import { categoryPalette } from '../theme/categoryVariant';
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

const PALETTE_FAMILIES = Object.keys(categoryPalette) as CategoryColorFamily[];

// New categories default to the first palette family; docs/DESIGN_SYSTEM.md's
// Categories section lets the user pick a different family below.
const DEFAULT_BASE_COLOR = categoryPalette[PALETTE_FAMILIES[0]].base;

/** Shared name/color/icon form used by both the create and edit category screens. */
export function CategoryForm({
  initialName = '',
  initialBaseColor = DEFAULT_BASE_COLOR,
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
          const familyBaseColor = categoryPalette[family].base;
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
                styles.colorSwatch,
                { backgroundColor: familyBaseColor },
                selected && styles.colorSwatchSelected,
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
                iconColor={selected ? colors.accent : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Vorschau</Text>
      <CategoryBadge
        label={trimmedName || 'Vorschau'}
        icon={icon}
        baseColor={baseColor}
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
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.textPrimary,
  },
  iconOption: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.sm,
  },
  iconOptionSelected: {
    borderColor: colors.accent,
  },
});
