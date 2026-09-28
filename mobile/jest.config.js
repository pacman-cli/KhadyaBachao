module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-firebase|@react-native-google-signin|react-native-config)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
