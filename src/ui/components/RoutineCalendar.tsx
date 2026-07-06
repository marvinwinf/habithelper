import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pressedOpacity, radius, spacing, typography } from '../theme';
import type { CalendarDayState } from '../../domain/routines/calendar';
import { getIsoWeekday } from '../../domain/routines/schedule';

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
  /** Today's date (YYYY-MM-DD); that day gets a ring highlight. Passed in to keep this component presentational. */
  today?: string;
  testID?: string;
}

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Every resolved state pairs a distinct icon with its color so color is
// never the sole signal (docs/DESIGN_SYSTEM.md's Accessibility section);
// pending and not_due days show only the day number (with not_due dimmed).
const STATE_VISUALS: Record<
  CalendarDayState,
  { background: string; icon: keyof typeof Ionicons.glyphMap | null; iconColor: string }
> = {
  not_due: { background: 'transparent', icon: null, iconColor: colors.textSecondary },
  pending: { background: colors.surface, icon: null, iconColor: colors.textSecondary },
  completed: {
    background: colors.categories.mint.light,
    icon: 'checkmark',
    iconColor: colors.categories.mint.dark,
  },
  exceeded: {
    background: colors.categories.mint.base,
    icon: 'checkmark-done',
    iconColor: colors.textOnAccent,
  },
  missed: {
    background: colors.categories.softPeach.light,
    icon: 'close',
    iconColor: colors.destructive,
  },
  skipped: {
    background: colors.surfaceMuted,
    icon: 'ellipse-outline',
    iconColor: colors.categories.lavender.dark,
  },
  moved: {
    background: colors.categories.skyBlue.light,
    icon: 'arrow-forward',
    iconColor: colors.categories.skyBlue.dark,
  },
  joker_protected: {
    background: colors.categories.warmCream.light,
    icon: 'star',
    iconColor: colors.categories.warmCream.dark,
  },
  paused: {
    background: colors.categories.lavender.light,
    icon: 'pause',
    iconColor: colors.categories.lavender.dark,
  },
};

// Legend per the design reference mockup (Erledigt/Verpasst/Übersprungen/
// Joker/Pausiert), plus Verschoben since it is a state a user will see.
const LEGEND_ITEMS: { state: CalendarDayState; label: string }[] = [
  { state: 'completed', label: 'Erledigt' },
  { state: 'missed', label: 'Verpasst' },
  { state: 'skipped', label: 'Übersprungen' },
  { state: 'joker_protected', label: 'Joker' },
  { state: 'paused', label: 'Pausiert' },
  { state: 'moved', label: 'Verschoben' },
];

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
  today,
  testID,
}: RoutineCalendarProps) {
  // Blank cells before the 1st so weekday columns line up (Monday-first).
  const leadingBlanks = days.length > 0 ? getIsoWeekday(days[0].date) - 1 : 0;

  return (
    <View testID={testID}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voriger Monat"
          onPress={onPrevMonth}
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          testID={testID ? `${testID}-prev` : undefined}
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nächster Monat"
          onPress={onNextMonth}
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
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
        {days.map((day) => {
          const visuals = STATE_VISUALS[day.state];
          return (
            <View key={day.date} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onDayPress(day)}
                testID={`calendar-day-${day.date}-${day.state}`}
                style={({ pressed }) => [
                  styles.day,
                  { backgroundColor: visuals.background },
                  day.date === today && styles.dayToday,
                  pressed && styles.dayPressed,
                ]}
              >
                <Text style={[styles.dayLabel, day.state === 'not_due' && styles.dayLabelDimmed]}>
                  {Number(day.date.slice(8, 10))}
                </Text>
                {visuals.icon && (
                  <Ionicons
                    name={visuals.icon}
                    size={typography.caption.fontSize}
                    color={visuals.iconColor}
                    testID={`calendar-day-${day.date}-status-icon`}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend} testID={testID ? `${testID}-legend` : undefined}>
        {LEGEND_ITEMS.map(({ state, label }) => {
          const visuals = STATE_VISUALS[state];
          return (
            <View key={state} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: visuals.background }]}>
                {visuals.icon && (
                  <Ionicons
                    name={visuals.icon}
                    size={typography.caption.fontSize}
                    color={visuals.iconColor}
                  />
                )}
              </View>
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          );
        })}
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
  navButtonPressed: {
    opacity: pressedOpacity,
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
  dayToday: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dayPressed: {
    opacity: pressedOpacity,
  },
  dayLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textPrimary,
  },
  dayLabelDimmed: {
    color: colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
});
