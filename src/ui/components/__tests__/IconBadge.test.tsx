import { render, screen } from '@testing-library/react-native';

import { IconBadge } from '../IconBadge';
import { colors, iconBadgeSizes } from '../../theme';

function flattenStyle(style: unknown) {
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
}

describe('IconBadge', () => {
  it('renders the given icon', async () => {
    await render(<IconBadge name="book" testID="badge" />);
    expect(screen.getByTestId('badge')).toBeTruthy();
  });

  it('defaults to a neutral tint and the medium size', async () => {
    await render(<IconBadge name="book" testID="badge" />);
    const style = flattenStyle(screen.getByTestId('badge').props.style);

    expect(style.backgroundColor).toBe(colors.surfaceMuted);
    expect(style.width).toBe(iconBadgeSizes.md.container);
    expect(style.height).toBe(iconBadgeSizes.md.container);
    expect(style.borderRadius).toBe(iconBadgeSizes.md.radius);
  });

  it('applies a caller-provided tint', async () => {
    await render(
      <IconBadge name="book" testID="badge" backgroundColor="#ABCDEF" iconColor="#123456" />
    );
    const style = flattenStyle(screen.getByTestId('badge').props.style);

    expect(style.backgroundColor).toBe('#ABCDEF');
  });

  it('applies the requested size variant', async () => {
    await render(<IconBadge name="book" testID="badge" size="lg" />);
    const style = flattenStyle(screen.getByTestId('badge').props.style);

    expect(style.width).toBe(iconBadgeSizes.lg.container);
    expect(style.borderRadius).toBe(iconBadgeSizes.lg.radius);
  });
});
