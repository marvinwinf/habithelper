/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  // react-native-reanimated 4 splits its native module into react-native-
  // worklets; this resolver (its own documented Jest setup) makes imports
  // resolve to the non-native implementation under Jest instead of failing
  // to load the real native module.
  resolver: 'react-native-worklets/jest/resolver.js',
  // @react-native/jest-preset defaults haste's platform to iOS; this project
  // is Android-only (see CLAUDE.md), so platform-suffixed modules (e.g.
  // Foo.android.js) must resolve to their Android variant under test too.
  haste: {
    defaultPlatform: 'android',
    platforms: ['android', 'ios', 'native'],
  },
};
