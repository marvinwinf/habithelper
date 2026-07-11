import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, typography } from '../theme';

export interface RingProgressProps {
  /** 0–1; values outside this range are clamped. */
  value: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  /** Centered content, e.g. the streak number — falls back to a percentage label. */
  label?: string;
  testID?: string;
}

export function clampRingValue(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Circular progress ring used by the Progress screen's streak hero
 * (docs/DESIGN_SYSTEM.md's Streak Ring section) — not used elsewhere; the
 * plain bold numeral remains the streak treatment on Today/routine detail.
 */
export function RingProgress({
  value,
  size = 120,
  strokeWidth = 12,
  trackColor = colors.surfaceMuted,
  fillColor = colors.accent,
  label,
  testID,
}: RingProgressProps) {
  const clamped = clampRingValue(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }} testID={testID}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          testID={testID ? `${testID}-fill` : undefined}
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          // Start the fill at 12 o'clock rather than SVG's default 3 o'clock.
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      {label !== undefined && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.centerContent}>
            <Text style={styles.label}>{label}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.title.fontFamily,
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
});
