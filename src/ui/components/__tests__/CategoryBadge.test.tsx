import { render, screen } from '@testing-library/react-native';

import { CategoryBadge } from '../CategoryBadge';
import { getCategoryColorVariant, legacyCategoryPalette } from '../../theme/categoryVariant';

describe('CategoryBadge', () => {
  it('renders the label', async () => {
    await render(
      <CategoryBadge label="Sport" baseColor={legacyCategoryPalette.mint.base} colorVariantSeed={2} />
    );
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('applies the same-family variant colors from T014s mapping function', async () => {
    const baseColor = legacyCategoryPalette.lavender.base;
    const seed = 3;
    const expectedVariant = getCategoryColorVariant(baseColor, seed);

    await render(
      <CategoryBadge label="Haushalt" baseColor={baseColor} colorVariantSeed={seed} testID="badge" />
    );

    const badge = screen.getByTestId('badge');
    const badgeStyle = Array.isArray(badge.props.style)
      ? Object.assign({}, ...badge.props.style.filter(Boolean))
      : badge.props.style;

    expect(badgeStyle.backgroundColor).toBe(expectedVariant.background);
  });

  it('throws for an unknown base color, same as the underlying mapping function', async () => {
    await expect(
      render(<CategoryBadge label="X" baseColor="#123456" colorVariantSeed={0} />)
    ).rejects.toThrow();
  });
});
