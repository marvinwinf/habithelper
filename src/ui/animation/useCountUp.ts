import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { FILL_EASING } from './constants';

export const COUNT_UP_ANIMATION_DURATION_MS = 350;

export interface StatValueParts {
  prefix: string;
  target: number;
  suffix: string;
}

/**
 * Splits a display string like "85%" / "12" / "~3 Tage" into the first whole
 * number and the text around it, so the number can count up while the rest
 * stays fixed. Returns null when the string carries no number to animate.
 */
export function splitStatValue(value: string): StatValueParts | null {
  const match = /^(\D*?)(\d+)(.*)$/s.exec(value);
  if (!match) {
    return null;
  }
  return { prefix: match[1], target: Number(match[2]), suffix: match[3] };
}

/**
 * Counts a stat's number up to its value — 0 → target on first render, then
 * from the previously shown number whenever the value changes — so Progress
 * numbers feel earned rather than printed (docs/DESIGN_SYSTEM.md's Motion
 * section). Strings without a number, and any value under reduced motion,
 * render as-is immediately.
 */
export function useCountUpText(value: string, reducedMotion: boolean): string {
  // Non-animatable values (no number / reduced motion) render `value`
  // directly below; `text` only carries the in-flight count.
  const animate = splitStatValue(value) !== null && !reducedMotion;
  const [text, setText] = useState(() => {
    const parts = splitStatValue(value);
    return parts ? `${parts.prefix}0${parts.suffix}` : value;
  });
  const [counter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const parts = splitStatValue(value);
    if (parts === null || reducedMotion) {
      return;
    }
    const format = (shown: number) => `${parts.prefix}${shown}${parts.suffix}`;
    const listener = counter.addListener(({ value: current }) =>
      setText(format(Math.round(current))),
    );
    const animation = Animated.timing(counter, {
      toValue: parts.target,
      duration: COUNT_UP_ANIMATION_DURATION_MS,
      easing: FILL_EASING,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        setText(format(parts.target));
      }
    });
    return () => {
      counter.removeListener(listener);
      animation.stop();
    };
  }, [counter, value, reducedMotion]);

  return animate ? text : value;
}
