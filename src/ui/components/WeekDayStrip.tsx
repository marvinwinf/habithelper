import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export interface WeekDayStripProps {
  /** Monday–Sunday `YYYY-MM-DD` dates, per src/domain/routines/weekOverview.ts's currentWeekDates. */
  dates: readonly string[];
  todayDate: string;
  testID?: string;
}

/** Mon–Sun day strip with today highlighted, per the Plan screen's week overview. */
export function WeekDayStrip({ dates, todayDate, testID }: WeekDayStripProps) {
  return (
    <View style={styles.row} testID={testID}>
      {dates.map((date, index) => {
        const isToday = date === todayDate;
        const dayNumber = Number(date.split('-')[2]);
        return (
          <View key={date} style={[styles.day, isToday && styles.dayToday]}>
            <Text style={[styles.weekdayLabel, isToday && styles.labelToday]}>
              {WEEKDAY_LABELS[index]}
            </Text>
            <Text style={[styles.dayNumber, isToday && styles.labelToday]}>{dayNumber}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    minWidth: 36,
  },
  dayToday: {
    backgroundColor: colors.accent,
  },
  weekdayLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  dayNumber: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  labelToday: {
    color: colors.textOnAccent,
  },
});
