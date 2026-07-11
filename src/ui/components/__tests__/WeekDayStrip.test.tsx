import { render, screen } from '@testing-library/react-native';

import { WeekDayStrip } from '../WeekDayStrip';
import { colors } from '../../theme';

function flattenStyle(style: unknown) {
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
}

const WEEK = [
  '2026-07-06',
  '2026-07-07',
  '2026-07-08',
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-12',
];

describe('WeekDayStrip', () => {
  it('renders a weekday label and day number for every date', async () => {
    await render(<WeekDayStrip dates={WEEK} todayDate="2026-07-11" />);

    expect(screen.getByText('Mo')).toBeTruthy();
    expect(screen.getByText('So')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it("highlights today's day number in the on-accent color", async () => {
    await render(<WeekDayStrip dates={WEEK} todayDate="2026-07-11" testID="strip" />);

    expect(flattenStyle(screen.getByText('11').props.style).color).toBe(colors.textOnAccent);
    expect(flattenStyle(screen.getByText('6').props.style).color).toBe(colors.textPrimary);
  });
});
