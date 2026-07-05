import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '../theme';

export interface TaskFormCategory {
  id: string;
  name: string;
}

export interface TaskFormValues {
  title: string;
  categoryId: string | null;
  date: string | null;
  timeOfDay: string | null;
  description: string | null;
}

export interface TaskFormProps {
  categories: readonly TaskFormCategory[];
  initialValues?: Partial<TaskFormValues>;
  submitLabel?: string;
  onSubmit: (values: TaskFormValues) => void;
  testID?: string;
}

/**
 * Shared create/edit form for tasks, per docs/SCREEN_SPECIFICATIONS.md and
 * docs/MVP_SCOPE.md: only `title` is required — a task is creatable with no
 * date (it lands in the Ohne Datum section, T046).
 */
export function TaskForm({
  categories,
  initialValues,
  submitLabel = 'Speichern',
  onSubmit,
  testID,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [date, setDate] = useState(initialValues?.date ?? '');
  const [timeOfDay, setTimeOfDay] = useState(initialValues?.timeOfDay ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0;

  function handleSubmit() {
    const trimmedDate = date.trim();
    const trimmedTime = timeOfDay.trim();
    const trimmedDescription = description.trim();
    onSubmit({
      title: trimmedTitle,
      categoryId,
      date: trimmedDate.length > 0 ? trimmedDate : null,
      timeOfDay: trimmedTime.length > 0 ? trimmedTime : null,
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
    });
  }

  return (
    <ScrollView testID={testID} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Titel</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Aufgabentitel"
        style={styles.input}
        testID="task-form-title-input"
      />

      <View style={styles.categoryHeader}>
        <Text style={styles.label}>Kategorie</Text>
        <Link href="/category/create" style={styles.createCategoryLink} testID="task-form-create-category-link">
          + Neue Kategorie
        </Link>
      </View>
      <View style={styles.chipRow}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: categoryId === null }}
          testID="task-form-category-none"
          onPress={() => setCategoryId(null)}
          style={[styles.chip, categoryId === null && styles.chipSelected]}
        >
          <Text style={styles.chipLabel}>Keine</Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: categoryId === category.id }}
            testID={`task-form-category-${category.id}`}
            onPress={() => setCategoryId(category.id)}
            style={[styles.chip, categoryId === category.id && styles.chipSelected]}
          >
            <Text style={styles.chipLabel}>{category.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Datum</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="JJJJ-MM-TT (optional)"
        style={styles.input}
        testID="task-form-date-input"
      />

      <Text style={styles.label}>Uhrzeit</Text>
      <TextInput
        value={timeOfDay}
        onChangeText={setTimeOfDay}
        placeholder="HH:mm (optional)"
        style={styles.input}
        testID="task-form-time-input"
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => setDescriptionExpanded((prev) => !prev)}
        testID="task-form-description-toggle"
        style={styles.descriptionToggle}
      >
        <Text style={styles.descriptionToggleLabel}>
          {descriptionExpanded ? '▾' : '▸'} Beschreibung
        </Text>
      </Pressable>

      {descriptionExpanded && (
        <View testID="task-form-description-section">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            style={[styles.input, styles.descriptionInput]}
            multiline
            testID="task-form-description-input"
          />
        </View>
      )}

      <Button label={submitLabel} onPress={handleSubmit} disabled={!canSave} testID="task-form-save" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
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
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createCategoryLink: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.accent,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
  },
  descriptionToggle: {
    paddingVertical: spacing.xs,
  },
  descriptionToggleLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    fontWeight: typography.bodySmall.fontWeight,
  },
});
