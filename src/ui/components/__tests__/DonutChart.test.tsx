import { render, screen } from '@testing-library/react-native';

import { DonutChart, buildDonutSegments } from '../DonutChart';

describe('buildDonutSegments', () => {
  it('returns no geometry when all values are zero', () => {
    expect(buildDonutSegments([{ label: 'A', value: 0, color: '#000' }], 50)).toEqual([]);
  });

  it('returns no geometry for an empty segment list', () => {
    expect(buildDonutSegments([], 50)).toEqual([]);
  });

  it('splits two equal segments into two 50% arcs', () => {
    const geometry = buildDonutSegments(
      [
        { label: 'A', value: 1, color: '#111' },
        { label: 'B', value: 1, color: '#222' },
      ],
      50,
    );
    expect(geometry.map((g) => g.percentage)).toEqual([50, 50]);
  });

  it('places the second segment starting where the first ends', () => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const geometry = buildDonutSegments(
      [
        { label: 'A', value: 1, color: '#111' },
        { label: 'B', value: 3, color: '#222' },
      ],
      radius,
    );
    expect(geometry[0].percentage).toBe(25);
    expect(geometry[1].strokeDashoffset).toBeCloseTo(-0.25 * circumference);
  });

  it('ignores negative values as zero contribution', () => {
    const geometry = buildDonutSegments(
      [
        { label: 'A', value: 1, color: '#111' },
        { label: 'B', value: -5, color: '#222' },
      ],
      50,
    );
    expect(geometry.map((g) => g.percentage)).toEqual([100, 0]);
  });
});

describe('DonutChart', () => {
  it('renders a legend row with label and percentage per segment', async () => {
    await render(
      <DonutChart
        segments={[
          { label: 'Bewegung', value: 2, color: '#111' },
          { label: 'Fokus', value: 2, color: '#222' },
        ]}
        testID="donut"
      />,
    );
    expect(screen.getByText('Bewegung')).toBeTruthy();
    expect(screen.getByText('Fokus')).toBeTruthy();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });
});
