import { render, screen } from '@testing-library/react-native';

import { RingProgress, clampRingValue } from '../RingProgress';

describe('clampRingValue', () => {
  it('clamps above 1 to 1', () => {
    expect(clampRingValue(1.5)).toBe(1);
  });

  it('clamps below 0 to 0', () => {
    expect(clampRingValue(-0.3)).toBe(0);
  });

  it('treats NaN as 0', () => {
    expect(clampRingValue(NaN)).toBe(0);
  });

  it('passes through in-range values', () => {
    expect(clampRingValue(0.42)).toBe(0.42);
  });
});

describe('RingProgress', () => {
  it('renders the fill circle with a dash offset proportional to the value', async () => {
    await render(<RingProgress value={0.5} size={100} strokeWidth={10} testID="ring" />);
    const fill = screen.getByTestId('ring-fill');
    const radius = (100 - 10) / 2;
    const circumference = 2 * Math.PI * radius;

    expect(fill.props.strokeDashoffset).toBeCloseTo(circumference * 0.5);
  });

  it('renders a full offset (empty ring) at value 0', async () => {
    await render(<RingProgress value={0} size={100} strokeWidth={10} testID="ring" />);
    const fill = screen.getByTestId('ring-fill');
    const radius = (100 - 10) / 2;
    const circumference = 2 * Math.PI * radius;

    expect(fill.props.strokeDashoffset).toBeCloseTo(circumference);
  });

  it('renders a zero (or unset) offset (full ring) at value 1', async () => {
    await render(<RingProgress value={1} size={100} strokeWidth={10} testID="ring" />);
    const fill = screen.getByTestId('ring-fill');

    // react-native-svg normalizes a strokeDashoffset of exactly 0 to null
    // rather than passing the literal number through.
    expect(fill.props.strokeDashoffset ?? 0).toBe(0);
  });

  it('renders the given label centered', async () => {
    await render(<RingProgress value={0.5} label="12" testID="ring" />);
    expect(screen.getByText('12')).toBeTruthy();
  });
});
