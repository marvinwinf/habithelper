import { fireEvent, render, screen } from '@testing-library/react-native';
// Native specs are stubbed globally in jest.setup.js.
import { mockAndroidDialogDateChange } from '@react-native-community/datetimepicker/jest';

import { TaskForm } from '../TaskForm';

const categories = [
  { id: 'cat-1', name: 'Haushalt' },
  { id: 'cat-2', name: 'Arbeit' },
];

describe('TaskForm', () => {
  it('disables save until a title is entered — every other field stays optional', async () => {
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);

    expect(screen.getByTestId('task-form-save').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Wäsche waschen');

    expect(screen.getByTestId('task-form-save').props.accessibilityState.disabled).toBe(false);
  });

  it('submits with only a title, mapping every empty optional field to null', async () => {
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), '  Wäsche waschen  ');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Wäsche waschen',
      categoryId: null,
      date: null,
      timeOfDay: null,
      description: null,
    });
  });

  it('creates a task with no date, per docs/MVP_SCOPE.md', async () => {
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Ohne Datum');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date: null }));
  });

  it('submits category, date, and time when provided', async () => {
    mockAndroidDialogDateChange(new Date(2026, 6, 10));
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Meeting vorbereiten');
    await fireEvent.press(screen.getByTestId('task-form-category-cat-2'));
    await fireEvent.press(screen.getByTestId('task-form-date-input'));
    await fireEvent.changeText(screen.getByTestId('task-form-time-input'), '09:00');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Meeting vorbereiten',
      categoryId: 'cat-2',
      date: '2026-07-10',
      timeOfDay: '09:00',
      description: null,
    });
  });

  it('clears a picked date via the remove button', async () => {
    mockAndroidDialogDateChange(new Date(2026, 6, 10));
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Wäsche waschen');
    await fireEvent.press(screen.getByTestId('task-form-date-input'));
    expect(screen.getByTestId('task-form-date-clear')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('task-form-date-clear'));
    expect(screen.queryByTestId('task-form-date-clear')).toBeNull();

    await fireEvent.press(screen.getByTestId('task-form-save'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date: null }));
  });

  it('description stays collapsed by default and its value is included once expanded and filled', async () => {
    const onSubmit = jest.fn();
    await render(<TaskForm categories={categories} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId('task-form-title-input'), 'Wäsche waschen');

    expect(screen.queryByTestId('task-form-description-input')).toBeNull();

    await fireEvent.press(screen.getByTestId('task-form-description-toggle'));
    await fireEvent.changeText(screen.getByTestId('task-form-description-input'), 'Feinwäsche zuerst');
    await fireEvent.press(screen.getByTestId('task-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Feinwäsche zuerst' }),
    );
  });

  it('pre-fills from initialValues for editing', async () => {
    await render(
      <TaskForm
        categories={categories}
        onSubmit={jest.fn()}
        initialValues={{
          title: 'Wäsche waschen',
          categoryId: 'cat-1',
          date: '2026-07-05',
          timeOfDay: '18:00',
        }}
      />,
    );

    expect(screen.getByTestId('task-form-title-input').props.value).toBe('Wäsche waschen');
    expect(screen.getByTestId('task-form-category-cat-1').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('05.07.2026')).toBeTruthy();
    expect(screen.getByTestId('task-form-time-input').props.value).toBe('18:00');
    expect(screen.getByTestId('task-form-save').props.accessibilityState.disabled).toBe(false);
  });
});
