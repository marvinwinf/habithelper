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
  bucketCompletionSeriesByWeek,
  buildCategoryBreakdown,
  buildDailyCompletionSeries,
  buildProgressStatTiles,
} from '../../src/domain/progress/overview';
import { rangeDates, buildRoutineWeekRows, type ProgressRange } from '../../src/domain/routines/weekOverview';
import { AreaChart } from '../../src/ui/components/AreaChart';
import { DonutChart } from '../../src/ui/components/DonutChart';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { RingProgress } from '../../src/ui/components/RingProgress';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { StatTile } from '../../src/ui/components/StatTile';
import { chartPalette, colors, radius, spacing, typography } from '../../src/ui/theme';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const RANGE_OPTIONS: { value: ProgressRange; label: string }[] = [
  { value: 'week', label: 'Woche' },
  { value: '30d', label: '30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const COMPLETION_RATE_LABEL: Record<ProgressRange, string> = {
  week: 'Erledigungsquote (Woche)',
  '30d': 'Erledigungsquote (30 Tage)',
  all: 'Erledigungsquote (Gesamt)',
};

const COMPLETIONS_LABEL: Record<ProgressRange, string> = {
  week: 'Erledigt diese Woche',
  '30d': 'Erledigt (30 Tage)',
  all: 'Erledigt (gesamt)',
};

const CHART_TITLE: Record<ProgressRange, string> = {
  week: 'Verlauf über die Woche',
  '30d': 'Verlauf über 30 Tage',
  all: 'Verlauf insgesamt',
};

function formatWeekLabel(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}.${month}.`;
}

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
  const [range, setRange] = useState<ProgressRange>('week');

  const today = todayDateString();

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

  // "All time" has no fixed start, so it is derived from the oldest routine
  // still tracked (its creation date) rather than from events — this needs
  // no extra query, unlike scanning every routine's events for their oldest
  // row would.
  const earliestDate = useMemo(() => {
    if (routines.length === 0) {
      return today;
    }
    return routines.reduce(
      (oldest, routine) => (routine.createdAt.slice(0, 10) < oldest ? routine.createdAt.slice(0, 10) : oldest),
      today,
    );
  }, [routines, today]);

  const dates = useMemo(
    () => rangeDates(today, range, earliestDate),
    [today, range, earliestDate],
  );

  useEffect(() => {
    const fromDate = addDaysToDateString(dates[0], -1);
    const toDate = dates[dates.length - 1];
    routines.forEach((routine) => {
      listRoutineEventsInRange(db, routine.id, fromDate, toDate).then((events) => {
        setEventsByRoutineId((prev) => ({ ...prev, [routine.id]: events }));
      });
    });
  }, [routines, dates]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const weekRows = useMemo(
    () => buildRoutineWeekRows(routines, eventsByRoutineId, dates, today),
    [routines, eventsByRoutineId, dates, today],
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

  const dailySeries = useMemo(() => buildDailyCompletionSeries(weekRows, dates), [weekRows, dates]);

  const chartPoints = useMemo(() => {
    if (range !== 'all') {
      return dailySeries.map((point, index) => ({
        label: range === 'week' ? WEEKDAY_LABELS[index] : formatWeekLabel(point.date),
        value: point.rate,
      }));
    }
    return bucketCompletionSeriesByWeek(dailySeries).map((point) => ({
      label: formatWeekLabel(point.date),
      value: point.rate,
    }));
  }, [dailySeries, range]);

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

      <SegmentedControl
        options={RANGE_OPTIONS}
        value={range}
        onChange={setRange}
        testID="progress-range-toggle"
      />

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
          label={COMPLETION_RATE_LABEL[range]}
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
          value={String(stats.completionsInPeriod)}
          label={COMPLETIONS_LABEL[range]}
          testID="progress-stat-completions"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{CHART_TITLE[range]}</Text>
        <AreaChart data={chartPoints} testID="progress-completion-chart" />
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
