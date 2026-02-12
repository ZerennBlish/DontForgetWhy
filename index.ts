import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from '@notifee/react-native';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

// notifee requires a background event handler registered before the app component.
// When the user presses a notification while the app is killed, the app launches
// and getInitialNotification() in App.tsx handles the navigation.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    // App will launch — getInitialNotification handles navigation
  }
  if (type === EventType.DISMISSED) {
    // User swiped away the notification (if not ongoing)
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
