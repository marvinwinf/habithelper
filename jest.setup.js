/* global jest */
// ReorderableList (T032) uses react-native-gesture-handler directly; this is
// gesture-handler's own documented Jest setup for mocking its native module.
require('react-native-gesture-handler/jestSetup');

// expo-notifications (T091, daily reminder) resolves several native modules
// at import time — merely importing it under Jest throws. The scheduling
// *decisions* are tested against fake ports (reminderScheduler.test.ts); this
// stub only has to make the thin native wrapper (expoReminders.ts) importable,
// so anything that reaches these functions in a test is a no-op.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'habithelper-daily-reminder'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// @react-native-community/datetimepicker (task date field) has no real
// TurboModule under Jest; each native spec throws just from being imported
// unless stubbed first, which its own jest/ test helper does not do for you.
for (const spec of [
  'NativeModuleDatePicker',
  'NativeModuleTimePicker',
  'NativeModuleMaterialDatePicker',
  'NativeModuleMaterialTimePicker',
]) {
  jest.mock(`@react-native-community/datetimepicker/src/specs/${spec}`, () => ({
    __esModule: true,
    default: { open: jest.fn(), dismiss: jest.fn() },
  }));
}
