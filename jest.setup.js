/* global jest */
// ReorderableList (T032) uses react-native-gesture-handler directly; this is
// gesture-handler's own documented Jest setup for mocking its native module.
require('react-native-gesture-handler/jestSetup');

// expo-notifications (T092's local daily reminder) is a native module with no
// Jest implementation; importing it alone is harmless but every call throws.
// Mocked here rather than per test file so any screen that transitively pulls
// in reminderService still renders. The enums are re-declared with their real
// values so the service's trigger payload stays assertable.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { UNKNOWN: 0, UNSPECIFIED: 1, NONE: 2, MIN: 3, LOW: 4, DEFAULT: 5, HIGH: 6, MAX: 7 },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
    status: 'granted',
  })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));

// expo-audio (T099's optional completion chime) is a native module; each
// created player is a plain object of jest.fns so tests can assert playback.
jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    remove: jest.fn(),
  })),
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
