import * as Haptics from 'expo-haptics';

// Named wrappers around expo-haptics for each trigger point listed in
// docs/DESIGN_SYSTEM.md's Haptics section. Escalates Light -> Medium ->
// Heavy across the three completion-related triggers, with a distinct
// Success notification for the celebratory first-of-day trigger. Not wired
// to real events yet — that lands with the completion/gamification flows
// in later phases.

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
