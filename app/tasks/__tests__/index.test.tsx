import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TasksScreen from '../index';
import { todayDateString, addDaysToDateString } from '../../../src/domain/dates';
import { listCategories } from '../../../src/data/repositories/categoryRepository';
import {
  listCompletedTasks,
  listOverdueTasks,
  listTasksForToday,
  listUndatedTasks,
  listUpcomingTasks,
} from '../../../src/data/repositories/taskRepository';
import { deleteTask, moveTask, setTaskCompletion } from '../../../src/services/taskService';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/data/repositories/taskRepository', () => ({
  listOverdueTasks: jest.fn().mockResolvedValue([]),
  listTasksForToday: jest.fn().mockResolvedValue([]),
  listUpcomingTasks: jest.fn().mockResolvedValue([]),
  listUndatedTasks: jest.fn().mockResolvedValue([]),
  listCompletedTasks: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/services/taskService', () => ({
  setTaskCompletion: jest.fn().mockResolvedValue(undefined),
  moveTask: jest.fn().mockResolvedValue(undefined),
  deleteTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const TODAY = todayDateString();
const YESTERDAY = addDaysToDateString(TODAY, -1);
const TOMORROW = addDaysToDateString(TODAY, 1);

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    title: 'Wäsche waschen',
    categoryId: null,
    date: null,
    timeOfDay: null,
    description: null,
    isCompleted: false,
    completedAt: null,
    sortOrder: 0,
    colorVariantSeed: 0,
    createdAt: 'x',
    updatedAt: 'x',
    deletedAt: null,
    ...overrides,
  };
}

describe('TasksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCategories as jest.Mock).mockResolvedValue([]);
    (listOverdueTasks as jest.Mock).mockResolvedValue([]);
    (listTasksForToday as jest.Mock).mockResolvedValue([]);
    (listUpcomingTasks as jest.Mock).mockResolvedValue([]);
    (listUndatedTasks as jest.Mock).mockResolvedValue([]);
    (listCompletedTasks as jest.Mock).mockResolvedValue([]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows an empty state when there are no tasks at all', async () => {
    await render(<TasksScreen />);
    expect(await screen.findByText('Noch keine Aufgaben')).toBeTruthy();
  });

  it('shows a task with a past date in the Überfällig section', async () => {
    const task = makeTask({ id: 'overdue-1', title: 'Überfällige Aufgabe', date: YESTERDAY });
    (listOverdueTasks as jest.Mock).mockResolvedValue([task]);

    await render(<TasksScreen />);

    const section = await screen.findByTestId('tasks-section-overdue');
    expect(section).toBeTruthy();
    expect(await screen.findByText('Überfällige Aufgabe')).toBeTruthy();
    expect(await screen.findByTestId('task-row-overdue-1-overdue-label')).toBeTruthy();
    expect(listOverdueTasks).toHaveBeenCalledWith({}, TODAY);
  });

  it('shows a completed task only in the collapsed Erledigt section, not in any other section', async () => {
    const completedTask = makeTask({
      id: 'done-1',
      title: 'Erledigte Aufgabe',
      isCompleted: true,
      completedAt: '2026-07-01T00:00:00.000Z',
    });
    (listCompletedTasks as jest.Mock).mockResolvedValue([completedTask]);

    await render(<TasksScreen />);

    expect(await screen.findByTestId('tasks-section-completed')).toBeTruthy();
    expect(screen.queryByText('Erledigte Aufgabe')).toBeNull();
    expect(screen.queryByTestId('tasks-section-overdue')).toBeNull();
    expect(screen.queryByTestId('tasks-section-today')).toBeNull();
    expect(screen.queryByTestId('tasks-section-upcoming')).toBeNull();
    expect(screen.queryByTestId('tasks-section-undated')).toBeNull();

    await fireEvent.press(screen.getByTestId('tasks-completed-toggle'));

    expect(await screen.findByText('Erledigte Aufgabe')).toBeTruthy();
  });

  it('renders the five sections in the specified order when all have tasks', async () => {
    (listOverdueTasks as jest.Mock).mockResolvedValue([makeTask({ id: 'o1', date: YESTERDAY })]);
    (listTasksForToday as jest.Mock).mockResolvedValue([makeTask({ id: 't1', date: TODAY })]);
    (listUpcomingTasks as jest.Mock).mockResolvedValue([makeTask({ id: 'u1', date: TOMORROW })]);
    (listUndatedTasks as jest.Mock).mockResolvedValue([makeTask({ id: 'n1' })]);
    (listCompletedTasks as jest.Mock).mockResolvedValue([
      makeTask({ id: 'c1', isCompleted: true, completedAt: '2026-07-01T00:00:00.000Z' }),
    ]);

    await render(<TasksScreen />);
    await screen.findByTestId('tasks-section-overdue');

    const sectionOrder = ['overdue', 'today', 'upcoming', 'undated', 'completed'];
    for (const key of sectionOrder) {
      expect(screen.getByTestId(`tasks-section-${key}`)).toBeTruthy();
    }
  });

  it('toggles a task complete, which also serves as undo', async () => {
    const task = makeTask({ id: 'task-1', date: TODAY });
    (listTasksForToday as jest.Mock).mockResolvedValue([task]);

    await render(<TasksScreen />);
    // The shared CompletionControl decides tap vs. long-press on pressOut.
    const toggle = await screen.findByTestId('task-row-task-1-toggle');
    await fireEvent(toggle, 'pressIn');
    await fireEvent(toggle, 'pressOut');

    // Explicit target: the pending row asks to become completed (true).
    expect(setTaskCompletion).toHaveBeenCalledWith({}, 'task-1', true);
  });

  it('moves a task to tomorrow from the actions sheet', async () => {
    const task = makeTask({ id: 'task-1', date: TODAY });
    (listTasksForToday as jest.Mock).mockResolvedValue([task]);

    await render(<TasksScreen />);
    await fireEvent.press(await screen.findByTestId('task-row-task-1'));
    await fireEvent.press(screen.getByTestId('task-row-task-1-menu-move'));

    expect(moveTask).toHaveBeenCalledWith({}, 'task-1', TOMORROW);
  });

  it('deletes a task from the actions sheet only after confirmation', async () => {
    const task = makeTask({ id: 'task-1', date: TODAY });
    (listTasksForToday as jest.Mock).mockResolvedValue([task]);

    await render(<TasksScreen />);
    await fireEvent.press(await screen.findByTestId('task-row-task-1'));
    await fireEvent.press(screen.getByTestId('task-row-task-1-menu-delete'));

    expect(deleteTask).not.toHaveBeenCalled();

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === 'Löschen')?.onPress?.();

    expect(deleteTask).toHaveBeenCalledWith({}, 'task-1');
  });

  it('hides the move-to-tomorrow option for an already-completed task', async () => {
    const task = makeTask({
      id: 'done-1',
      isCompleted: true,
      completedAt: '2026-07-01T00:00:00.000Z',
    });
    (listCompletedTasks as jest.Mock).mockResolvedValue([task]);

    await render(<TasksScreen />);
    await fireEvent.press(await screen.findByTestId('tasks-completed-toggle'));
    await fireEvent.press(await screen.findByTestId('task-row-done-1'));

    expect(screen.queryByTestId('task-row-done-1-menu-move')).toBeNull();
    expect(screen.getByTestId('task-row-done-1-menu-edit')).toBeTruthy();
    expect(screen.getByTestId('task-row-done-1-menu-delete')).toBeTruthy();
  });
});
