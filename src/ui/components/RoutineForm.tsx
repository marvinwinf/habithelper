import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { colors, iconBadgeSizes, pressedFeedback, radius, spacing, typography } from '../theme';
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
  // Optional "Atomic Habits" planning aids ("Routine leichter machen"), free
  // text only, no effect on streak/progress/completion — see docs/DATA_MODEL.md.
  // `reason` is the identity prompt ("Wer willst du werden?"); it reuses the
  // column that has existed since 0000_init.
  reason: string | null;
  cue: string | null;
  pairing: string | null;
  miniVersion: string | null;
  /** The routine this one is stacked on ("Nach X"), or null. */
  pairingRoutineId: string | null;
  reward: string | null;
  allowConsciousSkip: boolean;
}

/** A routine this one can be stacked on — the current routine is excluded. */
export interface RoutineFormStackOption {
  id: string;
  name: string;
}

export interface RoutineFormProps {
  categories: readonly RoutineFormCategory[];
  /** Candidates for the habit-stacking picker. Omit to hide the picker. */
  stackableRoutines?: readonly RoutineFormStackOption[];
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

// Free-text planning notes, not essays — a generous cap that protects the
// "Dein Plan" card layout on the statistics screen without feeling limiting.
const PLAN_FIELD_MAX_LENGTH = 140;

type PlanFieldKey = 'reason' | 'cue' | 'pairing' | 'miniVersion' | 'reward';

// The "Routine leichter machen" fields: identity first, then the four laws of
// "Die 1%-Methode" in order — obvious (Auslöser), attractive (Verknüpfung),
// easy (Mini-Version), satisfying (Belohnung). Kept in one list so the form
// and its labels stay in sync and the block is trivial to reorder.
const PLAN_FIELDS: {
  key: PlanFieldKey;
  label: string;
  placeholder: string;
}[] = [
  // Identity first: in "Die 1%-Methode" the question of who you want to become
  // is what the concrete cue/pairing/reward hang off, not an afterthought.
  {
    key: 'reason',
    label: 'Identität',
    placeholder: 'z. B. Ich bin jemand, der sich jeden Tag bewegt.',
  },
  { key: 'cue', label: 'Auslöser', placeholder: 'z. B. Nach dem Zähneputzen' },
  {
    key: 'pairing',
    label: 'Verknüpfung',
    placeholder: 'z. B. Dabei höre ich meinen Lieblingspodcast.',
  },
  {
    key: 'miniVersion',
    label: 'Mini-Version',
    placeholder: 'z. B. Nur die Laufschuhe anziehen.',
  },
  { key: 'reward', label: 'Belohnung', placeholder: 'z. B. Danach trinke ich entspannt einen Kaffee.' },
];

/**
 * Decides which habit-stack reference to submit.
 *
 * `pairing_routine_id` carries a real foreign key (migration 0004), so a
 * deliberate choice is validated against the routines actually on offer — a
 * partner deleted while the form was open must not be written back as a
 * dangling reference.
 *
 * An *untouched* picker submits the existing value unchanged, which is the
 * part that is easy to get wrong: `stackableRoutines` is loaded
 * asynchronously and starts empty, so validating unconditionally silently
 * erased a link whenever the user saved before that load finished.
 */
export function resolveStackPartner(
  touched: boolean,
  selected: string | null,
  offered: readonly RoutineFormStackOption[],
  initial: string | null | undefined,
): string | null {
  if (!touched) {
    return initial ?? null;
  }
  return offered.some((option) => option.id === selected) ? selected : null;
}

/** Shared create/edit form for routines, per docs/SCREEN_SPECIFICATIONS.md's Create Routine Screen. */
export function RoutineForm({
  categories,
  stackableRoutines = [],
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
  const [cue, setCue] = useState(initialValues?.cue ?? '');
  const [pairing, setPairing] = useState(initialValues?.pairing ?? '');
  const [miniVersion, setMiniVersion] = useState(initialValues?.miniVersion ?? '');
  const [pairingRoutineId, setPairingRoutineId] = useState<string | null>(
    initialValues?.pairingRoutineId ?? null,
  );
  // Whether the user actually touched the stack picker. Without this the
  // submit handler could only decide by checking the selection against
  // `stackableRoutines` — which loads asynchronously and starts empty, so
  // saving quickly (or saving a routine whose partner is merely paused or
  // soft-deleted) silently erased an existing link the user never touched.
  const [stackPickerTouched, setStackPickerTouched] = useState(false);

  const [reward, setReward] = useState(initialValues?.reward ?? '');
  const [allowConsciousSkip, setAllowConsciousSkip] = useState(
    initialValues?.allowConsciousSkip ?? false,
  );
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  function chooseStackPartner(id: string | null) {
    setStackPickerTouched(true);
    setPairingRoutineId(id);
  }

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

  const planValues: Record<PlanFieldKey, string> = { reason, cue, pairing, miniVersion, reward };
  const planSetters: Record<PlanFieldKey, (value: string) => void> = {
    reason: setReason,
    cue: setCue,
    pairing: setPairing,
    miniVersion: setMiniVersion,
    reward: setReward,
  };

  function nullIfEmpty(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function handleSubmit() {
    const trimmedTime = timeOfDay.trim();
    onSubmit({
      name: trimmedName,
      categoryId,
      scheduleType,
      scheduledWeekdays: needsWeekdaySelection ? scheduledWeekdays : null,
      weeklyTargetCount: scheduleType === 'weekly_target' ? weeklyTargetCount : null,
      timeOfDay: trimmedTime.length > 0 ? trimmedTime : null,
      reason: nullIfEmpty(reason),
      cue: nullIfEmpty(cue),
      pairing: nullIfEmpty(pairing),
      miniVersion: nullIfEmpty(miniVersion),
      pairingRoutineId: resolveStackPartner(
        stackPickerTouched,
        pairingRoutineId,
        stackableRoutines,
        initialValues?.pairingRoutineId,
      ),
      reward: nullIfEmpty(reward),
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
        style={styles.createCategoryLink}
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
                      color={selected ? colors.accent : colors.textSecondary}
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
          <View style={styles.switchRow}>
            <Text style={styles.label}>Bewusstes Auslassen erlauben</Text>
            <Switch
              value={allowConsciousSkip}
              onValueChange={setAllowConsciousSkip}
              testID="routine-form-allow-skip-switch"
            />
          </View>

          {/* "Atomic Habits" planning aids, per docs/DATA_MODEL.md — optional
              free text, purely a thinking prompt. Never affects streaks,
              progress, jokers or completion. Shown only here and on the
              routine's statistics screen ("Dein Plan"). */}
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>Routine leichter machen</Text>
            <Text style={styles.planIntro}>Kleine Anker helfen dir dranzubleiben.</Text>
          </View>
          {PLAN_FIELDS.map(({ key, label, placeholder }) => (
            <View key={key} style={styles.planField}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={planValues[key]}
                onChangeText={planSetters[key]}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={PLAN_FIELD_MAX_LENGTH}
                accessibilityLabel={label}
                style={styles.planInput}
                testID={`routine-form-${key}-input`}
              />
              {/* Habit stacking, structured: "Nach X, mache ich Y". Sits under
                  the free-text Verknüpfung note because it is the same idea
                  made concrete — picking a real routine means a rename follows
                  automatically and a deleted routine cannot leave a stale name
                  behind. */}
              {key === 'pairing' && stackableRoutines.length > 0 && (
                <View style={styles.planField} testID="routine-form-stack-picker">
                  <Text style={styles.label}>Nach welcher Routine?</Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: pairingRoutineId === null }}
                      testID="routine-form-stack-none"
                      onPress={() => chooseStackPartner(null)}
                      style={({ pressed }) => [
                        styles.chip,
                        pairingRoutineId === null && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.chipLabel}>Keine</Text>
                    </Pressable>
                    {stackableRoutines.map((option) => (
                      <Pressable
                        key={option.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: pairingRoutineId === option.id }}
                        testID={`routine-form-stack-${option.id}`}
                        onPress={() => chooseStackPartner(option.id)}
                        style={({ pressed }) => [
                          styles.chip,
                          pairingRoutineId === option.id && styles.chipSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.chipLabel}>{option.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}
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
    ...pressedFeedback,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  inputRowField: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  // Three side-by-side underlined options, replacing the colored option
  // cards — selection reads via a gold underline + gold label, not a fill.
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  frequencyCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderColor: 'transparent',
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
  },
  targetCountValue: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  weekdayCard: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  weekdayCardTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayToggle: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekdayToggleLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  // Hairline outline glyph, mirroring CompletionControl — never a filled
  // circle (docs/DESIGN_SYSTEM.md's Routine and Task Item Design).
  weekdayCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCircleSelected: {
    borderColor: colors.accent,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  advancedToggleLabel: {
    ...typography.label,
    color: colors.textPrimary,
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
  planHeader: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  planTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  planIntro: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  planField: {
    gap: spacing.xxs,
  },
  // Multiline free text — a soft-bordered rounded box (roomier than the
  // hairline underline inputs) so a 2-3 line note reads comfortably, per
  // docs/DESIGN_SYSTEM.md's soft-paper inputs.
  planInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 56,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
});
