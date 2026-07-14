import { render, screen } from '@testing-library/react-native';

import PlanScreen from '../plan';
import { listRoutines } from '../../../src/data/repositories/routineRepository';
import { listRoutineEventsInRange } from '../../../src/data/repositories/routineEventRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/routineRepository', () => ({
  listRoutines: jest.fn(),
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
  cue: null,
  pairing: null,
  reward: null,
  allowConsciousSkip: false,
  isPaused: false,
  sortOrder: 0,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listRoutineEventsInRange as jest.Mock).mockResolvedValue([]);
  });

  it('shows the week day strip and manage-links', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await render(<PlanScreen />);

    expect(await screen.findByTestId('plan-week-strip')).toBeTruthy();
    expect(screen.getByTestId('plan-manage-routines-link')).toBeTruthy();
    expect(screen.getByTestId('plan-manage-tasks-link')).toBeTruthy();
  });

  it('shows an empty state when there are no active routines', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);

    await render(<PlanScreen />);

    expect(await screen.findByText('Noch keine aktiven Routinen')).toBeTruthy();
  });

  it('shows one week row per active routine, excluding paused ones', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([
      dailyRoutine,
      { ...dailyRoutine, id: 'routine-paused', name: 'Pausiert', isPaused: true },
    ]);

    await render(<PlanScreen />);

    expect(await screen.findByTestId('plan-week-row-routine-1')).toBeTruthy();
    expect(screen.queryByText('Pausiert')).toBeNull();
  });
});
