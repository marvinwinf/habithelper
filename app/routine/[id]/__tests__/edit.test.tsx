import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import EditRoutineScreen from '../edit';
import { getRoutine, updateRoutine } from '../../../../src/data/repositories/routineRepository';
import { listCategories } from '../../../../src/data/repositories/categoryRepository';

jest.mock('../../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../../src/data/repositories/routineRepository', () => ({
  getRoutine: jest.fn(),
  updateRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'routine-1' }),
  useRouter: () => ({ back: mockBack }),
}));

const existingRoutine = {
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

describe('EditRoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRoutine as jest.Mock).mockResolvedValue(existingRoutine);
    (listCategories as jest.Mock).mockResolvedValue([]);
  });

  it('pre-fills the form with the existing routine once loaded', async () => {
    await render(<EditRoutineScreen />);

    expect(await screen.findByTestId('edit-routine-form')).toBeTruthy();
    expect(screen.getByTestId('routine-form-name-input').props.value).toBe('Laufen');
    expect(getRoutine).toHaveBeenCalledWith({}, 'routine-1');
  });

  it('updates the routine and navigates back on save', async () => {
    await render(<EditRoutineScreen />);
    await screen.findByTestId('edit-routine-form');

    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Joggen');
    await fireEvent.press(screen.getByTestId('routine-form-save'));

    await waitFor(() => expect(updateRoutine).toHaveBeenCalledTimes(1));
    expect(updateRoutine).toHaveBeenCalledWith(
      {},
      'routine-1',
      expect.objectContaining({ name: 'Joggen' }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
