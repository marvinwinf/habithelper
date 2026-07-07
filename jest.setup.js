/* global jest */
// ReorderableList (T032) uses react-native-gesture-handler directly; this is
// gesture-handler's own documented Jest setup for mocking its native module.
require('react-native-gesture-handler/jestSetup');

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
