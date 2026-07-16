import type { ViewStyle } from 'react-native';

// Shared "pressed" feedback tokens per docs/DESIGN_SYSTEM.md's Motion
// section. Soft Momentum pairs a gentle opacity dip with a small scale-down,
// so a tap reads as tactile rather than a flat color change.
export const pressedOpacity = 0.85;
export const pressedScale = 0.96;

// The two tokens composed into one ready-to-spread pressed style, so every
// Pressable applies the identical feedback (opacity dip + scale-down) instead
// of re-assembling it — and so none forgets the scale half.
export const pressedFeedback: ViewStyle = {
  opacity: pressedOpacity,
  transform: [{ scale: pressedScale }],
};
