import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '../../src/data/db/client';
import { listCategories, type Category } from '../../src/data/repositories/categoryRepository';
import {
  listRoutines,
  softDeleteRoutine,
  updateRoutine,
  type Routine,
} from '../../src/data/repositories/routineRepository';
import { pauseRoutine, reactivateRoutine } from '../../src/services/routineService';
import { todayDateString } from '../../src/domain/dates';
import { confirmRoutineDeletion } from '../../src/ui/alerts';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { CategoryBadge } from '../../src/ui/components/CategoryBadge';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { ReorderableList } from '../../src/ui/components/ReorderableList';
import { Sheet } from '../../src/ui/components/Sheet';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

type RoutinesTab = 'active' | 'paused';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<RoutinesTab>('active');
  const [menuRoutineId, setMenuRoutineId] = useState<string | null>(null);

  const loadRoutines = useCallback(() => {
    listRoutines(db).then(setRoutines);
  }, []);

  useEffect(() => {
    loadRoutines();
    listCategories(db).then(setCategories);
  }, [loadRoutines]);

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
    return (
      <Card style={styles.row} testID={`routine-row-${item.id}`}>
        <View style={styles.rowMain}>
          <Text style={styles.routineName} numberOfLines={1}>
            {item.name}
          </Text>
          {category && (
            <CategoryBadge
              label={category.name}
              baseColor={category.baseColor}
              colorVariantSeed={item.colorVariantSeed}
              icon={category.icon}
            />
          )}
          {/* TODO(T037/T039): replace with the real streak from routine_state_cache once wired. */}
          <Text style={styles.streak} testID={`routine-streak-${item.id}`}>
            Streak: 0
          </Text>
        </View>
        <Button
          label="⋯"
          variant="secondary"
          onPress={() => setMenuRoutineId(item.id)}
          testID={`routine-menu-button-${item.id}`}
        />
      </Card>
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
          style={[styles.tab, tab === 'active' && styles.tabSelected]}
        >
          <Text style={styles.tabLabel}>Aktiv</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('paused')}
          testID="routines-tab-paused"
          style={[styles.tab, tab === 'paused' && styles.tabSelected]}
        >
          <Text style={styles.tabLabel}>Pausiert</Text>
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
        <ReorderableList
          data={visibleRoutines}
          keyExtractor={(item) => item.id}
          renderItem={renderRoutine}
          onReorder={handleReorder}
          testID="routines-list"
        />
      )}

      <Sheet visible={menuRoutineId !== null} onClose={closeMenu} testID="routine-menu-sheet">
        {menuRoutine && (
          <View style={styles.menu}>
            <Button
              label="Bearbeiten"
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
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabLabel: {
    fontSize: typography.body.fontSize,
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
  rowMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  routineName: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
  },
  streak: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  menu: {
    gap: spacing.sm,
  },
});
