/**
 * @format
 */

// Hermes does not ship TextEncoder/TextDecoder; @stomp/stompjs (chat + live
// listing events over WebSocket) requires them. Polyfill BEFORE anything else
// loads. (Live finding: entering Discover threw an uncaught
// "ReferenceError: Property 'TextDecoder' doesn't exist".)
import {TextEncoder, TextDecoder} from 'text-encoding-polyfill';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background FCM notification received:', remoteMessage);
  });
} catch (e) {
  // FCM disabled or native module unavailable
}

AppRegistry.registerComponent(appName, () => App);
