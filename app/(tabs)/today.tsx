import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
// gesture-handler's ScrollView cooperates with the routine rows' long-press
// drag gesture (same pairing as the Routines screen).
import { ScrollView } from 'react-native-gesture-handler';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import {
  listRoutines,
  softDeleteRoutine,
  updateRoutine,
  type Routine,
} from '../../src/data/repositories/routineRepository';
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
  undoRoutineCompletion,
} from '../../src/services/routineService';
import { deleteTask, moveTask, toggleTaskCompletion } from '../../src/services/taskService';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { getGreeting } from '../../src/domain/greeting';
import { classifyOccurrence, type OccurrenceState } from '../../src/domain/routines/completion';
import { scheduleFromRoutineRow } from '../../src/domain/routines/schedule';
import { isFirstCompletionOfDay } from '../../src/domain/streaks/appStreak';
import { compareByDateThenTime } from '../../src/domain/tasks/ordering';
import { isDueTodayOrEarlier } from '../../src/domain/tasks/section';
import { focusOfTheDay } from '../../src/domain/focusOfTheDay';
import { confirmRoutineDeletion, confirmTaskDeletion } from '../../src/ui/alerts';
import { triggerFirstCompletionOfDayHaptic } from '../../src/ui/animation/haptics';
import { animateListSettle } from '../../src/ui/animation/listTransitions';
import { mountStaggerDelayMs } from '../../src/ui/animation/useMountAnimation';
import { useReducedMotion } from '../../src/ui/animation/useReducedMotion';
import { useStreakBurst } from '../../src/ui/animation/useStreakBurst';
import { Button } from '../../src/ui/components/Button';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { FocusOfTheDayCard } from '../../src/ui/components/FocusOfTheDayCard';
import { ProgressBar } from '../../src/ui/components/ProgressBar';
import { ReorderableList } from '../../src/ui/components/ReorderableList';
import { RoutineCard, type RoutineCardOccurrenceState } from '../../src/ui/components/RoutineCard';
import { Sheet } from '../../src/ui/components/Sheet';
import { TaskCard } from '../../src/ui/components/TaskCard';
import { colors, pressedOpacity, spacing, typography } from '../../src/ui/theme';

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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const streakBurst = useStreakBurst();
  const reducedMotion = useReducedMotion();
  const [allDoneOpacity] = useState(() => new Animated.Value(0));

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

  // Queues the gentle glide for rows that re-sort (completed/undone items
  // moving between the pending and resolved groups) before reloading.
  const reloadWithListSettle = useCallback(() => {
    animateListSettle(reducedMotion);
    loadData();
  }, [loadData, reducedMotion]);

  // Long-press drag on a routine card persists the new order. The visible
  // order is written back as each routine's sortOrder; the pending/resolved
  // grouping re-applies on top of it, matching the Routines screen's
  // semantics.
  async function handleReorderRoutines(newOrder: DueRoutine[]) {
    const sortById = new Map(newOrder.map((entry, index) => [entry.routine.id, index]));
    setRoutines((prev) =>
      prev.map((r) => {
        const sortOrder = sortById.get(r.id);
        return sortOrder === undefined ? r : { ...r, sortOrder };
      }),
    );
    await Promise.all(
      newOrder.map((entry, index) => updateRoutine(db, entry.routine.id, { sortOrder: index })),
    );
  }

  function handleDelete(routine: Routine) {
    confirmRoutineDeletion(routine.name, async () => {
      await softDeleteRoutine(db, routine.id);
      loadData();
    });
  }

  async function handleToggleTaskComplete(taskItem: Task) {
    await toggleTaskCompletion(db, taskItem.id);
    reloadWithListSettle();
  }

  async function handleMoveTaskToTomorrow(taskItem: Task) {
    await moveTask(db, taskItem.id, addDaysToDateString(todayDateString(), 1));
    reloadWithListSettle();
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

  // The first-completion-of-day flourish (T041) is a gold underline drawing
  // in and back out beneath the streak numeral, not a scale burst — matching
  // CompletionControl's underline draw-in (docs/DESIGN_SYSTEM.md's Motion
  // section forbids scale/bounce).
  const streakUnderlineScale = streakBurst.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const completedRoutineCount = dueRoutines.filter(
    ({ state }) => state === 'completed' || state === 'exceeded',
  ).length;
  // The day's quiet milestone: every due routine done. The count label
  // cross-fades into a gentle acknowledgement — fade-only, no confetti, per
  // docs/DESIGN_SYSTEM.md's Gamification and Motion sections.
  const allRoutinesDone = dueRoutines.length > 0 && completedRoutineCount === dueRoutines.length;
  const greeting = getGreeting(new Date().getHours(), displayName);
  const formattedDate = DATE_FORMATTER.format(new Date());

  const focusPrompt = focusOfTheDay(todayDateString());

  useEffect(() => {
    if (allRoutinesDone) {
      Animated.timing(allDoneOpacity, {
        toValue: 1,
        duration: reducedMotion ? 0 : 300,
        useNativeDriver: true,
      }).start();
    } else {
      allDoneOpacity.setValue(0);
    }
  }, [allRoutinesDone, allDoneOpacity, reducedMotion]);

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schnellzugriffe"
            onPress={() => setShortcutsOpen(true)}
            hitSlop={spacing.xs}
            style={({ pressed }) => pressed && styles.iconButtonPressed}
            testID="today-shortcuts-button"
          >
            <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Benachrichtigungen"
            onPress={() => setNotificationsOpen(true)}
            hitSlop={spacing.xs}
            style={({ pressed }) => pressed && styles.iconButtonPressed}
            testID="today-notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.headerTopRow}>
          <View style={styles.headerGreetingBlock}>
            <Text style={styles.greeting} testID="today-greeting">
              {greeting}
            </Text>
            <Text style={styles.greetingSubtitle}>Kleine Schritte, sanfter Schwung.</Text>
            <Text style={styles.date} testID="today-date">
              {formattedDate}
            </Text>
          </View>
          {/* Typographic, not a card — the streak numeral itself, set in the
              serif face, is the primary visual per docs/DESIGN_SYSTEM.md's
              Streak and Progress Visualization section. */}
          <View style={styles.streakBlock}>
            <Text style={styles.streakLabel}>Gesamt-Streak</Text>
            {/* The wrap shrinks to the numeral, so the gold underline draws
                in exactly beneath the number — not the whole label block. */}
            <View style={styles.streakValueWrap}>
              <Text style={styles.streakValue} testID="today-app-streak">
                {appStreak?.currentStreak ?? 0}
              </Text>
              <Animated.View
                style={[styles.streakUnderline, { transform: [{ scaleX: streakUnderlineScale }] }]}
              />
            </View>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Heutige Routinen</Text>
            {allRoutinesDone ? (
              <Animated.Text
                style={[styles.progressCount, styles.progressAllDone, { opacity: allDoneOpacity }]}
                testID="today-routine-progress"
              >
                Alle erledigt ✓
              </Animated.Text>
            ) : (
              <Text style={styles.progressCount} testID="today-routine-progress">
                {completedRoutineCount} von {dueRoutines.length} erledigt
              </Text>
            )}
          </View>
          <ProgressBar
            value={dueRoutines.length === 0 ? 0 : completedRoutineCount / dueRoutines.length}
            testID="today-routine-progress-bar"
          />
        </View>
      </View>

      <FocusOfTheDayCard prompt={focusPrompt} testID="today-focus-of-the-day" />

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
              {/* Long-press a card to drag it into a new order (the same
                  gesture as the Routines screen); a plain tap still opens
                  the actions sheet. */}
              <ReorderableList
                data={dueRoutines}
                keyExtractor={(entry) => entry.routine.id}
                onReorder={handleReorderRoutines}
                testID="today-routines-list"
                renderItem={(entry) => {
                  const { routine, state } = entry;
                  const index = dueRoutines.indexOf(entry);
                  const category = routine.categoryId
                    ? categoryById.get(routine.categoryId)
                    : undefined;
                  return (
                    <View style={index > 0 && styles.reorderRowSpacing}>
                      <RoutineCard
                        testID={`routine-card-${routine.id}`}
                        routine={routine}
                        category={category}
                        streak={routineStreaks[routine.id]?.currentStreak ?? 0}
                        state={state}
                        mountDelayMs={mountStaggerDelayMs(index)}
                        onComplete={async () => {
                          maybeStartFirstCompletionOfDayBurst(todayDateString());
                          const result = await completeRoutineOccurrence(
                            db,
                            routine.id,
                            todayDateString(),
                          );
                          reloadWithListSettle();
                          return result.leveledUp;
                        }}
                        onExceed={async () => {
                          maybeStartFirstCompletionOfDayBurst(todayDateString());
                          const result = await exceedRoutineOccurrence(
                            db,
                            routine.id,
                            todayDateString(),
                          );
                          reloadWithListSettle();
                          return result.leveledUp;
                        }}
                        onUndo={() =>
                          undoRoutineCompletion(db, routine.id, todayDateString()).then(
                            reloadWithListSettle,
                          )
                        }
                        onOpenDetail={() => router.push(`/routine/${routine.id}`)}
                        onMoveToTomorrow={() => {
                          const today = todayDateString();
                          return moveRoutineOccurrence(
                            db,
                            routine.id,
                            today,
                            addDaysToDateString(today, 1),
                          ).then(reloadWithListSettle);
                        }}
                        onSkip={() =>
                          skipRoutineOccurrence(db, routine.id, todayDateString()).then(
                            reloadWithListSettle,
                          )
                        }
                        onEdit={() => router.push(`/routine/${routine.id}/edit`)}
                        onPause={() =>
                          pauseRoutine(db, routine.id, todayDateString()).then(loadData)
                        }
                        onDelete={() => handleDelete(routine)}
                      />
                    </View>
                  );
                }}
              />
            </View>
          )}

          {todayTasks.length > 0 && (
            <View testID="today-section-tasks">
              <Text style={styles.sectionTitle}>Aufgaben</Text>
              <View style={styles.list}>
                {todayTasks.map((taskItem, index) => {
                  const category = taskItem.categoryId
                    ? categoryById.get(taskItem.categoryId)
                    : undefined;
                  return (
                    <TaskCard
                      key={taskItem.id}
                      testID={`today-task-${taskItem.id}`}
                      task={taskItem}
                      category={category}
                      mountDelayMs={mountStaggerDelayMs(index)}
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
                {laterTasks.map((taskItem, index) => {
                  const category = taskItem.categoryId
                    ? categoryById.get(taskItem.categoryId)
                    : undefined;
                  return (
                    <TaskCard
                      key={taskItem.id}
                      testID={`today-task-${taskItem.id}`}
                      task={taskItem}
                      category={category}
                      mountDelayMs={mountStaggerDelayMs(index)}
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

    <Sheet
      visible={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
      testID="today-shortcuts-sheet"
    >
      <View style={styles.menu}>
        <Button
          label="Kategorien verwalten"
          onPress={() => {
            setShortcutsOpen(false);
            router.push('/category');
          }}
          testID="today-shortcuts-categories"
        />
        <Button
          label="Me"
          variant="secondary"
          onPress={() => {
            setShortcutsOpen(false);
            router.push('/(tabs)/settings');
          }}
          testID="today-shortcuts-me"
        />
      </View>
    </Sheet>

    <Sheet
      visible={notificationsOpen}
      onClose={() => setNotificationsOpen(false)}
      testID="today-notifications-sheet"
    >
      <View style={styles.menu}>
        <Text style={styles.body}>Benachrichtigungen sind noch nicht verfügbar.</Text>
        <Button label="Schließen" onPress={() => setNotificationsOpen(false)} />
      </View>
    </Sheet>
    </>
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
    // Even, generous rhythm between the header, the Focus card, and the
    // section list so each reads as its own calm block — the reading order
    // (greeting → progress → focus → routines → tasks) is carried by
    // whitespace, not dividers (docs/DESIGN_SYSTEM.md's Whitespace and Rhythm).
    gap: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButtonPressed: {
    opacity: pressedOpacity,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerGreetingBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  greeting: {
    fontFamily: typography.title.fontFamily,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  greetingSubtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  date: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  streakBlock: {
    alignItems: 'flex-end',
  },
  streakValueWrap: {
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.textSecondary,
  },
  streakValue: {
    fontFamily: typography.streak.fontFamily,
    fontSize: typography.streak.fontSize,
    lineHeight: typography.streak.lineHeight,
    fontWeight: typography.streak.fontWeight,
    color: colors.textPrimary,
  },
  streakUnderline: {
    marginTop: spacing.xs,
    width: '100%',
    height: 2,
    backgroundColor: colors.accent,
    transformOrigin: 'left',
  },
  progressBlock: {
    gap: spacing.xs,
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
  progressAllDone: {
    color: colors.accent,
    fontWeight: typography.label.fontWeight,
  },
  sections: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  // ReorderableList lays rows out itself (no gap support), so every row
  // after the first carries the list rhythm as a top margin — part of the
  // constant row pitch its drag math measures.
  reorderRowSpacing: {
    marginTop: spacing.md,
  },
  menu: {
    gap: spacing.sm,
  },
  body: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
});
