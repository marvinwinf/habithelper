/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  // react-native-reanimated 4 splits its native module into react-native-
  // worklets; this resolver (its own documented Jest setup) makes imports
  // resolve to the non-native implementation under Jest instead of failing
  // to load the real native module.
  resolver: 'react-native-worklets/jest/resolver.js',
};
