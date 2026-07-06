import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateRoutineScreen from '../create';
import { createRoutine } from '../../../src/services/routineService';
import { listCategories } from '../../../src/data/repositories/categoryRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/services/routineService', () => ({
  createRoutine: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ back: mockBack }),
}));

describe('CreateRoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCategories as jest.Mock).mockResolvedValue([]);
  });

  it('renders the create routine form', async () => {
    await render(<CreateRoutineScreen />);
    expect(screen.getByTestId('create-routine-form')).toBeTruthy();
  });

  it('creates the routine with a generated color variant seed and navigates back', async () => {
    await render(<CreateRoutineScreen />);

    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Laufen');
    await fireEvent.press(screen.getByTestId('routine-form-save'));

    await waitFor(() => expect(createRoutine).toHaveBeenCalledTimes(1));
    expect(createRoutine).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ name: 'Laufen', colorVariantSeed: expect.any(Number) }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
