import { render, screen } from '@testing-library/react-native';

import ProgressScreen from '../progress';
import { listRoutines } from '../../../src/data/repositories/routineRepository';
import { listCategories } from '../../../src/data/repositories/categoryRepository';
import { getAppStreakCache } from '../../../src/data/repositories/appStreakCacheRepository';
import { listRoutineStateCaches } from '../../../src/data/repositories/routineStateCacheRepository';
import { listRoutineEventsInRange } from '../../../src/data/repositories/routineEventRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/routineRepository', () => ({
  listRoutines: jest.fn(),
}));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/appStreakCacheRepository', () => ({
  getAppStreakCache: jest.fn(),
}));
jest.mock('../../../src/data/repositories/routineStateCacheRepository', () => ({
  listRoutineStateCaches: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/routineEventRepository', () => ({
  listRoutineEventsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
}));

const dailyRoutine = {
  id: 'routine-1',
  name: 'Laufen',
  categoryId: null,
  scheduleType: 'daily' as const,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  reason: null,
  allowConsciousSkip: false,
  isPaused: false,
  sortOrder: 0,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCategories as jest.Mock).mockResolvedValue([]);
    (getAppStreakCache as jest.Mock).mockResolvedValue(undefined);
    (listRoutineStateCaches as jest.Mock).mockResolvedValue([]);
    (listRoutineEventsInRange as jest.Mock).mockResolvedValue([]);
  });

  it('shows an empty state when there are no active routines', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await render(<ProgressScreen />);

    expect(await screen.findByText('Noch keine Daten')).toBeTruthy();
  });

  it('shows the streak hero, stat tiles, and both charts when routines exist', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([dailyRoutine]);
    (getAppStreakCache as jest.Mock).mockResolvedValue({
      id: 'app_streak_cache',
      currentStreak: 7,
      lastIncrementedDate: '2026-07-10',
      reconciledThroughDate: '2026-07-10',
      recalculatedAt: '2026-07-10',
    });

    await render(<ProgressScreen />);

    expect(await screen.findByTestId('progress-streak-hero')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByTestId('progress-stat-active-routines')).toBeTruthy();
    expect(screen.getByTestId('progress-completion-chart')).toBeTruthy();
    expect(screen.getByTestId('progress-category-donut')).toBeTruthy();
  });

  it('shows the active routine count in its stat tile', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([
      dailyRoutine,
      { ...dailyRoutine, id: 'routine-2', name: 'Lesen' },
    ]);

    await render(<ProgressScreen />);

    const tile = await screen.findByTestId('progress-stat-active-routines');
    expect(tile).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
