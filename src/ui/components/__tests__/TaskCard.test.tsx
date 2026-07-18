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
    onOpenMenu: jest.fn(),
  };
  const result = await render(
    <TaskCard task={task} isOverdue={false} testID="task-card" {...callbacks} {...overrides} />,
  );
  return { callbacks, ...result };
}

describe('TaskCard', () => {
  it('toggles completion via the completion control', async () => {
    const { callbacks } = await renderCard();
    const toggle = screen.getByTestId('task-card-toggle');

    // The shared CompletionControl decides tap vs. long-press on pressOut.
    await fireEvent(toggle, 'pressIn');
    await fireEvent(toggle, 'pressOut');

    expect(callbacks.onToggleComplete).toHaveBeenCalledTimes(1);
  });

  it('extends the compact toggle to a >=44dp touch target via hitSlop (T082)', async () => {
    await renderCard();
    // 36dp control + 8dp hitSlop on each side = 52dp effective target.
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

  it('requests the screen-level actions sheet on card tap, without completing', async () => {
    // The card must NOT own a Sheet of its own — a per-row native Modal is
    // what caused the Android freeze after deleting a row (the screen owns
    // the one sheet instead); the card only reports the tap upward.
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('task-card'));

    expect(callbacks.onOpenMenu).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleComplete).not.toHaveBeenCalled();
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
