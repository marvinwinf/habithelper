import { render, screen } from '@testing-library/react-native';

import { ProgressBar } from '../ProgressBar';
import { colors } from '../../theme';

describe('ProgressBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes the given value via accessibilityValue', async () => {
    await render(<ProgressBar value={0.5} testID="progress" />);
    const bar = screen.getByTestId('progress');

    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
  });

  it('clamps values above 1 to 100', async () => {
    await render(<ProgressBar value={1.5} testID="progress" />);
    expect(screen.getByTestId('progress').props.accessibilityValue.now).toBe(100);
  });

  it('clamps values below 0 to 0', async () => {
    await render(<ProgressBar value={-0.3} testID="progress" />);
    expect(screen.getByTestId('progress').props.accessibilityValue.now).toBe(0);
  });

  it('treats NaN as 0', async () => {
    await render(<ProgressBar value={NaN} testID="progress" />);
    expect(screen.getByTestId('progress').props.accessibilityValue.now).toBe(0);
  });

  it('uses the accent token as the default fill color', async () => {
    await render(<ProgressBar value={0.5} testID="progress" />);
    const fill = screen.getByTestId('progress-fill');
    const style = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.filter(Boolean))
      : fill.props.style;

    expect(style.backgroundColor).toBe(colors.accent);
  });

  it('accepts a custom fill color', async () => {
    await render(
      <ProgressBar value={0.5} fillColor={colors.destructive} testID="progress" />
    );
    const fill = screen.getByTestId('progress-fill');
    const style = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.filter(Boolean))
      : fill.props.style;

    expect(style.backgroundColor).toBe(colors.destructive);
  });
});
