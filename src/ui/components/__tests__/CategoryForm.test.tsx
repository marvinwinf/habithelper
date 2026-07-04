import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryForm } from '../CategoryForm';
import { colors } from '../../theme';
import { getCategoryColorVariant } from '../../theme/categoryVariant';

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

    for (const family of Object.keys(colors.categories)) {
      expect(screen.getByTestId(`category-form-color-${family}`)).toBeTruthy();
    }
  });

  it('updates the live preview when a different color is selected', async () => {
    await render(<CategoryForm onSubmit={jest.fn()} initialName="Sport" />);

    await fireEvent.press(screen.getByTestId('category-form-color-lavender'));

    const preview = screen.getByTestId('category-form-preview');
    const style = Array.isArray(preview.props.style)
      ? Object.assign({}, ...preview.props.style.filter(Boolean))
      : preview.props.style;

    const expectedVariant = getCategoryColorVariant(colors.categories.lavender.base, 0);
    expect(style.backgroundColor).toBe(expectedVariant.background);
  });

  it('calls onSubmit with the trimmed name and selected base color', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), '  Sport  ');
    await fireEvent.press(screen.getByTestId('category-form-color-apricot'));
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Sport', baseColor: colors.categories.apricot.base });
  });
});
