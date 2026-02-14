import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
  RepeatFrequency,
  AuthorizationStatus,
} from '@notifee/react-native';
import type { TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';
import { Alarm, AlarmDay, ALL_DAYS } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import { loadSettings } from './settings';

// Android notification channels are immutable after creation. Changing sound
// on an existing channel has no effect. We use 'alarms_v2' with the system
// alarm sound; the old 'alarms' channel is still created for backwards
// compatibility but no new notifications are scheduled to it.
const LEGACY_ALARM_CHANNEL_ID = 'alarms';
const ALARM_CHANNEL_ID = 'alarms_v2';
const TIMER_PROGRESS_CHANNEL_ID = 'timer-progress';
const REMINDER_CHANNEL_ID = 'reminders';

const DAY_INDEX: Record<AlarmDay, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

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

function getNextDayTimestamp(time: string, day: AlarmDay): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const target = DAY_INDEX[day];
  const today = now.getDay();

  let daysUntil = (target - today + 7) % 7;

  // If it's the same day, check if the time already passed
  if (daysUntil === 0) {
    const todayAtTime = new Date();
    todayAtTime.setHours(hours, minutes, 0, 0);
    if (todayAtTime.getTime() <= now.getTime()) {
      daysUntil = 7;
    }
  }

  const alarmDate = new Date();
  alarmDate.setDate(alarmDate.getDate() + daysUntil);
  alarmDate.setHours(hours, minutes, 0, 0);
  return alarmDate.getTime();
}

function getOneTimeTimestamp(time: string, dateStr: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const ts = d.getTime();
  if (ts <= Date.now()) {
    throw new Error('One-time alarm timestamp is in the past');
  }
  return ts;
}

let _channelPromise: Promise<void> | null = null;

export function setupNotificationChannel(): Promise<void> {
  if (_channelPromise) return _channelPromise;
  _channelPromise = _createChannels();
  return _channelPromise;
}

async function _createChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Legacy channel — kept so existing notifications are still visible
  await notifee.createChannel({
    id: LEGACY_ALARM_CHANNEL_ID,
    name: 'Alarms (Legacy)',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [1000, 500, 1000, 500],
    lights: true,
    lightColor: '#FF0000',
    bypassDnd: true,
  });

  // New alarm channel with system alarm sound
  await notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: 'Alarms',
    importance: AndroidImportance.HIGH,
    sound: 'alarm',
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

  await notifee.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Reminders',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });
}

export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function scheduleAlarm(alarm: Alarm): Promise<string[]> {
  await setupNotificationChannel();
  const settings = await loadSettings();

  let title: string;
  let body: string;

  if (settings.guessWhyEnabled) {
    title = '\u23F0 Alarm!';
    body = '\u{1F9E0} Can you remember why?';
  } else {
    title = alarm.icon
      ? `${alarm.icon} ${alarm.category.toUpperCase()}`
      : `\u23F0 ${alarm.category.toUpperCase()}`;

    if (alarm.private) {
      body = alarm.nickname || alarm.icon || 'Alarm';
    } else {
      body = alarm.nickname || alarm.icon || 'Time to do the thing!';
    }
  }

  const notificationPayload = {
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
      lights: ['#FF0000', 300, 600] as [string, number, number],
      ongoing: true,
      autoCancel: false,
      pressAction: {
        id: 'default',
      },
      category: AndroidCategory.ALARM,
    },
  };

  const mode = alarm.mode || 'recurring';
  const days = alarm.days || ALL_DAYS;

  if (mode === 'one-time' && alarm.date) {
    // One-time: single trigger, no repeat
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: getOneTimeTimestamp(alarm.time, alarm.date),
      alarmManager: { allowWhileIdle: true },
    };
    const id = await notifee.createTriggerNotification(notificationPayload, trigger);
    return [id];
  }

  if (days.length === 7) {
    // Recurring every day: single daily trigger
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: getNextAlarmTimestamp(alarm.time),
      alarmManager: { allowWhileIdle: true },
      repeatFrequency: RepeatFrequency.DAILY,
    };
    const id = await notifee.createTriggerNotification(notificationPayload, trigger);
    return [id];
  }

  // Recurring specific days: one weekly trigger per day
  const ids: string[] = [];
  for (const day of days) {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: getNextDayTimestamp(alarm.time, day),
      alarmManager: { allowWhileIdle: true },
      repeatFrequency: RepeatFrequency.WEEKLY,
    };
    const id = await notifee.createTriggerNotification(notificationPayload, trigger);
    ids.push(id);
  }
  return ids;
}

export async function dismissAlarmNotification(notificationId: string): Promise<void> {
  await notifee.cancelNotification(notificationId);
}

export async function cancelAlarm(identifier: string): Promise<void> {
  // Cancel both the scheduled trigger and any displayed notification
  await notifee.cancelTriggerNotification(identifier);
  await notifee.cancelNotification(identifier);
}

export async function cancelAlarmNotifications(ids: string[]): Promise<void> {
  for (const id of ids) {
    await notifee.cancelTriggerNotification(id);
    await notifee.cancelNotification(id);
  }
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

// --- Reminder notifications ---

export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  // No time set means no notification
  if (!reminder.dueTime) return null;

  await setupNotificationChannel();

  const [hours, minutes] = reminder.dueTime.split(':').map(Number);
  let timestamp: number;

  if (reminder.dueDate) {
    // Both date and time: schedule for exact date+time
    const [year, month, day] = reminder.dueDate.split('-').map(Number);
    timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  } else {
    // Time only, no date: schedule for today; if passed, schedule for tomorrow
    const now = new Date();
    const target = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
      hours, minutes, 0, 0,
    );
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    timestamp = target.getTime();
  }

  if (timestamp <= Date.now()) return null;

  const title = reminder.private
    ? '\u{1F4DD} Reminder'
    : `${reminder.icon} ${reminder.text}`;
  const body = reminder.private
    ? 'You had something to remember...'
    : "Don't forget!";

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: { allowWhileIdle: true },
  };

  return await notifee.createTriggerNotification(
    {
      title,
      body,
      data: { reminderId: reminder.id },
      android: {
        channelId: REMINDER_CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function cancelReminderNotification(notificationId: string): Promise<void> {
  await notifee.cancelTriggerNotification(notificationId);
  await notifee.cancelNotification(notificationId);
}
