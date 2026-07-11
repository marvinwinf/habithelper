import {
  buildCategoryBreakdown,
  buildDailyCompletionSeries,
  buildProgressStatTiles,
} from '../overview';
import type { RoutineWeekRow } from '../../routines/weekOverview';

describe('buildProgressStatTiles', () => {
  it('computes the completion rate across due days only, ignoring not_due', () => {
    const weekRows: RoutineWeekRow[] = [
      {
        routineId: 'r1',
        routineName: 'Laufen',
        days: ['completed', 'missed', 'not_due', 'not_due', 'not_due', 'not_due', 'not_due'],
      },
    ];

    const stats = buildProgressStatTiles(weekRows, { r1: 12 });

    expect(stats.completionRatePercent).toBe(50); // 1 completed of 2 due days
    expect(stats.completionsThisWeek).toBe(1);
  });

  it('returns a 0% rate when nothing was due', () => {
    const weekRows: RoutineWeekRow[] = [
      { routineId: 'r1', routineName: 'Laufen', days: Array(7).fill('not_due') },
    ];

    expect(buildProgressStatTiles(weekRows, {}).completionRatePercent).toBe(0);
  });

  it('reports the active routine count and the longest best streak', () => {
    const weekRows: RoutineWeekRow[] = [
      { routineId: 'r1', routineName: 'Laufen', days: Array(7).fill('not_due') },
      { routineId: 'r2', routineName: 'Lesen', days: Array(7).fill('not_due') },
    ];

    const stats = buildProgressStatTiles(weekRows, { r1: 5, r2: 20 });

    expect(stats.activeRoutineCount).toBe(2);
    expect(stats.longestStreak).toBe(20);
  });

  it('returns a longest streak of 0 when there are no state caches', () => {
    expect(buildProgressStatTiles([], {}).longestStreak).toBe(0);
  });
});

describe('buildDailyCompletionSeries', () => {
  const weekDates = [
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
    '2026-07-11',
    '2026-07-12',
  ];

  it('computes a per-day rate across routines', () => {
    const weekRows: RoutineWeekRow[] = [
      { routineId: 'r1', routineName: 'A', days: ['completed', 'missed', 'not_due', 'not_due', 'not_due', 'not_due', 'not_due'] },
      { routineId: 'r2', routineName: 'B', days: ['completed', 'completed', 'not_due', 'not_due', 'not_due', 'not_due', 'not_due'] },
    ];

    const series = buildDailyCompletionSeries(weekRows, weekDates);

    expect(series[0]).toEqual({ date: '2026-07-06', rate: 1 }); // both completed
    expect(series[1]).toEqual({ date: '2026-07-07', rate: 0.5 }); // 1 of 2 completed
    expect(series[2].rate).toBe(0); // nothing due
  });

  it('returns a rate of 0 for every day when there are no routines', () => {
    const series = buildDailyCompletionSeries([], weekDates);
    expect(series.every((point) => point.rate === 0)).toBe(true);
    expect(series).toHaveLength(7);
  });
});

describe('buildCategoryBreakdown', () => {
  const palette = ['#111', '#222', '#333'];

  it('groups routines by category name', () => {
    const categoryById = new Map([
      ['cat-health', { name: 'Gesundheit' }],
      ['cat-work', { name: 'Arbeit' }],
    ]);
    const routines = [
      { categoryId: 'cat-health' },
      { categoryId: 'cat-health' },
      { categoryId: 'cat-work' },
    ];

    const segments = buildCategoryBreakdown(routines, categoryById, palette);

    expect(segments).toEqual([
      { label: 'Gesundheit', value: 2, color: '#111' },
      { label: 'Arbeit', value: 1, color: '#222' },
    ]);
  });

  it('groups uncategorized routines under a shared label', () => {
    const segments = buildCategoryBreakdown([{ categoryId: null }, { categoryId: null }], new Map(), palette);

    expect(segments).toEqual([{ label: 'Ohne Kategorie', value: 2, color: '#111' }]);
  });

  it('cycles through the palette when there are more categories than colors', () => {
    const categoryById = new Map([
      ['a', { name: 'A' }],
      ['b', { name: 'B' }],
      ['c', { name: 'C' }],
      ['d', { name: 'D' }],
    ]);
    const routines = [{ categoryId: 'a' }, { categoryId: 'b' }, { categoryId: 'c' }, { categoryId: 'd' }];

    const segments = buildCategoryBreakdown(routines, categoryById, palette);

    expect(segments[3].color).toBe(palette[0]);
  });

  it('returns an empty list for no routines', () => {
    expect(buildCategoryBreakdown([], new Map(), palette)).toEqual([]);
  });
});
