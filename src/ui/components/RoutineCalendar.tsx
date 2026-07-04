import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import type { CalendarDayState } from '../../domain/routines/calendar';

export interface CalendarDay {
  date: string;
  state: CalendarDayState;
}

export interface RoutineCalendarProps {
  title: string;
  days: readonly CalendarDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (day: CalendarDay) => void;
  testID?: string;
}

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const STATE_BACKGROUNDS: Record<CalendarDayState, string> = {
  not_due: 'transparent',
  pending: colors.surface,
  completed: colors.categories.mint.light,
  exceeded: colors.categories.mint.base,
  missed: colors.categories.softPeach.light,
  skipped: colors.surfaceMuted,
  moved: colors.categories.skyBlue.light,
  paused: colors.categories.lavender.light,
};

function isoWeekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return jsWeekday === 0 ? 7 : jsWeekday;
}

/**
 * Monthly history grid for the routine detail screen. Purely presentational:
 * the caller supplies each day's already-classified state (see
 * src/domain/routines/calendar.ts) and decides what a day tap means.
 */
export function RoutineCalendar({
  title,
  days,
  onPrevMonth,
  onNextMonth,
  onDayPress,
  testID,
}: RoutineCalendarProps) {
  // Blank cells before the 1st so weekday columns line up (Monday-first).
  const leadingBlanks = days.length > 0 ? isoWeekday(days[0].date) - 1 : 0;

  return (
    <View testID={testID}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voriger Monat"
          onPress={onPrevMonth}
          style={styles.navButton}
          testID={testID ? `${testID}-prev` : undefined}
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nächster Monat"
          onPress={onNextMonth}
          style={styles.navButton}
          testID={testID ? `${testID}-next` : undefined}
        >
          <Text style={styles.navLabel}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAY_HEADERS.map((label) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <View key={`blank-${index}`} style={styles.cell} />
        ))}
        {days.map((day) => (
          <View key={day.date} style={styles.cell}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onDayPress(day)}
              testID={`calendar-day-${day.date}-${day.state}`}
              style={[styles.day, { backgroundColor: STATE_BACKGROUNDS[day.state] }]}
            >
              <Text style={styles.dayLabel}>{Number(day.date.slice(8, 10))}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navButton: {
    width: spacing.xxl,
    height: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: typography.heading.fontSize,
    color: colors.textPrimary,
  },
  title: {
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    // Seven equal columns; percentage width is layout, not a themed value.
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  day: {
    width: '86%',
    height: '86%',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
  },
});
