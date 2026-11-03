import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pressedFeedback, radius, spacing, typography } from '../theme';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * A small pill-shaped multi-way toggle (Soft Momentum's soft rounded
 * geometry, docs/DESIGN_SYSTEM.md) — used by the Progress screen's
 * week/30-day/all-time range toggle (T091). Generic over the option values
 * so callers get a typed `onChange` instead of a bare string.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && pressedFeedback,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textOnAccent,
    fontWeight: '600',
  },
});
