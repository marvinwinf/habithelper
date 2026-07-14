import { fireEvent, render, screen } from '@testing-library/react-native';

import { RoutineForm } from '../RoutineForm';
import { generateSuggestedWeeklyTargetWeekdays } from '../../../domain/routines/schedule';

const categories = [
  { id: 'cat-1', name: 'Sport' },
  { id: 'cat-2', name: 'Haushalt' },
];

describe('RoutineForm', () => {
  it('disables save until a name is entered', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);

    expect(screen.getByTestId('routine-form-save').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Laufen');

    expect(screen.getByTestId('routine-form-save').props.accessibilityState.disabled).toBe(false);
  });

  it('marks exactly the chosen frequency card as selected', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);

    expect(
      screen.getByTestId('routine-form-schedule-daily').props.accessibilityState.selected,
    ).toBe(true);

    await fireEvent.press(screen.getByTestId('routine-form-schedule-weekdays'));

    expect(
      screen.getByTestId('routine-form-schedule-weekdays').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('routine-form-schedule-daily').props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('routine-form-schedule-weekly_target').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('disables save for a weekdays schedule until at least one weekday is selected', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Laufen');

    await fireEvent.press(screen.getByTestId('routine-form-schedule-weekdays'));

    expect(screen.getByTestId('routine-form-save').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('routine-form-weekday-1'));

    expect(screen.getByTestId('routine-form-save').props.accessibilityState.disabled).toBe(false);
  });

  it('populates suggested weekdays when weekly-target frequency is selected', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Laufen');

    await fireEvent.press(screen.getByTestId('routine-form-schedule-weekly_target'));

    const suggested = generateSuggestedWeeklyTargetWeekdays(3);
    for (const day of [1, 2, 3, 4, 5, 6, 7] as const) {
      const checked = screen.getByTestId(`routine-form-weekday-${day}`).props.accessibilityState.checked;
      expect(checked).toBe(suggested.includes(day));
    }
    expect(screen.getByTestId('routine-form-save').props.accessibilityState.disabled).toBe(false);
  });

  it('regenerates suggested weekdays when the weekly target count changes', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByTestId('routine-form-schedule-weekly_target'));

    await fireEvent.press(screen.getByTestId('routine-form-target-count-increase'));

    expect(screen.getByTestId('routine-form-target-count-value').props.children).toBe('4x pro Woche');
    const suggested = generateSuggestedWeeklyTargetWeekdays(4);
    for (const day of [1, 2, 3, 4, 5, 6, 7] as const) {
      const checked = screen.getByTestId(`routine-form-weekday-${day}`).props.accessibilityState.checked;
      expect(checked).toBe(suggested.includes(day));
    }
  });

  it('submits all fields, mapping empty optional text fields to null', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), '  Laufen  ');
    await fireEvent.press(screen.getByTestId('routine-form-category-cat-2'));
    await fireEvent.press(screen.getByTestId('routine-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Laufen',
      categoryId: 'cat-2',
      scheduleType: 'daily',
      scheduledWeekdays: null,
      weeklyTargetCount: null,
      timeOfDay: null,
      cue: null,
      pairing: null,
      reward: null,
      allowConsciousSkip: false,
    });
  });

  it('includes the plan fields and conscious-skip toggle from the advanced section', async () => {
    const onSubmit = jest.fn();
    await render(<RoutineForm categories={categories} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId('routine-form-name-input'), 'Laufen');

    await fireEvent.press(screen.getByTestId('routine-form-advanced-toggle'));
    await fireEvent.changeText(
      screen.getByTestId('routine-form-cue-input'),
      '  Nach dem Aufstehen  ',
    );
    await fireEvent.changeText(
      screen.getByTestId('routine-form-pairing-input'),
      'Dabei höre ich einen Podcast',
    );
    await fireEvent.changeText(screen.getByTestId('routine-form-reward-input'), 'Danach ein Kaffee');
    await fireEvent(screen.getByTestId('routine-form-allow-skip-switch'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('routine-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        cue: 'Nach dem Aufstehen',
        pairing: 'Dabei höre ich einen Podcast',
        reward: 'Danach ein Kaffee',
        allowConsciousSkip: true,
      }),
    );
  });

  it('pre-fills from initialValues for editing', async () => {
    await render(
      <RoutineForm
        categories={categories}
        onSubmit={jest.fn()}
        initialValues={{
          name: 'Laufen',
          categoryId: 'cat-1',
          scheduleType: 'weekdays',
          scheduledWeekdays: [1, 3, 5],
          allowConsciousSkip: true,
        }}
      />,
    );

    expect(screen.getByTestId('routine-form-name-input').props.value).toBe('Laufen');
    expect(screen.getByTestId('routine-form-category-cat-1').props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByTestId('routine-form-weekday-1').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('routine-form-weekday-2').props.accessibilityState.checked).toBe(false);
  });
});
