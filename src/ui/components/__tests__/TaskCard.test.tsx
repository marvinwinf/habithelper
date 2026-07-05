import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskCard } from '../TaskCard';

const task = {
  id: 'task-1',
  title: 'Wäsche waschen',
  date: null,
  timeOfDay: null,
  isCompleted: false,
  colorVariantSeed: 0,
};

async function renderCard(overrides: Partial<React.ComponentProps<typeof TaskCard>> = {}) {
  const callbacks = {
    onToggleComplete: jest.fn(),
    onMoveToTomorrow: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };
  const result = await render(
    <TaskCard task={task} isOverdue={false} testID="task-card" {...callbacks} {...overrides} />,
  );
  return { callbacks, ...result };
}

describe('TaskCard', () => {
  it('toggles completion via the checkbox control', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('task-card-toggle'));

    expect(callbacks.onToggleComplete).toHaveBeenCalledTimes(1);
  });

  it('reflects completed state in the checkbox and dims the card', async () => {
    await renderCard({ task: { ...task, isCompleted: true } });

    expect(screen.getByTestId('task-card-toggle').props.accessibilityState.checked).toBe(true);
  });

  it('shows an overdue label when marked overdue', async () => {
    await renderCard({ isOverdue: true });
    expect(screen.getByTestId('task-card-overdue-label')).toBeTruthy();
  });

  it('omits the overdue label when not marked overdue', async () => {
    await renderCard({ isOverdue: false });
    expect(screen.queryByTestId('task-card-overdue-label')).toBeNull();
  });

  it('wires the overflow menu actions', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('task-card-menu-button'));
    await fireEvent.press(screen.getByTestId('task-card-menu-move'));
    expect(callbacks.onMoveToTomorrow).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('task-card-menu-button'));
    await fireEvent.press(screen.getByTestId('task-card-menu-edit'));
    expect(callbacks.onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('task-card-menu-button'));
    await fireEvent.press(screen.getByTestId('task-card-menu-delete'));
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides the move-to-tomorrow option once the task is completed', async () => {
    await renderCard({ task: { ...task, isCompleted: true } });

    await fireEvent.press(screen.getByTestId('task-card-menu-button'));

    expect(screen.queryByTestId('task-card-menu-move')).toBeNull();
    expect(screen.getByTestId('task-card-menu-edit')).toBeTruthy();
    expect(screen.getByTestId('task-card-menu-delete')).toBeTruthy();
  });
});
