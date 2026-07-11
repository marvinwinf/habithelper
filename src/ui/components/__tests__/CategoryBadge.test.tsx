import { render, screen } from '@testing-library/react-native';

import { CategoryBadge } from '../CategoryBadge';
import { colors } from '../../theme';
import { categoryPalette } from '../../theme/categoryVariant';

function flatten(style: unknown) {
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
}

describe('CategoryBadge', () => {
  it('renders the label', async () => {
    await render(<CategoryBadge label="Sport" />);
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('renders neutral (hairline outline, no fill) without a baseColor', async () => {
    await render(<CategoryBadge label="Haushalt" testID="badge" />);

    const badgeStyle = flatten(screen.getByTestId('badge').props.style);
    expect(badgeStyle.backgroundColor).toBe('transparent');
    expect(badgeStyle.borderColor).toBe(colors.border);
  });

  it('tints background and accent from the matching palette family when given a baseColor', async () => {
    await render(
      <CategoryBadge label="Sport" baseColor={categoryPalette.lavender.base} testID="badge" />
    );

    const badgeStyle = flatten(screen.getByTestId('badge').props.style);
    expect(Object.values(categoryPalette.lavender)).toContain(badgeStyle.backgroundColor);
    expect(badgeStyle.borderColor).toBe('transparent');
  });

  it('stays deterministic for the same baseColor and colorVariantSeed', async () => {
    const first = await render(
      <CategoryBadge
        label="Sport"
        baseColor={categoryPalette.mint.base}
        colorVariantSeed={3}
        testID="badge"
      />
    );
    const firstBackground = flatten(first.getByTestId('badge').props.style).backgroundColor;
    first.unmount();

    const second = await render(
      <CategoryBadge
        label="Sport"
        baseColor={categoryPalette.mint.base}
        colorVariantSeed={3}
        testID="badge"
      />
    );
    const secondBackground = flatten(second.getByTestId('badge').props.style).backgroundColor;

    expect(firstBackground).toBe(secondBackground);
  });
});
