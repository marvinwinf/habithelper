import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import { listRoutines, softDeleteRoutine, type Routine } from '../../src/data/repositories/routineRepository';
import { listRoutineEvents, type RoutineEvent } from '../../src/data/repositories/routineEventRepository';
import {
  completeRoutineOccurrence,
  exceedRoutineOccurrence,
  moveRoutineOccurrence,
  pauseRoutine,
  skipRoutineOccurrence,
} from '../../src/services/routineService';
import { classifyOccurrence, type OccurrenceState } from '../../src/domain/routines/completion';
import { scheduleFromRoutineRow } from '../../src/domain/routines/schedule';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { RoutineCard, type RoutineCardOccurrenceState } from '../../src/ui/components/RoutineCard';
import { colors, spacing } from '../../src/ui/theme';

interface DueRoutine {
  routine: Routine;
  state: RoutineCardOccurrenceState;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isCardState(state: OccurrenceState): state is RoutineCardOccurrenceState {
  return state === 'pending' || state === 'completed' || state === 'exceeded' || state === 'skipped';
}

export default function TodayScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventsByRoutineId, setEventsByRoutineId] = useState<Record<string, RoutineEvent[]>>({});

  const loadData = useCallback(() => {
    listRoutines(db).then((allRoutines) => setRoutines(allRoutines.filter((r) => !r.isPaused)));
    listCategories(db).then(setCategories);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separate from the effect above: this one re-fetches events whenever the
  // active routine list changes (including after loadData() re-runs post-
  // action). Each routine's events resolve independently rather than via a
  // combined Promise.all, so one slow fetch doesn't hold up the others.
  useEffect(() => {
    routines.forEach((r) => {
      listRoutineEvents(db, r.id).then((events) => {
        setEventsByRoutineId((prev) => ({ ...prev, [r.id]: events }));
      });
    });
  }, [routines]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const dueRoutines = useMemo<DueRoutine[]>(() => {
    const today = todayDate();
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
    Alert.alert('Routine löschen?', `„${routine.name}“ wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await softDeleteRoutine(db, routine.id);
          loadData();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {dueRoutines.length === 0 ? (
        <EmptyState
          title="Für heute nichts geplant"
          message="Erstelle eine Routine über das Plus-Symbol, um loszulegen."
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
                onComplete={() => completeRoutineOccurrence(db, routine.id, todayDate()).then(loadData)}
                onExceed={() => exceedRoutineOccurrence(db, routine.id, todayDate()).then(loadData)}
                onOpenDetail={() => router.push(`/routine/${routine.id}`)}
                onMoveToTomorrow={() =>
                  moveRoutineOccurrence(db, routine.id, todayDate(), tomorrowDate()).then(loadData)
                }
                onSkip={() => skipRoutineOccurrence(db, routine.id, todayDate()).then(loadData)}
                onEdit={() => router.push(`/routine/${routine.id}/edit`)}
                onPause={() => pauseRoutine(db, routine.id, todayDate()).then(loadData)}
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
  list: {
    gap: spacing.sm,
  },
});
