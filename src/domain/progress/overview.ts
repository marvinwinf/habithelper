// Pure derivations for the Progress screen (docs/SCREEN_SPECIFICATIONS.md's
// Progress Screen section) — every value here is computed from data the app
// already persists (routine_state_cache, routine_event via weekOverview's
// per-day dot states, category); nothing new is tracked or stored.

import type { RoutineWeekRow } from '../routines/weekOverview';

export interface ProgressStatTiles {
  /** This week's completion rate across all due occurrences, 0–100. */
  completionRatePercent: number;
  /** The best streak across all active routines' state caches. */
  longestStreak: number;
  activeRoutineCount: number;
  completionsThisWeek: number;
}

/**
 * Stat tiles derived from the same per-routine week rows the Plan screen
 * renders, plus each routine's best streak. The mockup's "Total time" tile
 * has no backing field in the data model (no per-completion duration is
 * tracked) and is deliberately not reproduced here.
 */
export function buildProgressStatTiles(
  weekRows: readonly RoutineWeekRow[],
  bestStreakByRoutineId: Readonly<Record<string, number>>,
): ProgressStatTiles {
  const allDayStates = weekRows.flatMap((row) => row.days);
  const dueDayStates = allDayStates.filter((state) => state !== 'not_due');
  const completedDayStates = dueDayStates.filter((state) => state === 'completed');

  const longestStreak = Object.values(bestStreakByRoutineId).reduce(
    (max, value) => Math.max(max, value),
    0,
  );

  return {
    completionRatePercent:
      dueDayStates.length === 0
        ? 0
        : Math.round((completedDayStates.length / dueDayStates.length) * 100),
    longestStreak,
    activeRoutineCount: weekRows.length,
    completionsThisWeek: completedDayStates.length,
  };
}

export interface DailyCompletionPoint {
  date: string;
  /** 0–1; 0 when no routine was due that day. */
  rate: number;
}

/** One completion-rate point per day of the week, for the "completion over time" chart. */
export function buildDailyCompletionSeries(
  weekRows: readonly RoutineWeekRow[],
  weekDates: readonly string[],
): DailyCompletionPoint[] {
  return weekDates.map((date, dayIndex) => {
    const dayStates = weekRows.map((row) => row.days[dayIndex]);
    const due = dayStates.filter((state) => state !== 'not_due');
    const completed = due.filter((state) => state === 'completed');
    return { date, rate: due.length === 0 ? 0 : completed.length / due.length };
  });
}

export interface CategoryBreakdownSegment {
  label: string;
  value: number;
  color: string;
}

export interface RoutineForBreakdown {
  readonly categoryId: string | null;
}

export interface CategoryForBreakdown {
  readonly name: string;
}

const UNCATEGORIZED_KEY = '__none__';
const UNCATEGORIZED_LABEL = 'Ohne Kategorie';

/**
 * Groups active routines by category for the habit-breakdown donut, cycling
 * through `palette` for segment colors (src/ui/theme/chartColors.ts).
 */
export function buildCategoryBreakdown(
  routines: readonly RoutineForBreakdown[],
  categoryById: ReadonlyMap<string, CategoryForBreakdown>,
  palette: readonly string[],
): CategoryBreakdownSegment[] {
  const counts = new Map<string, number>();
  for (const routine of routines) {
    const key = routine.categoryId ?? UNCATEGORIZED_KEY;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([key, value], index) => ({
    label: key === UNCATEGORIZED_KEY ? UNCATEGORIZED_LABEL : (categoryById.get(key)?.name ?? UNCATEGORIZED_LABEL),
    value,
    color: palette[index % palette.length],
  }));
}
