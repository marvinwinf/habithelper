import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { listRoutines, softDeleteRoutine, type Routine } from '../../src/data/repositories/routineRepository';
import {
  listRoutineEventsInRange,
  type RoutineEvent,
} from '../../src/data/repositories/routineEventRepository';
import {
  getAppStreakCache,
  type AppStreakCache,
} from '../../src/data/repositories/appStreakCacheRepository';
import { ensureProfile } from '../../src/data/repositories/profileRepository';
import {
  listRoutineStateCaches,
  type RoutineStateCache,
} from '../../src/data/repositories/routineStateCacheRepository';
import {
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
  listUndatedTasks,
  listUpcomingTasks,
  type Task,
} from '../../src/data/repositories/taskRepository';
import {
  completeRoutineOccurrence,
  exceedRoutineOccurrence,
  moveRoutineOccurrence,
  pauseRoutine,
  skipRoutineOccurrence,
} from '../../src/services/routineService';
import { deleteTask, moveTask, toggleTaskCompletion } from '../../src/services/taskService';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { getGreeting } from '../../src/domain/greeting';
import { classifyOccurrence, type OccurrenceState } from '../../src/domain/routines/completion';
import { scheduleFromRoutineRow } from '../../src/domain/routines/schedule';
import { isFirstCompletionOfDay } from '../../src/domain/streaks/appStreak';
import { compareByDateThenTime } from '../../src/domain/tasks/ordering';
import { isDueTodayOrEarlier } from '../../src/domain/tasks/section';
import { confirmRoutineDeletion, confirmTaskDeletion } from '../../src/ui/alerts';
import { triggerFirstCompletionOfDayHaptic } from '../../src/ui/animation/haptics';
import { useStreakBurst } from '../../src/ui/animation/useStreakBurst';
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { ProgressBar } from '../../src/ui/components/ProgressBar';
import { RoutineCard, type RoutineCardOccurrenceState } from '../../src/ui/components/RoutineCard';
import { TaskCard } from '../../src/ui/components/TaskCard';
import { colors, iconBadgeSizes, spacing, typography } from '../../src/ui/theme';

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

interface DueRoutine {
  routine: Routine;
  state: RoutineCardOccurrenceState;
}

function isCardState(state: OccurrenceState): state is RoutineCardOccurrenceState {
  return state === 'pending' || state === 'completed' || state === 'exceeded' || state === 'skipped';
}

export default function TodayScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventsByRoutineId, setEventsByRoutineId] = useState<Record<string, RoutineEvent[]>>({});
  const [appStreak, setAppStreak] = useState<AppStreakCache | undefined>(undefined);
  const [routineStreaks, setRoutineStreaks] = useState<Record<string, RoutineStateCache>>({});
  const [displayName, setDisplayName] = useState('');
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [tasksDueToday, setTasksDueToday] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [undatedTasks, setUndatedTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const streakBurst = useStreakBurst();

  const loadData = useCallback(() => {
    const today = todayDateString();
    listRoutines(db).then((allRoutines) => setRoutines(allRoutines.filter((r) => !r.isPaused)));
    listCategories(db).then(setCategories);
    getAppStreakCache(db).then(setAppStreak);
    listRoutineStateCaches(db).then((rows) =>
      setRoutineStreaks(Object.fromEntries(rows.map((row) => [row.routineId, row]))),
    );
    ensureProfile(db).then((profile) => setDisplayName(profile.displayName));
    listOverdueTasks(db, today).then(setOverdueTasks);
    listTasksForToday(db, today).then(setTasksDueToday);
    listUpcomingTasks(db, today).then(setUpcomingTasks);
    listUndatedTasks(db).then(setUndatedTasks);
    listCompletedTasks(db).then(setCompletedTasks);
  }, []);

  // Reload on every focus, not just on mount: this tab stays mounted while
  // create/edit screens are pushed over it, so a mount-only effect would
  // never show a routine or task created via the FAB until an app restart.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Separate from the effect above: this one re-fetches events whenever the
  // active routine list changes (including after loadData() re-runs post-
  // action). Yesterday+today is sufficient for classifying today: an
  // occurrence can only arrive on today via a moved event dated yesterday
  // (moves are strictly "to tomorrow", docs/ROUTINE_RULES.md), and every
  // other relevant event carries today's occurrence_date — so the query
  // stays bounded no matter how much history a routine accumulates.
  useEffect(() => {
    const today = todayDateString();
    const yesterday = addDaysToDateString(today, -1);
    routines.forEach((r) => {
      listRoutineEventsInRange(db, r.id, yesterday, today).then((events) => {
        setEventsByRoutineId((prev) => ({ ...prev, [r.id]: events }));
      });
    });
  }, [routines]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const dueRoutines = useMemo<DueRoutine[]>(() => {
    const today = todayDateString();
    return routines
      .map((routine) => {
        const schedule = scheduleFromRoutineRow(routine);
        const events = eventsByRoutineId[routine.id] ?? [];
        const state = classifyOccurrence(schedule, today, events, today);
        return { routine, state };
      })
      .filter((entry): entry is DueRoutine => isCardState(entry.state))
      .sort((a, b) => {
        const aResolved = a.state !== 'pending';
        const bResolved = b.state !== 'pending';
        if (aResolved !== bResolved) {
          return aResolved ? 1 : -1;
        }
        return a.routine.sortOrder - b.routine.sortOrder;
      });
  }, [routines, eventsByRoutineId]);

  // The Today screen's Tasks section shows what needs attention now
  // (overdue + due today); For later holds everything else (upcoming +
  // undated) — per T049 / docs/SCREEN_SPECIFICATIONS.md's Content Order.
  // Completed tasks stay visible (subdued) in whichever bucket their own
  // date belongs to, sorted to the end, mirroring how completed routines
  // remain visible above.
  const todayTasks = useMemo<Task[]>(() => {
    const today = todayDateString();
    const incomplete = [...overdueTasks, ...tasksDueToday].sort(compareByDateThenTime);
    const completedHere = completedTasks
      .filter((t) => isDueTodayOrEarlier(t.date, today))
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return [...incomplete, ...completedHere];
  }, [overdueTasks, tasksDueToday, completedTasks]);

  const laterTasks = useMemo<Task[]>(() => {
    const today = todayDateString();
    const incomplete = [...upcomingTasks, ...undatedTasks].sort(compareByDateThenTime);
    const completedHere = completedTasks
      .filter((t) => !isDueTodayOrEarlier(t.date, today))
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return [...incomplete, ...completedHere];
  }, [upcomingTasks, undatedTasks, completedTasks]);

  const overdueTaskIds = useMemo(() => new Set(overdueTasks.map((t) => t.id)), [overdueTasks]);

  function handleDelete(routine: Routine) {
    confirmRoutineDeletion(routine.name, async () => {
      await softDeleteRoutine(db, routine.id);
      loadData();
    });
  }

  async function handleToggleTaskComplete(taskItem: Task) {
    await toggleTaskCompletion(db, taskItem.id);
    loadData();
  }

  async function handleMoveTaskToTomorrow(taskItem: Task) {
    await moveTask(db, taskItem.id, addDaysToDateString(todayDateString(), 1));
    loadData();
  }

  function handleDeleteTask(taskItem: Task) {
    confirmTaskDeletion(taskItem.title, async () => {
      await deleteTask(db, taskItem.id);
      loadData();
    });
  }

  // Fires the streak-burst animation and haptic exactly once per calendar
  // day — on whichever actual completion (complete or exceed) happens to be
  // the first one recorded, per T041 / docs/ROUTINE_RULES.md's Overall App
  // Streak section. Checked against the app streak cache as it stood before
  // this action, since the action itself is what would advance it.
  function maybeStartFirstCompletionOfDayBurst(occurrenceDate: string) {
    if (isFirstCompletionOfDay(appStreak?.lastIncrementedDate, occurrenceDate)) {
      streakBurst.start();
      triggerFirstCompletionOfDayHaptic();
    }
  }

  const streakScale = streakBurst.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.3, 1],
  });

  const completedRoutineCount = dueRoutines.filter(
    ({ state }) => state === 'completed' || state === 'exceeded',
  ).length;
  const greeting = getGreeting(new Date().getHours(), displayName);
  const formattedDate = DATE_FORMATTER.format(new Date());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerGreetingBlock}>
            <Text style={styles.greeting} testID="today-greeting">
              {greeting}
            </Text>
            <Text style={styles.date} testID="today-date">
              {formattedDate}
            </Text>
          </View>
          {/* Subtle per docs/SCREEN_SPECIFICATIONS.md — a compact card, not a
              dominant element; the first-completion-of-day burst (T041)
              scales this whole card. */}
          <Animated.View style={{ transform: [{ scale: streakScale }] }}>
            <Card style={styles.streakCard}>
              <Ionicons name="flame" size={iconBadgeSizes.sm.icon} color={colors.streakFlame} />
              <View>
                <Text style={styles.streakLabel}>Gesamt-Streak</Text>
                <Text style={styles.streakValue} testID="today-app-streak">
                  {appStreak?.currentStreak ?? 0}
                </Text>
              </View>
            </Card>
          </Animated.View>
        </View>

        <Card style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Heutige Routinen</Text>
            <Text style={styles.progressCount} testID="today-routine-progress">
              {completedRoutineCount} von {dueRoutines.length} erledigt
            </Text>
          </View>
          <ProgressBar
            value={dueRoutines.length === 0 ? 0 : completedRoutineCount / dueRoutines.length}
            testID="today-routine-progress-bar"
          />
        </Card>
      </View>

      {dueRoutines.length === 0 && todayTasks.length === 0 && laterTasks.length === 0 ? (
        <EmptyState
          title="Für heute nichts geplant"
          message="Erstelle eine Routine oder Aufgabe, um loszulegen."
        />
      ) : (
        <View style={styles.sections}>
          {dueRoutines.length > 0 && (
            <View testID="today-section-routines">
              <Text style={styles.sectionTitle}>Routinen</Text>
              <View style={styles.list}>
                {dueRoutines.map(({ routine, state }) => {
                  const category = routine.categoryId
                    ? categoryById.get(routine.categoryId)
                    : undefined;
                  return (
                    <RoutineCard
                      key={routine.id}
                      testID={`routine-card-${routine.id}`}
                      routine={routine}
                      category={category}
                      streak={routineStreaks[routine.id]?.currentStreak ?? 0}
                      state={state}
                      onComplete={async () => {
                        maybeStartFirstCompletionOfDayBurst(todayDateString());
                        const result = await completeRoutineOccurrence(
                          db,
                          routine.id,
                          todayDateString(),
                        );
                        loadData();
                        return result.leveledUp;
                      }}
                      onExceed={async () => {
                        maybeStartFirstCompletionOfDayBurst(todayDateString());
                        const result = await exceedRoutineOccurrence(
                          db,
                          routine.id,
                          todayDateString(),
                        );
                        loadData();
                        return result.leveledUp;
                      }}
                      onOpenDetail={() => router.push(`/routine/${routine.id}`)}
                      onMoveToTomorrow={() => {
                        const today = todayDateString();
                        return moveRoutineOccurrence(
                          db,
                          routine.id,
                          today,
                          addDaysToDateString(today, 1),
                        ).then(loadData);
                      }}
                      onSkip={() =>
                        skipRoutineOccurrence(db, routine.id, todayDateString()).then(loadData)
                      }
                      onEdit={() => router.push(`/routine/${routine.id}/edit`)}
                      onPause={() => pauseRoutine(db, routine.id, todayDateString()).then(loadData)}
                      onDelete={() => handleDelete(routine)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {todayTasks.length > 0 && (
            <View testID="today-section-tasks">
              <Text style={styles.sectionTitle}>Aufgaben</Text>
              <View style={styles.list}>
                {todayTasks.map((taskItem) => {
                  const category = taskItem.categoryId
                    ? categoryById.get(taskItem.categoryId)
                    : undefined;
                  return (
                    <TaskCard
                      key={taskItem.id}
                      testID={`today-task-${taskItem.id}`}
                      task={taskItem}
                      category={category}
                      isOverdue={overdueTaskIds.has(taskItem.id)}
                      onToggleComplete={() => handleToggleTaskComplete(taskItem)}
                      onMoveToTomorrow={() => handleMoveTaskToTomorrow(taskItem)}
                      onEdit={() => router.push(`/task/${taskItem.id}/edit`)}
                      onDelete={() => handleDeleteTask(taskItem)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {laterTasks.length > 0 && (
            <View testID="today-section-later">
              <Text style={styles.sectionTitle}>Für später</Text>
              <View style={styles.list}>
                {laterTasks.map((taskItem) => {
                  const category = taskItem.categoryId
                    ? categoryById.get(taskItem.categoryId)
                    : undefined;
                  return (
                    <TaskCard
                      key={taskItem.id}
                      testID={`today-task-${taskItem.id}`}
                      task={taskItem}
                      category={category}
                      isOverdue={false}
                      forLater
                      onToggleComplete={() => handleToggleTaskComplete(taskItem)}
                      onMoveToTomorrow={() => handleMoveTaskToTomorrow(taskItem)}
                      onEdit={() => router.push(`/task/${taskItem.id}/edit`)}
                      onDelete={() => handleDeleteTask(taskItem)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
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
    // Clears the floating create button (bottom 92 + 56 tall, see
    // CreateFab.tsx) so the last card's completion control is never
    // covered by it.
    paddingBottom: 160,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerGreetingBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  greeting: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  streakLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.textSecondary,
  },
  streakValue: {
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  progressCard: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textPrimary,
  },
  progressCount: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  sections: {
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
});
