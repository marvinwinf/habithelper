import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RoutineCard } from '../RoutineCard';
import {
  triggerExceededCompletionHaptic,
  triggerLevelMilestoneHaptic,
  triggerRoutineCompletionHaptic,
} from '../../animation/haptics';

jest.mock('../../animation/haptics', () => ({
  triggerRoutineCompletionHaptic: jest.fn(),
  triggerExceededCompletionHaptic: jest.fn(),
  triggerLevelMilestoneHaptic: jest.fn(),
}));

const routine = {
  id: 'routine-1',
  name: 'Laufen',
  scheduleType: 'daily' as const,
  scheduledWeekdays: null,
  weeklyTargetCount: null,
  timeOfDay: null,
  allowConsciousSkip: false,
  colorVariantSeed: 0,
};

async function renderCard(overrides: Partial<React.ComponentProps<typeof RoutineCard>> = {}) {
  const callbacks = {
    onComplete: jest.fn(),
    onExceed: jest.fn(),
    onUndo: jest.fn(),
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
    jest.clearAllMocks();
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

  it('fires a distinct, stronger haptic for exceeded than for a normal completion', async () => {
    await renderCard();
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    expect(triggerRoutineCompletionHaptic).toHaveBeenCalledTimes(1);
    expect(triggerExceededCompletionHaptic).not.toHaveBeenCalled();

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(500);
    await fireEvent(control, 'pressOut');

    expect(triggerExceededCompletionHaptic).toHaveBeenCalledTimes(1);
    expect(triggerRoutineCompletionHaptic).toHaveBeenCalledTimes(1);
  });

  it('triggers the level-up milestone haptic only when onComplete signals a level crossing', async () => {
    const onComplete = jest.fn().mockResolvedValue(false);
    await renderCard({ onComplete });
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    expect(triggerLevelMilestoneHaptic).not.toHaveBeenCalled();
  });

  it('triggers the level-up milestone haptic when onComplete signals a level crossing', async () => {
    const onComplete = jest.fn().mockResolvedValue(true);
    await renderCard({ onComplete, state: 'pending' });
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    await waitFor(() => expect(triggerLevelMilestoneHaptic).toHaveBeenCalledTimes(1));
  });

  it('triggers the level-up milestone haptic when onExceed signals a level crossing', async () => {
    const onExceed = jest.fn().mockResolvedValue(true);
    await renderCard({ onExceed });
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(500);
    await fireEvent(control, 'pressOut');

    await waitFor(() => expect(triggerLevelMilestoneHaptic).toHaveBeenCalledTimes(1));
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

  it('disables the completion control only when the occurrence was skipped', async () => {
    await renderCard({ state: 'skipped' });

    expect(screen.getByTestId('routine-card-complete').props.accessibilityState.disabled).toBe(true);
  });

  it.each(['completed', 'exceeded'] as const)(
    'keeps the completion control tappable when %s, for undo',
    async (state) => {
      await renderCard({ state });

      expect(
        screen.getByTestId('routine-card-complete').props.accessibilityState.disabled,
      ).toBe(false);
    },
  );

  it('undoes a completed occurrence on tap instead of firing onComplete again', async () => {
    const { callbacks } = await renderCard({ state: 'completed' });
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(50);
    await fireEvent(control, 'pressOut');

    expect(callbacks.onUndo).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it('undoes an exceeded occurrence on a long press too, instead of firing onExceed again', async () => {
    const { callbacks } = await renderCard({ state: 'exceeded' });
    const control = screen.getByTestId('routine-card-complete');

    await fireEvent(control, 'pressIn');
    jest.advanceTimersByTime(500);
    await fireEvent(control, 'pressOut');

    expect(callbacks.onUndo).toHaveBeenCalledTimes(1);
    expect(callbacks.onExceed).not.toHaveBeenCalled();
  });

  it('renders the real streak value with its label', async () => {
    await renderCard({ streak: 8 });

    expect(screen.getByTestId('routine-card-streak')).toHaveTextContent('Streak 8');
  });

  it('renders a time · schedule subtitle for a daily routine with a time', async () => {
    await renderCard({ routine: { ...routine, timeOfDay: '20:00' } });

    expect(screen.getByText('20:00 · Jeden Tag')).toBeTruthy();
  });

  it('renders the schedule label alone when the routine has no time', async () => {
    await renderCard({
      routine: {
        ...routine,
        scheduleType: 'weekly_target' as const,
        scheduledWeekdays: [1, 3, 5],
        weeklyTargetCount: 3,
      },
    });

    expect(screen.getByText('3x pro Woche')).toBeTruthy();
  });

  it('renders weekday initials for a weekday schedule', async () => {
    await renderCard({
      routine: { ...routine, scheduleType: 'weekdays' as const, scheduledWeekdays: [1, 3, 5] },
    });

    expect(screen.getByText('Mo, Mi, Fr')).toBeTruthy();
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
