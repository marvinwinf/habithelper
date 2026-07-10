import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { Button } from './Button';
import { toLocalDateString } from '../../domain/dates';
import { colors, pressedOpacity, radius, spacing, typography } from '../theme';

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Parses a `YYYY-MM-DD` string into a local Date, for handing to the native date picker. */
function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function openDatePicker(currentValue: string, onPicked: (value: string) => void) {
  DateTimePickerAndroid.open({
    value: currentValue.length > 0 ? parseDateString(currentValue) : new Date(),
    mode: 'date',
    onValueChange: (_event, selectedDate) => onPicked(toLocalDateString(selectedDate)),
  });
}

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
          style={({ pressed }) => [
            styles.chip,
            categoryId === null && styles.chipSelected,
            pressed && styles.pressed,
          ]}
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
            style={({ pressed }) => [
              styles.chip,
              categoryId === category.id && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chipLabel}>{category.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Datum</Text>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => openDatePicker(date, setDate)}
          testID="task-form-date-input"
          style={({ pressed }) => [styles.input, styles.dateField, pressed && styles.pressed]}
        >
          <Ionicons name="calendar-outline" size={typography.body.fontSize} color={colors.textSecondary} />
          <Text style={date.length > 0 ? styles.dateValue : styles.datePlaceholder}>
            {date.length > 0 ? DATE_DISPLAY_FORMATTER.format(parseDateString(date)) : 'Datum wählen (optional)'}
          </Text>
        </Pressable>
        {date.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Datum entfernen"
            onPress={() => setDate('')}
            testID="task-form-date-clear"
            style={({ pressed }) => [styles.dateClear, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={typography.body.fontSize} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

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
        style={({ pressed }) => [styles.descriptionToggle, pressed && styles.pressed]}
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
  pressed: {
    opacity: pressedOpacity,
  },
  label: {
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
    color: colors.textSecondary,
  },
  // Underlined, not boxed — per docs/DESIGN_SYSTEM.md's Buttons and
  // Interaction direction applied to inputs generally.
  input: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateValue: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  dateClear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createCategoryLink: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.accent,
    textDecorationLine: 'underline',
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
  },
  chipSelected: {
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
