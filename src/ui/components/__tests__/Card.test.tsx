import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '../Card';
import { colors, radius } from '../../theme';

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('applies the surface background and large radius tokens', async () => {
    await render(<Card testID="card" />);
    const flattenedStyle = screen.getByTestId('card').props.style;
    const style = Array.isArray(flattenedStyle)
      ? Object.assign({}, ...flattenedStyle.filter(Boolean))
      : flattenedStyle;

    expect(style.backgroundColor).toBe(colors.surface);
    expect(style.borderRadius).toBe(radius.lg);
  });

  it('merges a caller-provided style override', async () => {
    await render(<Card testID="card" style={{ marginTop: 10 }} />);
    const flattenedStyle = screen.getByTestId('card').props.style;
    const style = Array.isArray(flattenedStyle)
      ? Object.assign({}, ...flattenedStyle.filter(Boolean))
      : flattenedStyle;

    expect(style.marginTop).toBe(10);
  });
});
