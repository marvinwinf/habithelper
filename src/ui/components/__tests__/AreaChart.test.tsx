import { render, screen } from '@testing-library/react-native';

import { AreaChart, buildAreaChartGeometry } from '../AreaChart';

describe('buildAreaChartGeometry', () => {
  it('returns empty geometry for an empty dataset', () => {
    expect(buildAreaChartGeometry([], 300, 100)).toEqual({
      linePath: '',
      areaPath: '',
      points: [],
    });
  });

  it('maps a single point to the horizontal center', () => {
    const { points } = buildAreaChartGeometry([0.5], 300, 100);
    expect(points).toEqual([{ x: 150, y: 50 }]);
  });

  it('maps the first and last point to the chart edges', () => {
    const { points } = buildAreaChartGeometry([0, 0, 0], 300, 100);
    expect(points[0].x).toBe(0);
    expect(points[2].x).toBe(300);
  });

  it('maps a value of max to the top edge (y = 0)', () => {
    const { points } = buildAreaChartGeometry([1], 300, 100, 1);
    expect(points[0].y).toBe(0);
  });

  it('maps a value of 0 to the bottom edge (y = height)', () => {
    const { points } = buildAreaChartGeometry([0], 300, 100, 1);
    expect(points[0].y).toBe(100);
  });

  it('clamps values above max', () => {
    const { points } = buildAreaChartGeometry([2], 300, 100, 1);
    expect(points[0].y).toBe(0);
  });

  it('closes the area path down to the baseline', () => {
    const { areaPath } = buildAreaChartGeometry([1, 0], 300, 100, 1);
    expect(areaPath).toContain('L 300,100 L 0,100 Z');
  });
});

describe('AreaChart', () => {
  it('renders a label per data point', async () => {
    await render(
      <AreaChart
        data={[
          { label: 'Mo', value: 0.2 },
          { label: 'Di', value: 0.8 },
        ]}
        testID="chart"
      />,
    );
    expect(screen.getByText('Mo')).toBeTruthy();
    expect(screen.getByText('Di')).toBeTruthy();
  });
});
