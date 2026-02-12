import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Alarm } from '../types/alarm';

const ALARM_CHANNEL_ID = 'alarms';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 500, 500, 500],
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAlarm(alarm: Alarm): Promise<string> {
  const [hours, minutes] = alarm.time.split(':').map(Number);

  const title = alarm.icon
    ? `${alarm.icon} ${alarm.category.toUpperCase()}`
    : `\u23F0 ${alarm.category.toUpperCase()}`;

  let body: string;
  if (alarm.nickname) {
    body = alarm.nickname;
  } else if (alarm.icon) {
    body = alarm.icon;
  } else {
    body = 'Time to do the thing!';
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { alarmId: alarm.id },
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 500, 500, 500],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
      channelId: ALARM_CHANNEL_ID,
    },
  });

  return identifier;
}

export async function dismissAlarmNotification(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export async function cancelAlarm(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
