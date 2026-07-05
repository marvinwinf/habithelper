import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '../../../src/data/db/client';
import { listCategories, type Category } from '../../../src/data/repositories/categoryRepository';
import { getRoutine, type Routine } from '../../../src/data/repositories/routineRepository';
import {
  listRoutineEvents,
  type RoutineEvent,
} from '../../../src/data/repositories/routineEventRepository';
import {
  getRoutineStateCache,
  type RoutineStateCache,
} from '../../../src/data/repositories/routineStateCacheRepository';
import { retroactivelyCompleteOccurrence } from '../../../src/services/routineService';
import { reconcileRoutine } from '../../../src/services/reconciliationService';
import { toLocalDateString, todayDateString } from '../../../src/domain/dates';
import { getCalendarDayState, listMonthDates } from '../../../src/domain/routines/calendar';
import { scheduleFromRoutineRow } from '../../../src/domain/routines/schedule';
import { LEVEL_SEGMENT_SIZE } from '../../../src/domain/streaks/replay';
import { levelName } from '../../../src/domain/streaks/levelName';
import { Card } from '../../../src/ui/components/Card';
import { CategoryBadge } from '../../../src/ui/components/CategoryBadge';
import { ProgressBar } from '../../../src/ui/components/ProgressBar';
import { RoutineCalendar, type CalendarDay } from '../../../src/ui/components/RoutineCalendar';
import { colors, spacing, typography } from '../../../src/ui/theme';

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
  const [routine, setRoutine] = useState<Routine | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [cache, setCache] = useState<RoutineStateCache | undefined>(undefined);
  const [reasonExpanded, setReasonExpanded] = useState(false);
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
  useEffect(() => {
    reconcileRoutine(db, id)
      .catch((error) => {
        console.error('Routine reconciliation failed', error);
      })
      .finally(loadData);
  }, [id, loadData]);

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
          await retroactivelyCompleteOccurrence(db, id, day.date);
          loadData();
        },
      },
    ]);
  }

  if (!routine) {
    return <View style={styles.screen} testID="routine-detail-loading" />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.statsCard}>
        <Text style={styles.name}>{routine.name}</Text>
        {category && (
          <CategoryBadge
            label={category.name}
            baseColor={category.baseColor}
            colorVariantSeed={routine.colorVariantSeed}
          />
        )}
        <Text style={styles.streak} testID="routine-detail-streak">
          Streak: {cache?.currentStreak ?? 0}
        </Text>
        <Text style={styles.level} testID="routine-detail-level">
          {levelName(cache?.levelRank ?? 0)}
        </Text>
        <ProgressBar
          value={((cache?.totalCompletions ?? 0) % LEVEL_SEGMENT_SIZE) / LEVEL_SEGMENT_SIZE}
          testID="routine-detail-level-progress"
        />
        {(cache?.currentStreak ?? 0) < LEVEL_SEGMENT_SIZE && (
          <Text style={styles.statLine} testID="routine-detail-jokers">
            Joker: {cache?.jokerInventory ?? 0}/2
          </Text>
        )}
        <Text style={styles.statLine} testID="routine-detail-best-streak">
          Rekord: {cache?.bestStreak ?? 0}
        </Text>
        <Text style={styles.statLine} testID="routine-detail-total-completions">
          Erledigt insgesamt: {cache?.totalCompletions ?? 0}
        </Text>
      </Card>

      {routine.reason && (
        <Card style={styles.reasonCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReasonExpanded((prev) => !prev)}
            testID="routine-detail-reason-toggle"
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
          testID="routine-detail-calendar"
        />
      </Card>
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
  statsCard: {
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  streak: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  level: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textPrimary,
  },
  statLine: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
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
