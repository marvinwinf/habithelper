import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing, typography } from '../theme';

export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartSegmentGeometry {
  label: string;
  color: string;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

/**
 * Pure geometry builder, exported for unit testing: converts segment values
 * into stroke-dasharray/dashoffset pairs that draw consecutive arcs around a
 * circle of the given radius, starting at 12 o'clock. Segments summing to
 * zero (or an empty list) produce no geometry rather than dividing by zero.
 */
export function buildDonutSegments(
  segments: readonly DonutChartSegment[],
  radius: number,
): DonutChartSegmentGeometry[] {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) {
    return [];
  }

  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return segments.map((segment) => {
    const clamped = Math.max(0, segment.value);
    const fraction = clamped / total;
    const dasharray = `${circumference * fraction} ${circumference * (1 - fraction)}`;
    const dashoffset = -cumulative * circumference;
    cumulative += fraction;
    return {
      label: segment.label,
      color: segment.color,
      percentage: Math.round(fraction * 100),
      strokeDasharray: dasharray,
      strokeDashoffset: dashoffset,
    };
  });
}

export interface DonutChartProps {
  segments: readonly DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

/**
 * Segmented ring + external legend, used by the Progress screen's habit
 * breakdown (docs/SCREEN_SPECIFICATIONS.md's Progress Screen section).
 */
export function DonutChart({ segments, size = 120, strokeWidth = 20, testID }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const geometry = buildDonutSegments(segments, radius);

  return (
    <View style={styles.row} testID={testID}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {geometry.length === 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.surfaceMuted}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            geometry.map((segment) => (
              <Circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                rotation="-90"
                origin={`${center}, ${center}`}
              />
            ))
          )}
        </Svg>
      </View>
      <View style={styles.legend}>
        {geometry.map((segment) => (
          <View key={segment.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {segment.label}
            </Text>
            <Text style={styles.legendPercentage}>{segment.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legend: {
    flex: 1,
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: typography.bodySmall.fontSize,
    color: colors.textPrimary,
  },
  legendPercentage: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
});
