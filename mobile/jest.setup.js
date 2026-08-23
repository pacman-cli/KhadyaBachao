jest.mock('react-native-config', () => ({}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
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
