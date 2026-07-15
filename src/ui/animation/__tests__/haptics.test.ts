import * as Haptics from 'expo-haptics';

import {
  triggerAllRoutinesDoneHaptic,
  triggerExceededCompletionHaptic,
  triggerFirstCompletionOfDayHaptic,
  triggerLevelMilestoneHaptic,
  triggerRoutineCompletionHaptic,
} from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('haptics', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('triggers a light impact for routine completion', () => {
    triggerRoutineCompletionHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('triggers a medium impact for exceeded completion', () => {
    triggerExceededCompletionHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('triggers a success notification for the first completion of the day', () => {
    triggerFirstCompletionOfDayHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('triggers a success notification for the all-routines-done milestone', () => {
    triggerAllRoutinesDoneHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('triggers a heavy impact for a level milestone', () => {
    triggerLevelMilestoneHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('gives each completion-related trigger a distinct impact style', () => {
    triggerRoutineCompletionHaptic();
    triggerExceededCompletionHaptic();
    triggerLevelMilestoneHaptic();

    const styles = (Haptics.impactAsync as jest.Mock).mock.calls.map((call) => call[0]);
    expect(new Set(styles).size).toBe(3);
  });
});
