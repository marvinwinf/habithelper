import * as Haptics from 'expo-haptics';

// Named wrappers around expo-haptics for each trigger point listed in
// docs/DESIGN_SYSTEM.md's Haptics section. Escalates Light -> Medium ->
// Heavy across the three completion-related triggers, with a distinct
// Success notification for the celebratory first-of-day trigger, and a
// two-beat pattern for finishing the whole day.

export function triggerRoutineCompletionHaptic(): Promise<void> {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function triggerExceededCompletionHaptic(): Promise<void> {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function triggerFirstCompletionOfDayHaptic(): Promise<void> {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function triggerLevelMilestoneHaptic(): Promise<void> {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// Gap between the day-complete pattern's two beats: long enough to feel as
// two distinct taps, short enough to read as one gesture.
export const DAY_COMPLETE_SECOND_BEAT_MS = 160;

/**
 * Finishing the day's last routine (T099): a soft two-beat "da-dum" — a
 * Success notification followed by a light tap — so it feels different from
 * any single completion without being louder than the level-up milestone.
 */
export async function triggerDayCompleteHaptic(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await new Promise((resolve) => setTimeout(resolve, DAY_COMPLETE_SECOND_BEAT_MS));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
