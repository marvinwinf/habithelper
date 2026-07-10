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
    ['primary', colors.textPrimary],
    ['secondary', 'transparent'],
    ['destructive', 'transparent'],
  ])('renders the %s variant with its own background', async (variant, expectedBackground) => {
    await render(<Button label="Aktion" variant={variant} testID="button" />);
    const style = flatten(screen.getByTestId('button').props.style);

    expect(style.backgroundColor).toBe(expectedBackground);
  });

  it('never uses the gold accent as a button fill (reserved for meaning-carrying elements)', async () => {
    for (const variant of ['primary', 'secondary', 'destructive'] as const) {
      await render(<Button label="Aktion" variant={variant} testID={variant} />);
      expect(flatten(screen.getByTestId(variant).props.style).backgroundColor).not.toBe(
        colors.accent
      );
    }
  });

  it('renders secondary as underlined text and destructive as a rose outline', async () => {
    await render(<Button label="Speichern" variant="secondary" testID="secondary" />);
    const secondaryLabel = screen.getByText('Speichern');
    expect(flatten(secondaryLabel.props.style).textDecorationLine).toBe('underline');

    await render(<Button label="Löschen" variant="destructive" testID="destructive" />);
    const destructiveStyle = flatten(screen.getByTestId('destructive').props.style);
    expect(destructiveStyle.borderColor).toBe(colors.destructive);
  });

  it('keeps a >=44dp touch target for its compact small-caps label (T082)', async () => {
    await render(<Button label="OK" testID="button" />);
    expect(flatten(screen.getByTestId('button').props.style).minHeight).toBeGreaterThanOrEqual(44);
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
