import { Easing } from 'react-native';

// Shared ceiling for every short animation per docs/DESIGN_SYSTEM.md's Motion
// section.
export const MAX_SHORT_ANIMATION_DURATION_MS = 400;

// A gentle overshoot-and-settle curve shared by every "subtle spring"
// interaction (completion pop, milestone pulse), so motion feels consistent
// across the app. Built on Animated.timing (not Animated.spring) so the
// settle stays a fixed, testable duration rather than open-ended physics.
export const POP_EASING = Easing.out(Easing.back(1.7));
