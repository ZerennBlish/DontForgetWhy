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
import { loadSettings } from './settings';

const ALARM_CHANNEL_ID = 'alarms';
const TIMER_PROGRESS_CHANNEL_ID = 'timer-progress';

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

let _channelPromise: Promise<void> | null = null;

export function setupNotificationChannel(): Promise<void> {
  if (_channelPromise) return _channelPromise;
  _channelPromise = _createChannels();
  return _channelPromise;
}

async function _createChannels(): Promise<void> {
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

  await notifee.createChannel({
    id: TIMER_PROGRESS_CHANNEL_ID,
    name: 'Timer Progress',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
  });
}

export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function scheduleAlarm(alarm: Alarm): Promise<string> {
  await setupNotificationChannel();
  const settings = await loadSettings();

  let title: string;
  let body: string;

  if (settings.guessWhyEnabled) {
    // Hide all alarm details when Guess Why is active
    title = '\u23F0 Alarm!';
    body = '\u{1F9E0} Can you remember why?';
  } else {
    title = alarm.icon
      ? `${alarm.icon} ${alarm.category.toUpperCase()}`
      : `\u23F0 ${alarm.category.toUpperCase()}`;

    // Respect privacy: never show the note in the notification
    if (alarm.private) {
      body = alarm.nickname || alarm.icon || 'Alarm';
    } else {
      body = alarm.nickname || alarm.icon || 'Time to do the thing!';
    }
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

export async function dismissAlarmNotification(notificationId: string): Promise<void> {
  await notifee.cancelNotification(notificationId);
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
  timerId: string,
): Promise<string> {
  await setupNotificationChannel();
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
      data: { timerId },
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

export async function showTimerCountdownNotification(
  label: string,
  icon: string,
  completionTimestamp: number,
  timerId: string,
): Promise<void> {
  await setupNotificationChannel();
  await notifee.displayNotification({
    id: `countdown-${timerId}`,
    title: `${icon} ${label}`,
    body: 'Timer running',
    android: {
      channelId: TIMER_PROGRESS_CHANNEL_ID,
      ongoing: true,
      autoCancel: false,
      showChronometer: true,
      chronometerDirection: 'down',
      timestamp: completionTimestamp,
      pressAction: {
        id: 'default',
      },
    },
  });
}

export async function cancelTimerCountdownNotification(timerId: string): Promise<void> {
  await notifee.cancelNotification(`countdown-${timerId}`);
}
