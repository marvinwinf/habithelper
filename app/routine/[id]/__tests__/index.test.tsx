import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import RoutineDetailScreen from '../index';
import { todayDateString } from '../../../../src/domain/dates';
import { getRoutine } from '../../../../src/data/repositories/routineRepository';
import { listCategories } from '../../../../src/data/repositories/categoryRepository';
import { listRoutineEvents } from '../../../../src/data/repositories/routineEventRepository';
import { getRoutineStateCache } from '../../../../src/data/repositories/routineStateCacheRepository';
import { retroactivelyCompleteOccurrence } from '../../../../src/services/routineService';
import { triggerLevelMilestoneHaptic } from '../../../../src/ui/animation/haptics';

jest.mock('../../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../../src/data/repositories/routineRepository', () => ({
  getRoutine: jest.fn(),
}));
jest.mock('../../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../../src/data/repositories/routineEventRepository', () => ({
  listRoutineEvents: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../../src/data/repositories/routineStateCacheRepository', () => ({
  getRoutineStateCache: jest.fn(),
}));
jest.mock('../../../../src/services/routineService', () => ({
  retroactivelyCompleteOccurrence: jest.fn().mockResolvedValue({
    writtenEvents: [],
    jokerRestored: false,
    requiresFullRecalculation: true,
    leveledUp: false,
  }),
}));
jest.mock('../../../../src/services/reconciliationService', () => ({
  reconcileRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/ui/animation/haptics', () => ({
  triggerLevelMilestoneHaptic: jest.fn(),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'routine-1' }),
}));

const TODAY = todayDateString();

// The 15th of the previous month: always fully elapsed, so its state is
// deterministic regardless of which day of the current month "today" is.
const PREV_MONTH_15TH = (() => {
  const [year, month] = TODAY.split('-').map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`;
})();

const routine = {
  id: 'routine-1',
  name: 'Laufen',
  categoryId: null,
  scheduleType: 'daily' as const,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  reason: 'Gesund bleiben',
  allowConsciousSkip: false,
  isPaused: false,
  sortOrder: 0,
  colorVariantSeed: 0,
  // Well before any date the tests touch, so no day is "before start".
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: 'x',
  deletedAt: null,
};

function buildCache(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    routineId: routine.id,
    currentStreak: 0,
    bestStreak: 0,
    totalCompletions: 0,
    levelRank: 0,
    jokerInventory: 0,
    jokerProgress: 0,
    consecutiveMissedAfter66: 0,
    reconciledThroughDate: '2020-01-01',
    recalculatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RoutineDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRoutine as jest.Mock).mockResolvedValue(routine);
    (listCategories as jest.Mock).mockResolvedValue([]);
    (listRoutineEvents as jest.Mock).mockResolvedValue([]);
    (getRoutineStateCache as jest.Mock).mockResolvedValue(buildCache());
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows the routine name and current streak once loaded', async () => {
    (getRoutineStateCache as jest.Mock).mockResolvedValue(buildCache({ currentStreak: 3 }));

    await render(<RoutineDetailScreen />);

    expect(await screen.findByText('Laufen')).toBeTruthy();
    expect(await screen.findByText('Streak: 3')).toBeTruthy();
  });

  it.each([
    [0, 'Im Aufbau'],
    [1, 'Stabil'],
    [2, 'Gefestigt'],
    [3, 'Meister'],
    [4, 'Meister'],
  ])('shows the level name for level_rank %i', async (levelRank, expectedName) => {
    (getRoutineStateCache as jest.Mock).mockResolvedValue(buildCache({ levelRank }));

    await render(<RoutineDetailScreen />);

    expect(await screen.findByTestId('routine-detail-level')).toHaveTextContent(expectedName);
  });

  it('shows available jokers before streak 66', async () => {
    (getRoutineStateCache as jest.Mock).mockResolvedValue(
      buildCache({ currentStreak: 10, jokerInventory: 2 }),
    );

    await render(<RoutineDetailScreen />);

    expect(await screen.findByTestId('routine-detail-jokers')).toHaveTextContent('Joker: 2/2');
  });

  it('hides the joker line once the streak has reached 66', async () => {
    (getRoutineStateCache as jest.Mock).mockResolvedValue(buildCache({ currentStreak: 66 }));

    await render(<RoutineDetailScreen />);
    await screen.findByText('Laufen');

    expect(screen.queryByTestId('routine-detail-jokers')).toBeNull();
  });

  it('shows the personal streak record and total successful completions', async () => {
    (getRoutineStateCache as jest.Mock).mockResolvedValue(
      buildCache({ bestStreak: 12, totalCompletions: 40 }),
    );

    await render(<RoutineDetailScreen />);

    expect(await screen.findByTestId('routine-detail-best-streak')).toHaveTextContent('Rekord: 12');
    expect(await screen.findByTestId('routine-detail-total-completions')).toHaveTextContent(
      'Erledigt insgesamt: 40',
    );
  });

  it('maps calendar cell states from the routine events', async () => {
    (listRoutineEvents as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        routineId: routine.id,
        occurrenceDate: TODAY,
        eventType: 'completed',
        recordedAt: TODAY,
        movedToDate: null,
        skipReason: null,
        supersededByEventId: null,
      },
    ]);

    await render(<RoutineDetailScreen />);

    expect(await screen.findByTestId(`calendar-day-${TODAY}-completed`)).toBeTruthy();
  });

  it('collapses the personal reason by default and reveals it on toggle', async () => {
    await render(<RoutineDetailScreen />);
    await screen.findByText('Laufen');

    expect(screen.queryByTestId('routine-detail-reason-text')).toBeNull();

    await fireEvent.press(screen.getByTestId('routine-detail-reason-toggle'));

    expect(screen.getByTestId('routine-detail-reason-text').props.children).toBe('Gesund bleiben');
  });

  it('retroactively completes a past missed day after confirmation, then refreshes', async () => {
    await render(<RoutineDetailScreen />);
    await screen.findByText('Laufen');

    await fireEvent.press(screen.getByTestId('routine-detail-calendar-prev'));
    await fireEvent.press(screen.getByTestId(`calendar-day-${PREV_MONTH_15TH}-missed`));

    expect(retroactivelyCompleteOccurrence).not.toHaveBeenCalled();

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === 'Erledigt')?.onPress?.();

    expect(retroactivelyCompleteOccurrence).toHaveBeenCalledWith({}, 'routine-1', PREV_MONTH_15TH);
  });

  it('triggers the level-up milestone haptic when a retroactive completion crosses a level boundary', async () => {
    (retroactivelyCompleteOccurrence as jest.Mock).mockResolvedValue({
      writtenEvents: [],
      jokerRestored: false,
      requiresFullRecalculation: true,
      leveledUp: true,
    });

    await render(<RoutineDetailScreen />);
    await screen.findByText('Laufen');

    await fireEvent.press(screen.getByTestId('routine-detail-calendar-prev'));
    await fireEvent.press(screen.getByTestId(`calendar-day-${PREV_MONTH_15TH}-missed`));

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === 'Erledigt')?.onPress?.();

    expect(triggerLevelMilestoneHaptic).toHaveBeenCalledTimes(1);
  });

  it('does not offer retroactive completion for an already-completed past day', async () => {
    (listRoutineEvents as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        routineId: routine.id,
        occurrenceDate: PREV_MONTH_15TH,
        eventType: 'completed',
        recordedAt: PREV_MONTH_15TH,
        movedToDate: null,
        skipReason: null,
        supersededByEventId: null,
      },
    ]);

    await render(<RoutineDetailScreen />);
    await screen.findByText('Laufen');

    await fireEvent.press(screen.getByTestId('routine-detail-calendar-prev'));
    await fireEvent.press(screen.getByTestId(`calendar-day-${PREV_MONTH_15TH}-completed`));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(retroactivelyCompleteOccurrence).not.toHaveBeenCalled();
  });
});
