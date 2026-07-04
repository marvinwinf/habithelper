import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, type ButtonVariant } from '../Button';
import { colors } from '../../theme';

function flatten(style: unknown) {
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style;
}

describe('Button', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button label="Speichern" onPress={onPress} testID="button" />);

    fireEvent.press(screen.getByTestId('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each<[ButtonVariant, string]>([
    ['primary', colors.accent],
    ['secondary', colors.surfaceMuted],
    ['destructive', colors.destructive],
  ])('renders the %s variant with its own distinct background', async (variant, expectedBackground) => {
    await render(<Button label="Aktion" variant={variant} testID="button" />);
    const style = flatten(screen.getByTestId('button').props.style);

    expect(style.backgroundColor).toBe(expectedBackground);
  });

  it('gives each variant a visually distinct background from the others', async () => {
    const backgrounds: unknown[] = [];
    for (const variant of ['primary', 'secondary', 'destructive'] as const) {
      await render(<Button label="Aktion" variant={variant} testID={variant} />);
      backgrounds.push(flatten(screen.getByTestId(variant).props.style).backgroundColor);
    }

    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it('reduces opacity and disables interaction when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Aktion" onPress={onPress} disabled testID="button" />);

    const button = screen.getByTestId('button');
    const style = flatten(button.props.style);

    expect(style.opacity).toBe(0.5);
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
