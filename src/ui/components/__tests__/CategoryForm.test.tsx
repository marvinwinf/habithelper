import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryForm } from '../CategoryForm';
import { categoryPalette } from '../../theme/categoryVariant';
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

  it('offers a color family picker and submits the selected family', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} initialName="Sport" />);

    for (const family of Object.keys(categoryPalette)) {
      expect(screen.getByTestId(`category-form-color-${family}`)).toBeTruthy();
    }
    expect(screen.getByText('Farbe')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('category-form-color-lavender'));
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ baseColor: categoryPalette.lavender.base })
    );
  });

  it('shows the entered name in the live preview', async () => {
    await render(<CategoryForm onSubmit={jest.fn()} initialName="Sport" />);

    expect(screen.getByTestId('category-form-preview')).toBeTruthy();
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('calls onSubmit with the trimmed name and a stable base color', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), '  Sport  ');
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Sport',
      baseColor: expect.any(String),
      icon: null,
    });
  });

  it('preserves an existing category base color unless a different swatch is picked', async () => {
    const onSubmit = jest.fn();
    const existingBaseColor = categoryPalette.apricot.base;
    await render(
      <CategoryForm onSubmit={onSubmit} initialName="Sport" initialBaseColor={existingBaseColor} />
    );

    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ baseColor: existingBaseColor }));
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
