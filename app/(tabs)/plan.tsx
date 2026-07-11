import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listRoutines, type Routine } from '../../src/data/repositories/routineRepository';
import {
  listRoutineEventsInRange,
  type RoutineEvent,
} from '../../src/data/repositories/routineEventRepository';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { buildRoutineWeekRows, currentWeekDates } from '../../src/domain/routines/weekOverview';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { RoutineWeekRow } from '../../src/ui/components/RoutineWeekRow';
import { WeekDayStrip } from '../../src/ui/components/WeekDayStrip';
import { colors, spacing, typography } from '../../src/ui/theme';

/**
 * Weekly per-routine completion overview, plus entry points into the
 * relocated Routines/Tasks screens (docs/SCREEN_SPECIFICATIONS.md's Plan
 * Screen). Full management (reorder, pause, five-section task list) stays
 * on those screens — this is a read-mostly weekly summary.
 */
export default function PlanScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [eventsByRoutineId, setEventsByRoutineId] = useState<Record<string, RoutineEvent[]>>({});

  const today = todayDateString();
  const weekDates = useMemo(() => currentWeekDates(today), [today]);

  const loadRoutines = useCallback(() => {
    listRoutines(db).then((allRoutines) => setRoutines(allRoutines.filter((r) => !r.isPaused)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  // One extra day before the week's start catches a "moved to Monday" event
  // whose own occurrence_date falls on the prior Sunday (mirrors Today's
  // yesterday+today fetch in app/(tabs)/today.tsx).
  useEffect(() => {
    const fromDate = addDaysToDateString(weekDates[0], -1);
    const toDate = weekDates[weekDates.length - 1];
    routines.forEach((routine) => {
      listRoutineEventsInRange(db, routine.id, fromDate, toDate).then((events) => {
        setEventsByRoutineId((prev) => ({ ...prev, [routine.id]: events }));
      });
    });
  }, [routines, weekDates]);

  const weekRows = useMemo(
    () => buildRoutineWeekRows(routines, eventsByRoutineId, weekDates, today),
    [routines, eventsByRoutineId, weekDates, today],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plan</Text>

      <WeekDayStrip dates={weekDates} todayDate={today} testID="plan-week-strip" />

      {weekRows.length === 0 ? (
        <EmptyState
          title="Noch keine aktiven Routinen"
          message="Lege eine Routine an, um deine Wochenübersicht zu sehen."
        />
      ) : (
        <View style={styles.weekRows} testID="plan-week-rows">
          {weekRows.map((row) => (
            <RoutineWeekRow
              key={row.routineId}
              routineName={row.routineName}
              days={row.days}
              testID={`plan-week-row-${row.routineId}`}
            />
          ))}
        </View>
      )}

      <View style={styles.links}>
        <Link href="/routines" style={styles.link} testID="plan-manage-routines-link">
          Alle Routinen verwalten
        </Link>
        <Link href="/tasks" style={styles.link} testID="plan-manage-tasks-link">
          Alle Aufgaben verwalten
        </Link>
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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  weekRows: {
    gap: spacing.xxs,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  link: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
});
