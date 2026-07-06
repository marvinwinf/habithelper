import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateTaskScreen from '../create';
import { createTask } from '../../../src/services/taskService';
import { listCategories } from '../../../src/data/repositories/categoryRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/services/taskService', () => ({
  createTask: jest.fn().mockResolvedValue(undefined),
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

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCategories as jest.Mock).mockResolvedValue([]);
  });

  it('renders the create task form', async () => {
    await render(<CreateTaskScreen />);
    expect(screen.getByTestId('create-task-form')).toBeTruthy();
  });

  it('creates the task with a generated color variant seed and navigates back', async () => {
    await render(<CreateTaskScreen />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Wäsche waschen');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(createTask).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ title: 'Wäsche waschen', colorVariantSeed: expect.any(Number) }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('creates a task with no date', async () => {
    await render(<CreateTaskScreen />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Ohne Datum');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(createTask).toHaveBeenCalledWith({}, expect.objectContaining({ date: null }));
  });
});
