import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Daypart } from '../../domain/daypart';
import { FILL_EASING, MAX_SHORT_ANIMATION_DURATION_MS } from '../animation/constants';
import { colors } from '../theme';
import { daypartThemes } from '../theme/daypart';

export const DAYPART_BACKDROP_HEIGHT = 340;
const GLOW_SIZE = 220;
// How far the sun/moon disc rises into place on mount.
const GLOW_RISE_PX = 16;

export interface DaypartBackdropProps {
  daypart: Daypart;
  reducedMotion: boolean;
  testID?: string;
}

/**
 * The Today screen's ambient sky (docs/DESIGN_SYSTEM.md's Daypart Ambience):
 * a pale, daypart-tinted wash that fades into the app background, with a
 * soft sun/moon disc behind the header's top-right corner. Purely decorative
 * — hidden from accessibility, never intercepts touches.
 *
 * Motion is one short settle, never a loop: the wash fades in and the disc
 * rises a few pixels into place when the screen mounts and whenever the
 * daypart changes. Reduced motion shows the final state instantly.
 */
export function DaypartBackdrop({ daypart, reducedMotion, testID }: DaypartBackdropProps) {
  const theme = daypartThemes[daypart];
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: MAX_SHORT_ANIMATION_DURATION_MS,
      easing: FILL_EASING,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [daypart, progress, reducedMotion]);

  const glowTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [GLOW_RISE_PX, 0],
  });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
      testID={testID}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="daypart-sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.sky} stopOpacity={1} />
              <Stop offset="0.55" stopColor={theme.sky} stopOpacity={0.6} />
              <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#daypart-sky)" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.glow, { opacity: progress, transform: [{ translateY: glowTranslateY }] }]}
        testID={testID ? `${testID}-glow` : undefined}
      >
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="daypart-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={theme.glow} stopOpacity={0.9} />
              <Stop offset="0.45" stopColor={theme.glow} stopOpacity={0.45} />
              <Stop offset="1" stopColor={theme.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#daypart-glow)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DAYPART_BACKDROP_HEIGHT,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -GLOW_SIZE / 3,
    right: -GLOW_SIZE / 4,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
});
