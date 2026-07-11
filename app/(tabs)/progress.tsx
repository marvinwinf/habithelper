import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { listRoutines, type Routine } from '../../src/data/repositories/routineRepository';
import {
  listRoutineEventsInRange,
  type RoutineEvent,
} from '../../src/data/repositories/routineEventRepository';
import {
  getAppStreakCache,
  type AppStreakCache,
} from '../../src/data/repositories/appStreakCacheRepository';
import {
  listRoutineStateCaches,
  type RoutineStateCache,
} from '../../src/data/repositories/routineStateCacheRepository';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import {
  buildCategoryBreakdown,
  buildDailyCompletionSeries,
  buildProgressStatTiles,
} from '../../src/domain/progress/overview';
import { buildRoutineWeekRows, currentWeekDates } from '../../src/domain/routines/weekOverview';
import { AreaChart } from '../../src/ui/components/AreaChart';
import { DonutChart } from '../../src/ui/components/DonutChart';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { RingProgress } from '../../src/ui/components/RingProgress';
import { StatTile } from '../../src/ui/components/StatTile';
import { chartPalette, colors, radius, spacing, typography } from '../../src/ui/theme';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Read-only dashboard (docs/SCREEN_SPECIFICATIONS.md's Progress Screen):
 * streak ring, stat tiles, a completion-over-time chart, and a
 * habit-breakdown donut, all derived from existing cached/derived data.
 */
export default function ProgressScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [appStreak, setAppStreak] = useState<AppStreakCache | undefined>(undefined);
  const [routineStateCaches, setRoutineStateCaches] = useState<Record<string, RoutineStateCache>>(
    {},
  );
  const [eventsByRoutineId, setEventsByRoutineId] = useState<Record<string, RoutineEvent[]>>({});

  const today = todayDateString();
  const weekDates = useMemo(() => currentWeekDates(today), [today]);

  const loadData = useCallback(() => {
    listRoutines(db).then((allRoutines) => setRoutines(allRoutines.filter((r) => !r.isPaused)));
    listCategories(db).then(setCategories);
    getAppStreakCache(db).then(setAppStreak);
    listRoutineStateCaches(db).then((rows) =>
      setRoutineStateCaches(Object.fromEntries(rows.map((row) => [row.routineId, row]))),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    const fromDate = addDaysToDateString(weekDates[0], -1);
    const toDate = weekDates[weekDates.length - 1];
    routines.forEach((routine) => {
      listRoutineEventsInRange(db, routine.id, fromDate, toDate).then((events) => {
        setEventsByRoutineId((prev) => ({ ...prev, [routine.id]: events }));
      });
    });
  }, [routines, weekDates]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const weekRows = useMemo(
    () => buildRoutineWeekRows(routines, eventsByRoutineId, weekDates, today),
    [routines, eventsByRoutineId, weekDates, today],
  );

  const bestStreakByRoutineId = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(routineStateCaches).map(([id, cache]) => [id, cache.bestStreak]),
      ),
    [routineStateCaches],
  );

  const stats = useMemo(
    () => buildProgressStatTiles(weekRows, bestStreakByRoutineId),
    [weekRows, bestStreakByRoutineId],
  );

  const dailySeries = useMemo(
    () => buildDailyCompletionSeries(weekRows, weekDates),
    [weekRows, weekDates],
  );

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(routines, categoryById, chartPalette),
    [routines, categoryById],
  );

  if (routines.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Progress</Text>
        <EmptyState
          title="Noch keine Daten"
          message="Sobald du Routinen abschließt, siehst du hier deinen Fortschritt."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.heroCard} testID="progress-streak-hero">
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Du bist auf einem guten Weg!</Text>
          <Text style={styles.heroSubtitle}>Mach weiter so – jeder Tag zählt.</Text>
        </View>
        <RingProgress
          value={stats.completionRatePercent / 100}
          label={String(appStreak?.currentStreak ?? 0)}
          fillColor={chartPalette[1]}
          testID="progress-streak-ring"
        />
      </View>

      <View style={styles.statsGrid} testID="progress-stats">
        <StatTile
          value={`${stats.completionRatePercent}%`}
          label="Erledigungsquote (Woche)"
          testID="progress-stat-completion-rate"
        />
        <StatTile
          value={String(stats.longestStreak)}
          label="Längste Streak"
          testID="progress-stat-longest-streak"
        />
        <StatTile
          value={String(stats.activeRoutineCount)}
          label="Aktive Routinen"
          testID="progress-stat-active-routines"
        />
        <StatTile
          value={String(stats.completionsThisWeek)}
          label="Erledigt diese Woche"
          testID="progress-stat-completions"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verlauf über die Woche</Text>
        <AreaChart
          data={dailySeries.map((point, index) => ({
            label: WEEKDAY_LABELS[index],
            value: point.rate,
          }))}
          testID="progress-completion-chart"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Routinen nach Kategorie</Text>
        <DonutChart segments={categoryBreakdown} testID="progress-category-donut" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  heroText: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
