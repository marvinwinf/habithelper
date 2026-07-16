import { Easing } from 'react-native';

// Shared ceiling for every short animation per docs/DESIGN_SYSTEM.md's Motion
// section.
export const MAX_SHORT_ANIMATION_DURATION_MS = 400;

// A gentle overshoot-and-settle curve shared by every "subtle spring"
// interaction (completion pop, milestone pulse), so motion feels consistent
// across the app. Built on Animated.timing (not Animated.spring) so the
// settle stays a fixed, testable duration rather than open-ended physics.
export const POP_EASING = Easing.out(Easing.back(1.7));

// Ease-out shared by progress fills and draw-ins (ring/donut sweep, chart
// reveal, stat count-up): a quick start that settles gently, no overshoot —
// filling progress should feel like momentum, not a bounce.
export const FILL_EASING = Easing.out(Easing.cubic);
