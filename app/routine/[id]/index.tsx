import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import {
  pauseRoutine,
  reactivateRoutine,
  retroactivelyCompleteOccurrence,
} from '../../../src/services/routineService';
import { reconcileRoutine } from '../../../src/services/reconciliationService';
import { toLocalDateString, todayDateString } from '../../../src/domain/dates';
import { getCalendarDayState, listMonthDates } from '../../../src/domain/routines/calendar';
import { scheduleFromRoutineRow } from '../../../src/domain/routines/schedule';
import { LEVEL_SEGMENT_SIZE } from '../../../src/domain/streaks/replay';
import { levelName } from '../../../src/domain/streaks/levelName';
import {
  completionsIntoCurrentLevel,
  remainingCompletionsToNextLevel,
} from '../../../src/domain/streaks/levelProgress';
import { triggerLevelMilestoneHaptic } from '../../../src/ui/animation/haptics';
import { useLevelUpAnimation } from '../../../src/ui/animation/useLevelUpAnimation';
import { Card } from '../../../src/ui/components/Card';
import { CategoryBadge } from '../../../src/ui/components/CategoryBadge';
import { IconBadge } from '../../../src/ui/components/IconBadge';
import { ProgressBar } from '../../../src/ui/components/ProgressBar';
import { RoutineCalendar, type CalendarDay } from '../../../src/ui/components/RoutineCalendar';
import { ScreenHeader } from '../../../src/ui/components/ScreenHeader';
import { StatTile } from '../../../src/ui/components/StatTile';
import { colors, radius, spacing, typography } from '../../../src/ui/theme';
import { getCategoryColorVariant } from '../../../src/ui/theme/categoryVariant';
import { categoryIconName } from '../../../src/ui/categoryIcons';

// Same distinguishing treatment as RoutineCard's level-up milestone (T042):
// scales the whole stats card, not just a single number, so it reads as
// visually distinct from ordinary stat updates.
const LEVEL_UP_CARD_SCALE_PEAK = 1.05;

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
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [cache, setCache] = useState<RoutineStateCache | undefined>(undefined);
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const levelUpAnimation = useLevelUpAnimation();
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
          const result = await retroactivelyCompleteOccurrence(db, id, day.date);
          loadData();
          if (result.leveledUp) {
            levelUpAnimation.start();
            triggerLevelMilestoneHaptic();
          }
        },
      },
    ]);
  }

  const statsCardScale = levelUpAnimation.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, LEVEL_UP_CARD_SCALE_PEAK],
  });

  if (!routine) {
    return <View style={styles.screen} testID="routine-detail-loading" />;
  }

  const variant = category
    ? getCategoryColorVariant(category.baseColor, routine.colorVariantSeed)
    : undefined;
  const totalCompletions = cache?.totalCompletions ?? 0;
  const levelRank = cache?.levelRank ?? 0;
  // Displayed level numbers are 1-based (mockup: "Im Aufbau, Level 2");
  // level_rank stays the 0-based segment index (docs/ROUTINE_RULES.md).
  const levelNumber = levelRank + 1;

  async function handleTogglePause() {
    if (!routine) {
      return;
    }
    if (routine.isPaused) {
      await reactivateRoutine(db, id, todayDateString());
    } else {
      await pauseRoutine(db, id, todayDateString());
    }
    loadData();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={routine.name} testID="routine-detail-header" />

      <Animated.View style={{ transform: [{ scale: statsCardScale }] }}>
        <Card
          style={[
            styles.heroCard,
            variant && { backgroundColor: variant.background, borderColor: 'transparent' },
          ]}
        >
          <View style={styles.heroTopRow}>
            <IconBadge
              name={categoryIconName(category?.icon)}
              size="lg"
              backgroundColor={colors.surface}
              iconColor={variant?.accent ?? colors.textSecondary}
            />
            <View style={styles.heroTopMain}>
              {category && (
                <CategoryBadge
                  label={category.name}
                  baseColor={category.baseColor}
                  colorVariantSeed={routine.colorVariantSeed}
                  icon={category.icon}
                />
              )}
              <View style={styles.heroMetaRow}>
                <View style={styles.heroStreakBlock}>
                  <Text style={styles.heroMetaLabel}>Streak</Text>
                  <View style={styles.heroStreakRow}>
                    <Ionicons
                      name="flame"
                      size={typography.body.fontSize}
                      color={colors.streakFlame}
                    />
                    <Text style={styles.heroMetaValue} testID="routine-detail-streak">
                      {cache?.currentStreak ?? 0} Tage
                    </Text>
                  </View>
                </View>
                <View style={styles.heroLevelBlock}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeNumber}>{levelNumber}</Text>
                  </View>
                  <View>
                    <Text style={styles.heroMetaValue} testID="routine-detail-level">
                      {levelName(levelRank)}
                    </Text>
                    <Text style={styles.heroMetaLabel}>Level {levelNumber}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroProgressRow}>
            <Text style={styles.heroMetaLabel} testID="routine-detail-remaining">
              Noch {remainingCompletionsToNextLevel(totalCompletions)} Abschlüsse bis Level{' '}
              {levelNumber + 1}
            </Text>
            <Text style={styles.heroMetaLabel} testID="routine-detail-progress-count">
              {completionsIntoCurrentLevel(totalCompletions)} / {LEVEL_SEGMENT_SIZE}
            </Text>
          </View>
          <ProgressBar
            value={completionsIntoCurrentLevel(totalCompletions) / LEVEL_SEGMENT_SIZE}
            fillColor={variant?.accent}
            trackColor={colors.surface}
            testID="routine-detail-level-progress"
          />
          {(cache?.currentStreak ?? 0) < LEVEL_SEGMENT_SIZE && (
            <Text style={styles.heroMetaLabel} testID="routine-detail-jokers">
              Joker: {cache?.jokerInventory ?? 0}/2
            </Text>
          )}
        </Card>
      </Animated.View>

      <View style={styles.tileRow}>
        <StatTile
          icon="flame"
          iconColor={colors.streakFlame}
          label="Streak"
          value={`${cache?.currentStreak ?? 0} Tage`}
        />
        <StatTile
          icon="trophy"
          iconColor={colors.streakFlame}
          label="Rekord"
          value={`${cache?.bestStreak ?? 0} Tage`}
          testID="routine-detail-best-streak"
        />
        <StatTile
          icon="repeat"
          iconColor={colors.accent}
          label="Wiederholungen"
          value={`${totalCompletions}`}
          testID="routine-detail-total-completions"
        />
      </View>

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

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/routine/${id}/edit`)}
          style={[styles.actionButton, styles.editButton]}
          testID="routine-detail-edit"
        >
          <Ionicons name="pencil" size={typography.body.fontSize} color={colors.accent} />
          <Text style={[styles.actionLabel, styles.editLabel]}>Bearbeiten</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleTogglePause}
          style={[styles.actionButton, styles.pauseButton]}
          testID="routine-detail-pause"
        >
          <Ionicons
            name={routine.isPaused ? 'play' : 'pause'}
            size={typography.body.fontSize}
            color={colors.streakFlame}
          />
          <Text style={[styles.actionLabel, styles.pauseLabel]}>
            {routine.isPaused ? 'Reaktivieren' : 'Pausieren'}
          </Text>
        </Pressable>
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
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroTopMain: {
    flex: 1,
    gap: spacing.xs,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStreakBlock: {
    gap: spacing.xxs,
  },
  heroStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  heroLevelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeNumber: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  heroMetaLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  heroMetaValue: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  heroProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  editButton: {
    borderColor: colors.accent,
  },
  pauseButton: {
    borderColor: colors.streakFlame,
  },
  actionLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
  },
  editLabel: {
    color: colors.accent,
  },
  pauseLabel: {
    color: colors.streakFlame,
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
