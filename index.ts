import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from '@notifee/react-native';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import { loadAlarms, disableAlarm } from './src/services/storage';
import { refreshTimerWidget } from './src/widget/updateWidget';

// notifee requires a background event handler registered before the app component.
// When the user presses a notification while the app is killed, the app launches
// and getInitialNotification() in App.tsx handles the navigation.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const notifId = detail.notification?.id;
  const alarmId = detail.notification?.data?.alarmId as string | undefined;
  const timerId = detail.notification?.data?.timerId as string | undefined;
  console.log('[NOTIF] onBackgroundEvent type:', type, 'notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

  if (type === EventType.PRESS) {
    // Cancel notification immediately to stop sound/vibration
    if (notifId) {
      console.log('[NOTIF] BACKGROUND PRESS — cancelling notification:', notifId);
      try {
        await notifee.cancelNotification(notifId);
        console.log('[NOTIF] BACKGROUND PRESS — notification cancelled:', notifId);
      } catch (e) {
        console.log('[NOTIF] BACKGROUND PRESS — cancelNotification FAILED:', notifId, e);
      }
    } else {
      console.log('[NOTIF] BACKGROUND PRESS — WARNING: no notification ID available');
    }
    // App will launch — getInitialNotification handles navigation
  }
  if (type === EventType.DISMISSED) {
    console.log('[NOTIF] BACKGROUND DISMISSED — alarmId:', alarmId);
    if (alarmId) {
      const alarms = await loadAlarms();
      const alarm = alarms.find((a) => a.id === alarmId);
      if (alarm?.mode === 'one-time') {
        await disableAlarm(alarmId);
        await refreshTimerWidget();
      }
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
