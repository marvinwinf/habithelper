import { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useDrawIn } from '../animation/useDrawIn';
import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, spacing, typography } from '../theme';

export interface AreaChartPoint {
  label: string;
  /** Assumed to already be within [0, max]. */
  value: number;
}

export interface AreaChartGeometry {
  linePath: string;
  areaPath: string;
  points: { x: number; y: number }[];
}

/**
 * Pure geometry builder, exported for unit testing independent of layout —
 * `width`/`height` are the chart's pixel dimensions, `max` the value that
 * maps to the chart's top edge (defaults to 1, i.e. a completion-rate chart).
 */
export function buildAreaChartGeometry(
  values: number[],
  width: number,
  height: number,
  max = 1,
): AreaChartGeometry {
  if (values.length === 0 || width <= 0 || height <= 0) {
    return { linePath: '', areaPath: '', points: [] };
  }

  const safeMax = max <= 0 ? 1 : max;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const clamped = Math.min(safeMax, Math.max(0, value));
    const y = height - (clamped / safeMax) * height;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return { linePath, areaPath, points };
}

export interface AreaChartProps {
  data: AreaChartPoint[];
  max?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  testID?: string;
}

/**
 * Simple filled line/area chart, used by the Progress screen's
 * "completion over time" section (docs/SCREEN_SPECIFICATIONS.md). Width is
 * measured from the parent via onLayout so the chart fills its container.
 * The plot draws itself in left-to-right — a clipping wrapper widens over the
 * fixed-size Svg (useDrawIn) — replaying only when the plotted values change
 * and rendering fully drawn under reduced motion.
 */
export function AreaChart({
  data,
  max = 1,
  height = 140,
  lineColor = colors.accent,
  fillColor = colors.accent,
  testID,
}: AreaChartProps) {
  const [width, setWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const reveal = useDrawIn(
    width > 0 ? data.map((d) => d.value).join(',') : '',
    reducedMotion,
  );

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const { linePath, areaPath } = buildAreaChartGeometry(
    data.map((d) => d.value),
    width,
    height,
    max,
  );

  return (
    <View testID={testID}>
      <View style={{ height }} onLayout={handleLayout}>
        {width > 0 && (
          <Animated.View
            style={{
              height,
              overflow: 'hidden',
              width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          >
            <Svg width={width} height={height}>
              <Path d={areaPath} fill={fillColor} fillOpacity={0.15} stroke="none" />
              <Path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />
            </Svg>
          </Animated.View>
        )}
      </View>
      <View style={styles.labelRow}>
        {data.map((point) => (
          <Text key={point.label} style={styles.label}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
});
