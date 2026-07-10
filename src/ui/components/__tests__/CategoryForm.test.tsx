import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryForm } from '../CategoryForm';
import { legacyCategoryPalette } from '../../theme/categoryVariant';
import { CATEGORY_ICON_OPTIONS } from '../../categoryIcons';

describe('CategoryForm', () => {
  it('disables save until a name is entered', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} />);

    const saveButton = screen.getByTestId('category-form-save');
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), 'Sport');

    expect(screen.getByTestId('category-form-save').props.accessibilityState.disabled).toBe(false);
  });

  it('disables save again if the name is cleared back to only whitespace', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} initialName="Sport" />);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), '   ');

    expect(screen.getByTestId('category-form-save').props.accessibilityState.disabled).toBe(true);
  });

  it('offers all six palette families from the design system', async () => {
    await render(<CategoryForm onSubmit={jest.fn()} />);

    for (const family of Object.keys(legacyCategoryPalette)) {
      expect(screen.getByTestId(`category-form-color-${family}`)).toBeTruthy();
    }
  });

  it('shows the entered name in the live preview regardless of the selected color', async () => {
    await render(<CategoryForm onSubmit={jest.fn()} initialName="Sport" />);

    await fireEvent.press(screen.getByTestId('category-form-color-lavender'));

    expect(screen.getByTestId('category-form-preview')).toBeTruthy();
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('calls onSubmit with the trimmed name and selected base color', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), '  Sport  ');
    await fireEvent.press(screen.getByTestId('category-form-color-apricot'));
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Sport',
      baseColor: legacyCategoryPalette.apricot.base,
      icon: null,
    });
  });

  it('offers the curated icon set and submits the selected icon', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} initialName="Sport" />);

    for (const option of CATEGORY_ICON_OPTIONS) {
      expect(screen.getByTestId(`category-form-icon-${option}`)).toBeTruthy();
    }

    await fireEvent.press(screen.getByTestId('category-form-icon-book'));
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ icon: 'book' }));
  });

  it('marks the initial icon as selected when editing', async () => {
    await render(<CategoryForm onSubmit={jest.fn()} initialName="Sport" initialIcon="walk" />);

    expect(
      screen.getByTestId('category-form-icon-walk').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('category-form-icon-book').props.accessibilityState.selected,
    ).toBe(false);
  });
});
