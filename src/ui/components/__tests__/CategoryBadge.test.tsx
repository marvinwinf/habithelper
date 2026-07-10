import { render, screen } from '@testing-library/react-native';

import { CategoryBadge } from '../CategoryBadge';
import { colors } from '../../theme';
import { legacyCategoryPalette } from '../../theme/categoryVariant';

describe('CategoryBadge', () => {
  it('renders the label', async () => {
    await render(<CategoryBadge label="Sport" />);
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('renders neutral regardless of the category color, per Quiet Atelier', async () => {
    await render(<CategoryBadge label="Haushalt" testID="badge" />);

    const badge = screen.getByTestId('badge');
    const badgeStyle = Array.isArray(badge.props.style)
      ? Object.assign({}, ...badge.props.style.filter(Boolean))
      : badge.props.style;

    expect(badgeStyle.backgroundColor).not.toBe(legacyCategoryPalette.lavender.base);
    expect(badgeStyle.borderColor).toBe(colors.border);
  });
});
