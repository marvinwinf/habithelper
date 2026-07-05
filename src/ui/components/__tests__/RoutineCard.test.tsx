import { fireEvent, render, screen } from '@testing-library/react-native';

import { RoutineCard } from '../RoutineCard';

const routine = {
  id: 'routine-1',
  name: 'Laufen',
  timeOfDay: null,
  allowConsciousSkip: false,
  colorVariantSeed: 0,
};

async function renderCard(overrides: Partial<React.ComponentProps<typeof RoutineCard>> = {}) {
  const callbacks = {
    onComplete: jest.fn(),
    onExceed: jest.fn(),
    onOpenDetail: jest.fn(),
    onMoveToTomorrow: jest.fn(),
    onSkip: jest.fn(),
    onEdit: jest.fn(),
    onPause: jest.fn(),
    onDelete: jest.fn(),
  };
  const result = await render(
    <RoutineCard
      routine={routine}
      streak={0}
      state="pending"
      testID="routine-card"
      {...callbacks}
      {...overrides}
    />,
  );
  return { callbacks, ...result };
}

describe('RoutineCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes on a tap and exceeds on a long press, exactly once each', async () => {
    const { callbacks } = await renderCard();
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onExceed).not.toHaveBeenCalled();
    expect(callbacks.onOpenDetail).not.toHaveBeenCalled();

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(500);
    await fireEvent(control, 'pressOut');

    expect(callbacks.onExceed).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
  });

  it('tapping the card body outside the completion button navigates to detail, not completion', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('routine-card'));

    expect(callbacks.onOpenDetail).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(callbacks.onExceed).not.toHaveBeenCalled();
  });

  it('omits conscious skip from the overflow menu when the routine disallows it', async () => {
    await renderCard({ routine: { ...routine, allowConsciousSkip: false } });

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));

    expect(screen.queryByTestId('routine-card-menu-skip')).toBeNull();
    expect(screen.getByTestId('routine-card-menu-move')).toBeTruthy();
  });

  it('includes conscious skip in the overflow menu when the routine allows it', async () => {
    const { callbacks } = await renderCard({ routine: { ...routine, allowConsciousSkip: true } });

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));
    await fireEvent.press(screen.getByTestId('routine-card-menu-skip'));

    expect(callbacks.onSkip).toHaveBeenCalledTimes(1);
  });

  it('wires the remaining overflow menu actions', async () => {
    const { callbacks } = await renderCard();

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));
    await fireEvent.press(screen.getByTestId('routine-card-menu-move'));
    expect(callbacks.onMoveToTomorrow).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));
    await fireEvent.press(screen.getByTestId('routine-card-menu-edit'));
    expect(callbacks.onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));
    await fireEvent.press(screen.getByTestId('routine-card-menu-pause'));
    expect(callbacks.onPause).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));
    await fireEvent.press(screen.getByTestId('routine-card-menu-delete'));
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables the completion control once resolved (completed/exceeded/skipped)', async () => {
    await renderCard({ state: 'completed' });

    expect(screen.getByTestId('routine-card-complete').props.accessibilityState.disabled).toBe(true);
  });

  it('hides move and skip in the overflow menu once the occurrence is resolved', async () => {
    await renderCard({
      routine: { ...routine, allowConsciousSkip: true },
      state: 'completed',
    });

    await fireEvent.press(screen.getByTestId('routine-card-menu-button'));

    expect(screen.queryByTestId('routine-card-menu-move')).toBeNull();
    expect(screen.queryByTestId('routine-card-menu-skip')).toBeNull();
    expect(screen.getByTestId('routine-card-menu-edit')).toBeTruthy();
    expect(screen.getByTestId('routine-card-menu-delete')).toBeTruthy();
  });
});
