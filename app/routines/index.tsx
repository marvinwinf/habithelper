import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  listRoutineStateCaches,
  type RoutineStateCache,
} from '../../src/data/repositories/routineStateCacheRepository';
import { pauseRoutine, reactivateRoutine } from '../../src/services/routineService';
import { todayDateString } from '../../src/domain/dates';
import { scheduleFromRoutineRow } from '../../src/domain/routines/schedule';
import { scheduleLabel } from '../../src/domain/routines/scheduleLabel';
import { confirmRoutineDeletion } from '../../src/ui/alerts';
import { categoryIconName } from '../../src/ui/categoryIcons';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { IconBadge } from '../../src/ui/components/IconBadge';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { ReorderableList } from '../../src/ui/components/ReorderableList';
import { Sheet } from '../../src/ui/components/Sheet';
import { colors, pressedOpacity, radius, spacing, typography } from '../../src/ui/theme';

type RoutinesTab = 'active' | 'paused';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [routineStreaks, setRoutineStreaks] = useState<Record<string, RoutineStateCache>>({});
  const [tab, setTab] = useState<RoutinesTab>('active');
  const [menuRoutineId, setMenuRoutineId] = useState<string | null>(null);

  const loadRoutines = useCallback(() => {
    listRoutines(db).then(setRoutines);
  }, []);

  // Reload on every focus: this tab stays mounted while create/edit screens
  // are pushed over it, so a mount-only effect would never show a routine
  // created or renamed elsewhere until an app restart.
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
      listCategories(db).then(setCategories);
      listRoutineStateCaches(db).then((rows) =>
        setRoutineStreaks(Object.fromEntries(rows.map((row) => [row.routineId, row]))),
      );
    }, [loadRoutines]),
  );

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const activeRoutines = useMemo(
    () => routines.filter((r) => !r.isPaused).sort((a, b) => a.sortOrder - b.sortOrder),
    [routines],
  );
  const pausedRoutines = useMemo(
    () => routines.filter((r) => r.isPaused).sort((a, b) => a.sortOrder - b.sortOrder),
    [routines],
  );
  const visibleRoutines = tab === 'active' ? activeRoutines : pausedRoutines;
  const menuRoutine = routines.find((r) => r.id === menuRoutineId);

  async function handleReorder(newOrder: Routine[]) {
    const reindexed = newOrder.map((routine, index) => ({ ...routine, sortOrder: index }));
    const reindexedIds = new Set(reindexed.map((r) => r.id));
    setRoutines((prev) => [...prev.filter((r) => !reindexedIds.has(r.id)), ...reindexed]);
    await Promise.all(reindexed.map((r) => updateRoutine(db, r.id, { sortOrder: r.sortOrder })));
  }

  function closeMenu() {
    setMenuRoutineId(null);
  }

  function handleOpenDetail(routine: Routine) {
    closeMenu();
    router.push(`/routine/${routine.id}`);
  }

  function handleEdit(routine: Routine) {
    closeMenu();
    router.push(`/routine/${routine.id}/edit`);
  }

  async function handleTogglePause(routine: Routine) {
    closeMenu();
    if (routine.isPaused) {
      await reactivateRoutine(db, routine.id, todayDateString());
    } else {
      await pauseRoutine(db, routine.id, todayDateString());
    }
    loadRoutines();
  }

  function handleDelete(routine: Routine) {
    closeMenu();
    confirmRoutineDeletion(routine.name, async () => {
      await softDeleteRoutine(db, routine.id);
      loadRoutines();
    });
  }

  function renderRoutine(item: Routine) {
    const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
    const subtitle = [item.timeOfDay, scheduleLabel(scheduleFromRoutineRow(item))]
      .filter(Boolean)
      .join(' · ');
    const streak = routineStreaks[item.id]?.currentStreak ?? 0;

    return (
      // The row has no inline overflow menu — tapping it opens the actions
      // sheet (docs/DESIGN_SYSTEM.md's List Row Actions). Long-press still
      // starts the drag-to-reorder gesture handled by ReorderableList.
      <Pressable
        onPress={() => setMenuRoutineId(item.id)}
        accessibilityRole="button"
        style={({ pressed }) => pressed && styles.rowPressed}
        testID={`routine-row-${item.id}`}
      >
        <Card style={styles.row}>
          <IconBadge name={categoryIconName(category?.icon)} />
          <View style={styles.rowMain}>
            <Text style={styles.routineName} numberOfLines={1}>
              {item.name}
            </Text>
            {subtitle.length > 0 && <Text style={styles.subtitle}>{subtitle}</Text>}
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={typography.caption.fontSize} color={colors.accent} />
              <Text style={styles.streak} testID={`routine-streak-${item.id}`}>
                Streak {streak}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Routinen</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('active')}
          testID="routines-tab-active"
          style={({ pressed }) => [
            styles.tab,
            tab === 'active' && styles.tabSelected,
            pressed && styles.tabPressed,
          ]}
        >
          <Text style={[styles.tabLabel, tab === 'active' && styles.tabLabelSelected]}>Aktiv</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('paused')}
          testID="routines-tab-paused"
          style={({ pressed }) => [
            styles.tab,
            tab === 'paused' && styles.tabSelected,
            pressed && styles.tabPressed,
          ]}
        >
          <Text style={[styles.tabLabel, tab === 'paused' && styles.tabLabelSelected]}>
            Pausiert
          </Text>
        </Pressable>
      </View>

      {visibleRoutines.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'Noch keine aktiven Routinen' : 'Keine pausierten Routinen'}
          message={
            tab === 'active'
              ? 'Tippe unten rechts auf „+“, um loszulegen.'
              : 'Pausierte Routinen erscheinen hier.'
          }
        />
      ) : (
        // gesture-handler's ScrollView cooperates with the rows' long-press
        // drag gesture; without a scroll container, lists taller than the
        // screen were simply cut off and unreachable.
        <ScrollView contentContainerStyle={styles.listContent}>
          <ReorderableList
            data={visibleRoutines}
            keyExtractor={(item) => item.id}
            renderItem={renderRoutine}
            onReorder={handleReorder}
            testID="routines-list"
          />
        </ScrollView>
      )}

      <Sheet visible={menuRoutineId !== null} onClose={closeMenu} testID="routine-menu-sheet">
        {menuRoutine && (
          <View style={styles.menu}>
            <Button
              label="Statistik"
              onPress={() => handleOpenDetail(menuRoutine)}
              testID="routine-menu-detail"
            />
            <Button
              label="Bearbeiten"
              variant="secondary"
              onPress={() => handleEdit(menuRoutine)}
              testID="routine-menu-edit"
            />
            <Button
              label={menuRoutine.isPaused ? 'Reaktivieren' : 'Pausieren'}
              variant="secondary"
              onPress={() => handleTogglePause(menuRoutine)}
              testID="routine-menu-toggle-pause"
            />
            <Button
              label="Löschen"
              variant="destructive"
              onPress={() => handleDelete(menuRoutine)}
              testID="routine-menu-delete"
            />
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  // Soft pill-filled segmented control, matching the bottom nav's tab pill,
  // per docs/DESIGN_SYSTEM.md's Navigation section.
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  tabSelected: {
    backgroundColor: colors.surfaceMuted,
  },
  tabPressed: {
    opacity: pressedOpacity,
  },
  tabLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  tabLabelSelected: {
    color: colors.textPrimary,
  },
  // Rows must stay uniform in height (single-line name enforced above) —
  // ReorderableList measures their pitch and assumes it is constant.
  row: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowPressed: {
    opacity: pressedOpacity,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
  },
  routineName: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  streak: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.textSecondary,
  },
  menu: {
    gap: spacing.sm,
  },
});
