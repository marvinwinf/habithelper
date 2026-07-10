import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '../../../src/data/db/client';
import { listCategories, type Category } from '../../../src/data/repositories/categoryRepository';
import {
  getRoutine,
  updateRoutine,
  type Routine,
} from '../../../src/data/repositories/routineRepository';
import {
  listRoutineEvents,
  type RoutineEvent,
} from '../../../src/data/repositories/routineEventRepository';
import {
  getRoutineStateCache,
  type RoutineStateCache,
} from '../../../src/data/repositories/routineStateCacheRepository';
import {
  pauseRoutine,
  reactivateRoutine,
  retroactivelyCompleteOccurrence,
} from '../../../src/services/routineService';
import { reconcileRoutine } from '../../../src/services/reconciliationService';
import { toLocalDateString, todayDateString } from '../../../src/domain/dates';
import { getCalendarDayState, listMonthDates } from '../../../src/domain/routines/calendar';
import { scheduleFromRoutineRow, type IsoWeekday } from '../../../src/domain/routines/schedule';
import { LEVEL_SEGMENT_SIZE } from '../../../src/domain/streaks/replay';
import { levelName } from '../../../src/domain/streaks/levelName';
import {
  completionsIntoCurrentLevel,
  remainingCompletionsToNextLevel,
} from '../../../src/domain/streaks/levelProgress';
import { triggerLevelMilestoneHaptic } from '../../../src/ui/animation/haptics';
import { useLevelUpAnimation } from '../../../src/ui/animation/useLevelUpAnimation';
import { Card } from '../../../src/ui/components/Card';
import { CategoryBadge } from '../../../src/ui/components/CategoryBadge';
import { IconBadge } from '../../../src/ui/components/IconBadge';
import { ProgressBar } from '../../../src/ui/components/ProgressBar';
import { RoutineCalendar, type CalendarDay } from '../../../src/ui/components/RoutineCalendar';
import { ScreenHeader } from '../../../src/ui/components/ScreenHeader';
import { colors, pressedOpacity, radius, spacing, typography } from '../../../src/ui/theme';
import { categoryIconName } from '../../../src/ui/categoryIcons';

// Same distinguishing treatment as RoutineCard's level-up milestone (T042):
// a brief fade dip across the whole hero, not just a single number, so it
// reads as visually distinct from ordinary stat updates — a fade, not a
// scale burst, per docs/DESIGN_SYSTEM.md's Motion section.
const LEVEL_UP_FADE_OPACITY = 0.4;

const WEEKDAY_LABELS: { day: IsoWeekday; label: string }[] = [
  { day: 1, label: 'Mo' },
  { day: 2, label: 'Di' },
  { day: 3, label: 'Mi' },
  { day: 4, label: 'Do' },
  { day: 5, label: 'Fr' },
  { day: 6, label: 'Sa' },
  { day: 7, label: 'So' },
];

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [cache, setCache] = useState<RoutineStateCache | undefined>(undefined);
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const levelUpAnimation = useLevelUpAnimation();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = todayDateString().split('-').map(Number);
    return { year, month };
  });

  const loadData = useCallback(() => {
    getRoutine(db, id).then(setRoutine);
    listCategories(db).then(setCategories);
    listRoutineEvents(db, id).then(setEvents);
    getRoutineStateCache(db, id).then(setCache);
  }, [id]);

  // Re-reconciles this routine's missed occurrences before showing its
  // state, in case the cache went stale while the app was backgrounded
  // (T038 / docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation).
  // Focus-based, not mount-based: the edit screen is pushed over this one,
  // and returning from it must show the updated name/schedule.
  useFocusEffect(
    useCallback(() => {
      reconcileRoutine(db, id)
        .catch((error) => {
          console.error('Routine reconciliation failed', error);
        })
        .finally(loadData);
    }, [id, loadData]),
  );

  const category = routine?.categoryId
    ? categories.find((c) => c.id === routine.categoryId)
    : undefined;

  const calendarDays = useMemo<CalendarDay[]>(() => {
    if (!routine) {
      return [];
    }
    const schedule = scheduleFromRoutineRow(routine);
    // createdAt is a UTC timestamp; the routine's first day is the LOCAL
    // calendar day it was created on (docs/DATA_MODEL.md: "created_at date
    // is the start"), so convert rather than slicing the UTC date part.
    const startDate = toLocalDateString(new Date(routine.createdAt));
    const today = todayDateString();
    return listMonthDates(visibleMonth.year, visibleMonth.month).map((date) => ({
      date,
      state: getCalendarDayState(schedule, events, startDate, date, today),
    }));
  }, [routine, events, visibleMonth]);

  function shiftMonth(delta: number) {
    setVisibleMonth(({ year, month }) => {
      const shifted = month + delta;
      if (shifted < 1) {
        return { year: year - 1, month: 12 };
      }
      if (shifted > 12) {
        return { year: year + 1, month: 1 };
      }
      return { year, month: shifted };
    });
  }

  function handleDayPress(day: CalendarDay) {
    // Retroactive completion applies to elapsed missed occurrences only,
    // per docs/ROUTINE_RULES.md's Retroactive Completion section.
    if (day.state !== 'missed' || day.date >= todayDateString()) {
      return;
    }
    Alert.alert('Nachträglich erledigen?', `${day.date} als erledigt markieren.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Erledigt',
        onPress: async () => {
          const result = await retroactivelyCompleteOccurrence(db, id, day.date);
          loadData();
          if (result.leveledUp) {
            levelUpAnimation.start();
            triggerLevelMilestoneHaptic();
          }
        },
      },
    ]);
  }

  const heroOpacity = levelUpAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, LEVEL_UP_FADE_OPACITY],
  });

  if (!routine) {
    return <View style={styles.screen} testID="routine-detail-loading" />;
  }

  const totalCompletions = cache?.totalCompletions ?? 0;
  const levelRank = cache?.levelRank ?? 0;
  // Displayed level numbers are 1-based (mockup: "Im Aufbau, Level 2");
  // level_rank stays the 0-based segment index (docs/ROUTINE_RULES.md).
  const levelNumber = levelRank + 1;

  async function handleTogglePause() {
    if (!routine) {
      return;
    }
    if (routine.isPaused) {
      await reactivateRoutine(db, id, todayDateString());
    } else {
      await pauseRoutine(db, id, todayDateString());
    }
    loadData();
  }

  // Lets a weekly-target ("X times a week") routine's due weekdays be
  // adjusted directly here rather than only via the full edit form, since a
  // user's weekly plan can change at any point. Safe against the streak:
  // replay.ts folds the already-recorded event log alone (never re-derives
  // due-ness from the schedule), and reconciliation only ever walks forward
  // from reconciled_through_date using whatever schedule is current at that
  // time — so this can only change which future occurrences are due, never
  // retroactively reinterpret already-recorded history.
  async function handleToggleWeekday(day: IsoWeekday) {
    if (!routine) {
      return;
    }
    const current = (routine.scheduledWeekdays as IsoWeekday[] | null) ?? [];
    const next = current.includes(day)
      ? current.filter((scheduledDay) => scheduledDay !== day)
      : [...current, day].sort((a, b) => a - b);

    if (next.length === 0) {
      Alert.alert('Mindestens ein Wochentag', 'Wähle mindestens einen Wochentag aus.');
      return;
    }

    await updateRoutine(db, id, { scheduledWeekdays: next });
    loadData();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={routine.name} testID="routine-detail-header" />

      <Animated.View style={[styles.heroCard, { opacity: heroOpacity }]}>
        <View style={styles.heroTopRow}>
          <IconBadge name={categoryIconName(category?.icon)} size="lg" />
          <View style={styles.heroTopMain}>
            {category && <CategoryBadge label={category.name} icon={category.icon} />}
            <Text style={styles.heroStreakValue} testID="routine-detail-streak">
              {cache?.currentStreak ?? 0} Tage
            </Text>
            <Text style={styles.heroMetaLabel}>Streak</Text>
          </View>
        </View>

        <Text style={styles.heroMetaValue} testID="routine-detail-level">
          {levelName(levelRank)}
        </Text>
        <Text style={styles.heroMetaLabel}>Level {levelNumber}</Text>

        <View style={styles.heroProgressRow}>
          <Text style={styles.heroMetaLabel} testID="routine-detail-remaining">
            Noch {remainingCompletionsToNextLevel(totalCompletions)} Abschlüsse bis Level{' '}
            {levelNumber + 1}
          </Text>
          <Text style={styles.heroMetaLabel} testID="routine-detail-progress-count">
            {completionsIntoCurrentLevel(totalCompletions)} / {LEVEL_SEGMENT_SIZE}
          </Text>
        </View>
        <ProgressBar
          value={completionsIntoCurrentLevel(totalCompletions) / LEVEL_SEGMENT_SIZE}
          testID="routine-detail-level-progress"
        />
        {(cache?.currentStreak ?? 0) < LEVEL_SEGMENT_SIZE && (
          <Text style={styles.heroMetaLabel} testID="routine-detail-jokers">
            Joker: {cache?.jokerInventory ?? 0}/2
          </Text>
        )}
      </Animated.View>

      <View style={styles.statRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{`${cache?.currentStreak ?? 0} Tage`}</Text>
        </View>
        <View style={styles.statBlock} testID="routine-detail-best-streak">
          <Text style={styles.statLabel}>Rekord</Text>
          <Text style={styles.statValue}>{`${cache?.bestStreak ?? 0} Tage`}</Text>
        </View>
        <View style={styles.statBlock} testID="routine-detail-total-completions">
          <Text style={styles.statLabel}>Wiederholungen</Text>
          <Text style={styles.statValue}>{`${totalCompletions}`}</Text>
        </View>
      </View>

      {routine.scheduleType === 'weekly_target' && (
        <Card style={styles.weekdayCard} testID="routine-detail-weekdays">
          <Text style={styles.weekdayCardTitle}>Wochentage</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map(({ day, label }) => {
              const selected = ((routine.scheduledWeekdays as IsoWeekday[] | null) ?? []).includes(
                day,
              );
              return (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                  testID={`routine-detail-weekday-${day}`}
                  onPress={() => handleToggleWeekday(day)}
                  style={({ pressed }) => [styles.weekdayToggle, pressed && styles.pressed]}
                >
                  <Text style={styles.weekdayToggleLabel}>{label}</Text>
                  <View style={[styles.weekdayCircle, selected && styles.weekdayCircleSelected]}>
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
        </Card>
      )}

      {routine.reason && (
        <Card style={styles.reasonCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReasonExpanded((prev) => !prev)}
            testID="routine-detail-reason-toggle"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.reasonToggle}>
              {reasonExpanded ? '▾' : '▸'} Persönlicher Grund
            </Text>
          </Pressable>
          {reasonExpanded && (
            <Text style={styles.reasonText} testID="routine-detail-reason-text">
              {routine.reason}
            </Text>
          )}
        </Card>
      )}

      <Card>
        <RoutineCalendar
          title={`${MONTH_NAMES[visibleMonth.month - 1]} ${visibleMonth.year}`}
          days={calendarDays}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          onDayPress={handleDayPress}
          today={todayDateString()}
          testID="routine-detail-calendar"
        />
      </Card>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/routine/${id}/edit`)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          testID="routine-detail-edit"
        >
          <Text style={[styles.actionLabel, styles.editLabel]}>Bearbeiten</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleTogglePause}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          testID="routine-detail-pause"
        >
          <Text style={[styles.actionLabel, styles.pauseLabel]}>
            {routine.isPaused ? 'Reaktivieren' : 'Pausieren'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  heroCard: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroTopMain: {
    flex: 1,
    gap: spacing.xs,
  },
  heroStreakValue: {
    fontFamily: typography.streak.fontFamily,
    fontSize: 36,
    color: colors.textPrimary,
  },
  heroMetaLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  heroMetaValue: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  heroProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statRow: {
    flexDirection: 'row',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
    textDecorationLine: 'underline',
  },
  editLabel: {
    color: colors.textPrimary,
  },
  pauseLabel: {
    color: colors.textPrimary,
  },
  weekdayCard: {
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
  reasonCard: {
    gap: spacing.xs,
  },
  reasonToggle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
});
