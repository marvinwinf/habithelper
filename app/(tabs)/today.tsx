import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
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
import {
  completeRoutineOccurrence,
  exceedRoutineOccurrence,
  moveRoutineOccurrence,
  pauseRoutine,
  skipRoutineOccurrence,
} from '../../src/services/routineService';
import { addDaysToDateString, todayDateString } from '../../src/domain/dates';
import { classifyOccurrence, type OccurrenceState } from '../../src/domain/routines/completion';
import { scheduleFromRoutineRow } from '../../src/domain/routines/schedule';
import { isFirstCompletionOfDay } from '../../src/domain/streaks/appStreak';
import { confirmRoutineDeletion } from '../../src/ui/alerts';
import { triggerFirstCompletionOfDayHaptic } from '../../src/ui/animation/haptics';
import { useStreakBurst } from '../../src/ui/animation/useStreakBurst';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { RoutineCard, type RoutineCardOccurrenceState } from '../../src/ui/components/RoutineCard';
import { colors, spacing, typography } from '../../src/ui/theme';

// TODO(T048/T049): greeting, date, and daily routine progress, plus the
// combined routines/tasks/for-later ordering, land in Phase 8; this is the
// routines-only slice from T033, with just the overall app streak (T040)
// added to the header so far.

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
  const streakBurst = useStreakBurst();

  const loadData = useCallback(() => {
    listRoutines(db).then((allRoutines) => setRoutines(allRoutines.filter((r) => !r.isPaused)));
    listCategories(db).then(setCategories);
    getAppStreakCache(db).then(setAppStreak);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  function handleDelete(routine: Routine) {
    confirmRoutineDeletion(routine.name, async () => {
      await softDeleteRoutine(db, routine.id);
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.header, { transform: [{ scale: streakScale }] }]}>
        <Text style={styles.appStreak} testID="today-app-streak">
          Streak: {appStreak?.currentStreak ?? 0}
        </Text>
      </Animated.View>

      {dueRoutines.length === 0 ? (
        <EmptyState
          title="Für heute nichts geplant"
          message="Erstelle eine Routine im Tab „Routinen“, um loszulegen."
        />
      ) : (
        <View style={styles.list}>
          {dueRoutines.map(({ routine, state }) => {
            const category = routine.categoryId ? categoryById.get(routine.categoryId) : undefined;
            return (
              <RoutineCard
                key={routine.id}
                testID={`routine-card-${routine.id}`}
                routine={routine}
                category={category}
                streak={0}
                state={state}
                onComplete={async () => {
                  maybeStartFirstCompletionOfDayBurst(todayDateString());
                  const result = await completeRoutineOccurrence(db, routine.id, todayDateString());
                  loadData();
                  return result.leveledUp;
                }}
                onExceed={async () => {
                  maybeStartFirstCompletionOfDayBurst(todayDateString());
                  const result = await exceedRoutineOccurrence(db, routine.id, todayDateString());
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
  },
  header: {
    marginBottom: spacing.md,
  },
  // Subtle per docs/SCREEN_SPECIFICATIONS.md's "Subtle overall app streak" —
  // small, muted text, not a visually dominant element.
  appStreak: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.sm,
  },
});
