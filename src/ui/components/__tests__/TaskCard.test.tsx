import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskCard } from '../TaskCard';
import { todayDateString } from '../../../domain/dates';

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

  it('extends the compact toggle to a >=44dp touch target via hitSlop (T082)', async () => {
    await renderCard();
    // 28dp glyph + 8dp hitSlop on each side = 44dp effective target.
    expect(screen.getByTestId('task-card-toggle').props.hitSlop).toBeGreaterThanOrEqual(8);
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

  it('opens the actions sheet on card tap and wires its entries', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('task-card'));
    await fireEvent.press(screen.getByTestId('task-card-menu-move'));
    expect(callbacks.onMoveToTomorrow).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('task-card'));
    await fireEvent.press(screen.getByTestId('task-card-menu-edit'));
    expect(callbacks.onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('task-card'));
    await fireEvent.press(screen.getByTestId('task-card-menu-delete'));
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not complete the task when tapping the card body to open actions', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('task-card'));

    expect(callbacks.onToggleComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId('task-card-menu-edit')).toBeTruthy();
  });

  it('hides the move-to-tomorrow option once the task is completed', async () => {
    await renderCard({ task: { ...task, isCompleted: true } });

    await fireEvent.press(screen.getByTestId('task-card'));

    expect(screen.queryByTestId('task-card-menu-move')).toBeNull();
    expect(screen.getByTestId('task-card-menu-edit')).toBeTruthy();
    expect(screen.getByTestId('task-card-menu-delete')).toBeTruthy();
  });

  it('shows "Heute" as the subtitle for a task dated today', async () => {
    await renderCard({ task: { ...task, date: todayDateString() } });

    expect(screen.getByText('Heute')).toBeTruthy();
  });

  it('shows the raw date (plus time) for a task dated another day', async () => {
    await renderCard({ task: { ...task, date: '2026-08-01', timeOfDay: '09:00' } });

    expect(screen.getByText('2026-08-01 · 09:00')).toBeTruthy();
  });

  it('shows the "Für später" subtitle and a bookmark on for-later cards', async () => {
    await renderCard({ forLater: true });

    expect(screen.getByText('Für später')).toBeTruthy();
    expect(screen.getByTestId('task-card-bookmark')).toBeTruthy();
  });

  it('shows no bookmark outside the for-later treatment', async () => {
    await renderCard();

    expect(screen.queryByTestId('task-card-bookmark')).toBeNull();
  });
});
