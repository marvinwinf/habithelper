import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { colors, iconBadgeSizes, pressedOpacity, radius, spacing, typography } from '../theme';
import { categoryIconName } from '../categoryIcons';
import type { ScheduleType } from '../../data/db/schema';
import {
  generateSuggestedWeeklyTargetWeekdays,
  type IsoWeekday,
} from '../../domain/routines/schedule';

export interface RoutineFormCategory {
  id: string;
  name: string;
  icon?: string | null;
}

export interface RoutineFormValues {
  name: string;
  categoryId: string | null;
  scheduleType: ScheduleType;
  scheduledWeekdays: IsoWeekday[] | null;
  weeklyTargetCount: number | null;
  timeOfDay: string | null;
  reason: string | null;
  allowConsciousSkip: boolean;
}

export interface RoutineFormProps {
  categories: readonly RoutineFormCategory[];
  initialValues?: Partial<RoutineFormValues>;
  submitLabel?: string;
  onSubmit: (values: RoutineFormValues) => void;
  testID?: string;
}

// Labels per the design reference mockup's three frequency option cards;
// the weekly-target card's label reflects the current count ("3x pro Woche").
const FREQUENCY_OPTIONS: { type: ScheduleType; label: (targetCount: number) => string }[] = [
  { type: 'daily', label: () => 'Täglich' },
  { type: 'weekdays', label: () => 'Wochentage' },
  { type: 'weekly_target', label: (targetCount) => `${targetCount}x pro Woche` },
];

const WEEKDAY_LABELS: { day: IsoWeekday; label: string }[] = [
  { day: 1, label: 'Mo' },
  { day: 2, label: 'Di' },
  { day: 3, label: 'Mi' },
  { day: 4, label: 'Do' },
  { day: 5, label: 'Fr' },
  { day: 6, label: 'Sa' },
  { day: 7, label: 'So' },
];

const MIN_TARGET_COUNT = 1;
const MAX_TARGET_COUNT = 7;
const DEFAULT_TARGET_COUNT = 3;

/** Shared create/edit form for routines, per docs/SCREEN_SPECIFICATIONS.md's Create Routine Screen. */
export function RoutineForm({
  categories,
  initialValues,
  submitLabel = 'Speichern',
  onSubmit,
  testID,
}: RoutineFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initialValues?.scheduleType ?? 'daily',
  );
  const [scheduledWeekdays, setScheduledWeekdays] = useState<IsoWeekday[]>(
    initialValues?.scheduledWeekdays ?? [],
  );
  const [weeklyTargetCount, setWeeklyTargetCount] = useState<number>(
    initialValues?.weeklyTargetCount ?? DEFAULT_TARGET_COUNT,
  );
  const [timeOfDay, setTimeOfDay] = useState(initialValues?.timeOfDay ?? '');
  const [reason, setReason] = useState(initialValues?.reason ?? '');
  const [allowConsciousSkip, setAllowConsciousSkip] = useState(
    initialValues?.allowConsciousSkip ?? false,
  );
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  function handleSelectFrequency(type: ScheduleType) {
    setScheduleType(type);
    if (type === 'weekly_target') {
      setScheduledWeekdays(generateSuggestedWeeklyTargetWeekdays(weeklyTargetCount));
    }
  }

  function handleChangeTargetCount(count: number) {
    const clamped = Math.min(MAX_TARGET_COUNT, Math.max(MIN_TARGET_COUNT, count));
    setWeeklyTargetCount(clamped);
    setScheduledWeekdays(generateSuggestedWeeklyTargetWeekdays(clamped));
  }

  function toggleWeekday(day: IsoWeekday) {
    setScheduledWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  const trimmedName = name.trim();
  const needsWeekdaySelection = scheduleType === 'weekdays' || scheduleType === 'weekly_target';
  const scheduleValid = !needsWeekdaySelection || scheduledWeekdays.length > 0;
  const canSave = trimmedName.length > 0 && scheduleValid;

  function handleSubmit() {
    const trimmedTime = timeOfDay.trim();
    const trimmedReason = reason.trim();
    onSubmit({
      name: trimmedName,
      categoryId,
      scheduleType,
      scheduledWeekdays: needsWeekdaySelection ? scheduledWeekdays : null,
      weeklyTargetCount: scheduleType === 'weekly_target' ? weeklyTargetCount : null,
      timeOfDay: trimmedTime.length > 0 ? trimmedTime : null,
      reason: trimmedReason.length > 0 ? trimmedReason : null,
      allowConsciousSkip,
    });
  }

  return (
    <ScrollView testID={testID} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Name</Text>
      <View style={styles.inputRow}>
        <Ionicons name="book-outline" size={iconBadgeSizes.sm.icon} color={colors.textSecondary} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="z. B. Lesen"
          style={styles.inputRowField}
          testID="routine-form-name-input"
        />
      </View>

      <Text style={styles.label}>Kategorie</Text>
      <View style={styles.chipRow}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: categoryId === null }}
          testID="routine-form-category-none"
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
            testID={`routine-form-category-${category.id}`}
            onPress={() => setCategoryId(category.id)}
            style={({ pressed }) => [
              styles.chip,
              categoryId === category.id && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={categoryIconName(category.icon)}
              size={typography.bodySmall.fontSize}
              color={colors.textSecondary}
            />
            <Text style={styles.chipLabel}>{category.name}</Text>
          </Pressable>
        ))}
      </View>
      <Link
        href="/category/create"
        style={styles.createCategoryButton}
        testID="routine-form-create-category-link"
      >
        + Neue Kategorie erstellen
      </Link>

      <Text style={styles.label}>Häufigkeit</Text>
      <View style={styles.frequencyRow}>
        {FREQUENCY_OPTIONS.map((option) => {
          const selected = scheduleType === option.type;
          return (
            <Pressable
              key={option.type}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              testID={`routine-form-schedule-${option.type}`}
              onPress={() => handleSelectFrequency(option.type)}
              style={({ pressed }) => [
                styles.frequencyCard,
                selected && styles.frequencyCardSelected,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={iconBadgeSizes.sm.icon}
                color={selected ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.frequencyLabel, selected && styles.frequencyLabelSelected]}>
                {option.label(weeklyTargetCount)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {scheduleType === 'weekly_target' && (
        <View testID="routine-form-target-count-row" style={styles.targetCountRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Weniger"
            testID="routine-form-target-count-decrease"
            onPress={() => handleChangeTargetCount(weeklyTargetCount - 1)}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel}>−</Text>
          </Pressable>
          <Text style={styles.targetCountValue} testID="routine-form-target-count-value">
            {`${weeklyTargetCount}x pro Woche`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mehr"
            testID="routine-form-target-count-increase"
            onPress={() => handleChangeTargetCount(weeklyTargetCount + 1)}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel}>+</Text>
          </Pressable>
        </View>
      )}

      {needsWeekdaySelection && (
        <View style={styles.weekdayCard} testID="routine-form-weekdays">
          <Text style={styles.weekdayCardTitle}>Wochentage auswählen</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map(({ day, label }) => {
              const selected = scheduledWeekdays.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                  testID={`routine-form-weekday-${day}`}
                  onPress={() => toggleWeekday(day)}
                  style={({ pressed }) => [styles.weekdayToggle, pressed && styles.pressed]}
                >
                  <Text style={styles.weekdayToggleLabel}>{label}</Text>
                  <View
                    style={[styles.weekdayCircle, selected && styles.weekdayCircleSelected]}
                  >
                    <Ionicons
                      name={selected ? 'checkmark' : 'remove'}
                      size={typography.bodySmall.fontSize}
                      color={selected ? colors.textOnAccent : colors.textSecondary}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Text style={styles.label}>Uhrzeit</Text>
      <View style={styles.inputRow}>
        <Ionicons name="time-outline" size={iconBadgeSizes.sm.icon} color={colors.textSecondary} />
        <TextInput
          value={timeOfDay}
          onChangeText={setTimeOfDay}
          placeholder="HH:mm (optional)"
          style={styles.inputRowField}
          testID="routine-form-time-input"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setAdvancedExpanded((prev) => !prev)}
        testID="routine-form-advanced-toggle"
        style={({ pressed }) => [styles.advancedToggle, pressed && styles.pressed]}
      >
        <Text style={styles.advancedToggleLabel}>Weitere Einstellungen</Text>
        <Ionicons
          name={advancedExpanded ? 'chevron-up' : 'chevron-down'}
          size={typography.body.fontSize}
          color={colors.textSecondary}
        />
      </Pressable>

      {advancedExpanded && (
        <View testID="routine-form-advanced-section" style={styles.advancedSection}>
          <Text style={styles.label}>Persönlicher Grund</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Optional"
            style={styles.input}
            testID="routine-form-reason-input"
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Bewusstes Auslassen erlauben</Text>
            <Switch
              value={allowConsciousSkip}
              onValueChange={setAllowConsciousSkip}
              testID="routine-form-allow-skip-switch"
            />
          </View>
        </View>
      )}

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        disabled={!canSave}
        testID="routine-form-save"
      />
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
  // Icon-leading input per the mockup's name/time fields.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  inputRowField: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  // Dashed outline per the mockup's "+ Neue Kategorie erstellen" button;
  // lavender text distinguishes it from the primary save action.
  createCategoryButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.categories.lavender.base,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: typography.bodySmall.fontSize,
    color: colors.categories.lavender.dark,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.categories.mint.lighter,
    borderColor: colors.accent,
  },
  chipLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
  },
  // Three side-by-side option cards per the mockup's Häufigkeit section.
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  frequencyCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
  },
  frequencyCardSelected: {
    borderColor: colors.accent,
  },
  frequencyLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  frequencyLabelSelected: {
    color: colors.accent,
  },
  targetCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  targetCountValue: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  // Circular Mo–So toggles inside a sub-card, per the mockup's
  // "Wochentage auswählen" section.
  weekdayCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  weekdayCardTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayToggle: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  weekdayToggleLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  weekdayCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCircleSelected: {
    backgroundColor: colors.accent,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  advancedToggleLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
    fontWeight: typography.bodySmall.fontWeight,
  },
  advancedSection: {
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
