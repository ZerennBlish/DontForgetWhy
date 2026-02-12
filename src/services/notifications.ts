import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
  RepeatFrequency,
  AuthorizationStatus,
} from '@notifee/react-native';
import type { TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';
import { Alarm } from '../types/alarm';

const ALARM_CHANNEL_ID = 'alarms';

function getNextAlarmTimestamp(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hours, minutes, 0, 0);

  // If the time already passed today, schedule for tomorrow
  if (alarmDate.getTime() <= now.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }

  return alarmDate.getTime();
}

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: 'Alarms',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [1000, 500, 1000, 500],
    lights: true,
    lightColor: '#FF0000',
    bypassDnd: true,
  });
}

export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function scheduleAlarm(alarm: Alarm): Promise<string> {
  const title = alarm.icon
    ? `${alarm.icon} ${alarm.category.toUpperCase()}`
    : `\u23F0 ${alarm.category.toUpperCase()}`;

  // Respect privacy: never show the note in the notification
  let body: string;
  if (alarm.private) {
    body = alarm.nickname || alarm.icon || 'Alarm';
  } else {
    body = alarm.nickname || alarm.icon || 'Time to do the thing!';
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: getNextAlarmTimestamp(alarm.time),
    alarmManager: {
      allowWhileIdle: true,
    },
    repeatFrequency: RepeatFrequency.DAILY,
  };

  const notificationId = await notifee.createTriggerNotification(
    {
      title,
      body,
      data: { alarmId: alarm.id },
      android: {
        channelId: ALARM_CHANNEL_ID,
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        importance: AndroidImportance.HIGH,
        sound: 'default',
        loopSound: true,
        vibrationPattern: [1000, 500, 1000, 500],
        lights: ['#FF0000', 300, 600],
        ongoing: true,
        autoCancel: false,
        pressAction: {
          id: 'default',
        },
        category: AndroidCategory.ALARM,
      },
    },
    trigger,
  );

  return notificationId;
}

export async function dismissAlarmNotification(): Promise<void> {
  // Cancel all displayed notifications (does NOT cancel scheduled triggers)
  await notifee.cancelAllNotifications();
}

export async function cancelAlarm(identifier: string): Promise<void> {
  // Cancel both the scheduled trigger and any displayed notification
  await notifee.cancelTriggerNotification(identifier);
  await notifee.cancelNotification(identifier);
}

export async function cancelAllAlarms(): Promise<void> {
  await notifee.cancelTriggerNotifications();
  await notifee.cancelAllNotifications();
}

export async function scheduleTimerNotification(
  label: string,
  icon: string,
  completionTimestamp: number,
): Promise<string> {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: completionTimestamp,
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  return await notifee.createTriggerNotification(
    {
      title: `${icon} Timer Complete`,
      body: `${label} is done!`,
      data: { timerId: 'true' },
      android: {
        channelId: ALARM_CHANNEL_ID,
        fullScreenAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
        sound: 'default',
        loopSound: true,
        ongoing: true,
        autoCancel: false,
        vibrationPattern: [1000, 500, 1000, 500],
        pressAction: {
          id: 'default',
        },
        category: AndroidCategory.ALARM,
      },
    },
    trigger,
  );
}

export async function cancelTimerNotification(identifier: string): Promise<void> {
  await notifee.cancelTriggerNotification(identifier);
  await notifee.cancelNotification(identifier);
}
