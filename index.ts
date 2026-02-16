import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from '@notifee/react-native';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import { loadAlarms, disableAlarm } from './src/services/storage';
import { refreshTimerWidget } from './src/widget/updateWidget';
import { setPendingAlarm } from './src/services/pendingAlarm';

// notifee requires a background event handler registered before the app component.
//
// Key events for alarm navigation:
// - PRESS (1): User tapped the notification
// - DELIVERED (3): Notification was displayed — this is what fires when
//   fullScreenAction triggers and wakes the screen
//
// We store the alarm/timer data SYNCHRONOUSLY in a module-level variable
// (pendingAlarm) so App.tsx can read it during initialization and render
// AlarmFireScreen as the initial route — no flash of AlarmListScreen.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const notifId = detail.notification?.id;
  const alarmId = detail.notification?.data?.alarmId as string | undefined;
  const timerId = detail.notification?.data?.timerId as string | undefined;
  console.log('[NOTIF] onBackgroundEvent type:', type, 'notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

  if (type === EventType.PRESS || type === EventType.DELIVERED) {
    // Filter: only store pending data for alarm/timer COMPLETION notifications.
    // Skip timer countdown notifications (id starts with 'countdown-'),
    // reminders (have reminderId, no alarmId), and previews (no data).
    if (timerId && notifId && !notifId.startsWith('countdown-')) {
      const tIcon = detail.notification?.title?.replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
      const tLabel = detail.notification?.body?.replace(' is done!', '').trim() || 'Timer';
      setPendingAlarm({
        timerId,
        notificationId: notifId,
        timerLabel: tLabel,
        timerIcon: tIcon,
      });
      console.log('[NOTIF] BACKGROUND — stored pending timer data for App.tsx');
    } else if (alarmId && notifId) {
      setPendingAlarm({
        alarmId,
        notificationId: notifId,
      });
      console.log('[NOTIF] BACKGROUND — stored pending alarm data for App.tsx');
    }
  }

  if (type === EventType.DISMISSED) {
    console.log('[NOTIF] BACKGROUND DISMISSED — alarmId:', alarmId);
    if (alarmId) {
      try {
        const alarms = await loadAlarms();
        const alarm = alarms.find((a) => a.id === alarmId);
        if (alarm?.mode === 'one-time') {
          await disableAlarm(alarmId);
          await refreshTimerWidget();
        }
      } catch {}
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
