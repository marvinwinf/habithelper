// @react-native-community/datetimepicker ships this test helper as plain JS
// with no accompanying types (see node_modules/.../jest/index.js).
declare module '@react-native-community/datetimepicker/jest' {
  export function mockAndroidDialogDateChange(datePickedByUser: Date): void;
  export function mockAndroidDialogDismissal(): void;
}
