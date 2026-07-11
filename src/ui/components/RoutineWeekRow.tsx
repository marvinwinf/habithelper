import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { DotState } from '../../domain/routines/weekOverview';

export interface RoutineWeekRowProps {
  routineName: string;
  days: readonly DotState[];
  testID?: string;
}

function dotStyle(state: DotState) {
  if (state === 'completed') {
    return styles.dotCompleted;
  }
  if (state === 'missed') {
    return styles.dotMissed;
  }
  return styles.dotNotDue;
}

/**
 * One routine's row on the Plan screen's week overview: name + one
 * completion dot per day (docs/SCREEN_SPECIFICATIONS.md's Plan Screen).
 */
export function RoutineWeekRow({ routineName, days, testID }: RoutineWeekRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.name} numberOfLines={1}>
        {routineName}
      </Text>
      <View style={styles.dots}>
        {days.map((state, index) => (
          <View key={index} style={[styles.dot, dotStyle(state)]} testID={`${testID}-dot-${index}`} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCompleted: {
    backgroundColor: colors.accent,
  },
  dotMissed: {
    backgroundColor: colors.missed,
  },
  dotNotDue: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
