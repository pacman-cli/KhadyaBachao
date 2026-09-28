/* global jest */
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:8080',
}));
jest.mock('@react-native-firebase/app', () => ({}));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({currentUser: null})),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  getIdToken: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getToken: jest.fn(),
  onMessage: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({data: {idToken: 'mock-id-token'}}),
  },
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  setConfiguration: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MockMap = props => React.createElement('MapView', props);
  const MockMarker = props => React.createElement('Marker', props);
  return {
    __esModule: true,
    default: MockMap,
    MapView: MockMap,
    Marker: MockMarker,
  };
});

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(undefined),
  getGenericPassword: jest.fn().mockResolvedValue(null),
  resetGenericPassword: jest.fn().mockResolvedValue(undefined),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
}));
