// Shared ceiling for plain fades/timings per docs/DESIGN_SYSTEM.md's Motion
// section. Spring-based interactions (completion, milestones) settle on
// their own physics rather than a fixed duration, so they aren't bound by
// this constant.
export const MAX_SHORT_ANIMATION_DURATION_MS = 400;

// A single gentle spring config shared by every "subtle spring" interaction
// (completion pop, milestone pulse), so motion feels consistent across the
// app rather than each hook picking its own tuning. High friction relative to
// tension keeps it a quick settle, not a bounce.
export const GENTLE_SPRING = {
  friction: 8,
  tension: 140,
  useNativeDriver: true,
} as const;
