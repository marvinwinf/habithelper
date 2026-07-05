import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import RoutineDetailScreen from '../index';
import { todayDateString } from '../../../../src/domain/dates';
import { getRoutine } from '../../../../src/data/repositories/routineRepository';
import { listCategories } from '../../../../src/data/repositories/categoryRepository';
import { listRoutineEvents } from '../../../../src/data/repositories/routineEventRepository';
import { retroactivelyCompleteOccurrence } from '../../../../src/services/routineService';

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
jest.mock('../../../../src/services/routineService', () => ({
  retroactivelyCompleteOccurrence: jest.fn().mockResolvedValue(undefined),
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

describe('RoutineDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRoutine as jest.Mock).mockResolvedValue(routine);
    (listCategories as jest.Mock).mockResolvedValue([]);
    (listRoutineEvents as jest.Mock).mockResolvedValue([]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows the routine name and placeholder streak once loaded', async () => {
    await render(<RoutineDetailScreen />);

    expect(await screen.findByText('Laufen')).toBeTruthy();
    expect(screen.getByTestId('routine-detail-streak')).toBeTruthy();
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
