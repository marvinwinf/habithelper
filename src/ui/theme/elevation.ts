// Elevation per docs/DESIGN_SYSTEM.md's Soft Momentum direction: cards read
// as soft paper. Tonal surface contrast (surface vs. background) does most of
// the layering; `softShadow` reinforces it with an extremely subtle, warm,
// low-opacity shadow so a card lifts gently off the background — never a hard
// Material drop shadow. Kept barely perceptible on purpose.

import type { ViewStyle } from 'react-native';

import { colors } from './colors';

export const softShadow: ViewStyle = {
  // iOS shadow (warm, so it reads as paper rather than a grey box).
  shadowColor: colors.textPrimary,
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  // Android — kept minimal so the shadow stays a whisper, not a slab.
  elevation: 2,
};
