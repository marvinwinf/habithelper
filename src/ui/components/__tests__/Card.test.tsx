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

  it('applies the surface background and soft card radius tokens', async () => {
    await render(<Card testID="card" />);
    const flattenedStyle = screen.getByTestId('card').props.style;
    const style = Array.isArray(flattenedStyle)
      ? Object.assign({}, ...flattenedStyle.filter(Boolean))
      : flattenedStyle;

    expect(style.backgroundColor).toBe(colors.surface);
    expect(style.borderRadius).toBe(radius.lg);
  });

  it('carries only an extremely subtle soft-paper shadow, not a heavy one', async () => {
    await render(<Card testID="card" />);
    const flattenedStyle = screen.getByTestId('card').props.style;
    const style = Array.isArray(flattenedStyle)
      ? Object.assign({}, ...flattenedStyle.filter(Boolean))
      : flattenedStyle;

    // Soft Momentum lifts cards mostly by tone; the shadow is a whisper.
    expect(style.shadowOpacity).toBeLessThanOrEqual(0.1);
    expect(style.elevation).toBeLessThanOrEqual(2);
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
