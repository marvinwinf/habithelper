import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import EditTaskScreen from '../edit';
import { getTask } from '../../../../src/data/repositories/taskRepository';
import { editTask } from '../../../../src/services/taskService';
import { listCategories } from '../../../../src/data/repositories/categoryRepository';

jest.mock('../../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../../src/data/repositories/taskRepository', () => ({
  getTask: jest.fn(),
}));
jest.mock('../../../../src/services/taskService', () => ({
  editTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useLocalSearchParams: () => ({ id: 'task-1' }),
  useRouter: () => ({ back: mockBack }),
}));

const existingTask = {
  id: 'task-1',
  title: 'Wäsche waschen',
  categoryId: null,
  date: '2026-07-05',
  timeOfDay: '18:00',
  description: null,
  isCompleted: false,
  completedAt: null,
  sortOrder: 0,
  colorVariantSeed: 0,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

describe('EditTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getTask as jest.Mock).mockResolvedValue(existingTask);
    (listCategories as jest.Mock).mockResolvedValue([]);
  });

  it('pre-fills the form with the existing task once loaded', async () => {
    await render(<EditTaskScreen />);

    expect(await screen.findByTestId('edit-task-form')).toBeTruthy();
    expect(screen.getByTestId('task-form-title-input').props.value).toBe('Wäsche waschen');
    expect(screen.getByText('05.07.2026')).toBeTruthy();
    expect(getTask).toHaveBeenCalledWith({}, 'task-1');
  });

  it('updates the task and navigates back on save', async () => {
    await render(<EditTaskScreen />);
    await screen.findByTestId('edit-task-form');

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Wäsche aufhängen');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    await waitFor(() => expect(editTask).toHaveBeenCalledTimes(1));
    expect(editTask).toHaveBeenCalledWith(
      {},
      'task-1',
      expect.objectContaining({ title: 'Wäsche aufhängen' }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
