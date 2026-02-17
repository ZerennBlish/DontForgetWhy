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
    vibrationPattern: [300, 300, 300, 300],
    lights: true,
    lightColor: '#FF0000',
    bypassDnd: true,
  });

  // Default alarm channel with system alarm sound
  await notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: 'Alarms',
    importance: AndroidImportance.HIGH,
    sound: 'alarm',
    vibration: true,
    vibrationPattern: [300, 300],
    lights: true,
    lightColor: '#FF0000',
    bypassDnd: true,
  });

  // Gentle — lower importance for softer delivery
  await notifee.createChannel({
    id: 'alarms_gentle',
    name: 'Alarms (Gentle)',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
    vibrationPattern: [100, 200],
    lights: true,
    lightColor: '#FFD700',
    bypassDnd: true,
  });

  // Urgent — aggressive vibration pattern
  await notifee.createChannel({
    id: 'alarms_urgent',
    name: 'Alarms (Urgent)',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [250, 250, 250, 250, 250, 250],
    lights: true,
    lightColor: '#FF0000',
    bypassDnd: true,
  });

  // Classic — standard vibration, high importance
  await notifee.createChannel({
    id: 'alarms_classic',
    name: 'Alarms (Classic)',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 300, 300, 300],
    lights: true,
    lightColor: '#FF6600',
    bypassDnd: true,
  });

  // Digital — short staccato vibration
  await notifee.createChannel({
    id: 'alarms_digital',
    name: 'Alarms (Digital)',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [100, 100, 100, 100],
    lights: true,
    lightColor: '#00FF00',
    bypassDnd: true,
  });

  // Silent — vibration only, no sound
  await notifee.createChannel({
    id: 'alarms_silent',
    name: 'Alarms (Silent)',
    importance: AndroidImportance.LOW,
    vibration: true,
    vibrationPattern: [500, 500],
    lights: true,
    lightColor: '#808080',
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

// --- Dynamic channel creation for custom alarm sounds ---

function extractMediaId(uri: string): string {
  // Pull numeric ID from content://media/internal/audio/media/1234
  const match = uri.match(/\/(\d+)$/);
  if (match) return match[1];
  // Fallback: simple hash of the full URI
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = ((hash << 5) - hash + uri.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function getOrCreateSoundChannel(
  soundUri: string,
  soundName: string,
  channelPrefix = 'alarm_custom_',
): Promise<string> {
  const channelId = `${channelPrefix}${extractMediaId(soundUri)}`;
  const typeLabel = channelPrefix.startsWith('timer') ? 'Timer' : 'Alarm';
  await notifee.createChannel({
    id: channelId,
    name: `${typeLabel}: ${soundName}`,
    importance: AndroidImportance.HIGH,
    bypassDnd: true,
    vibration: true,
    vibrationPattern: [300, 300, 300, 300],
    sound: soundUri,
  });
  return channelId;
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

  // Resolve which channel to use:
  // Custom system sound (soundUri) → dynamic channel, otherwise default alarms_v2
  let channelId: string;
  let customChannel = false;

  if (alarm.soundUri) {
    try {
      channelId = await getOrCreateSoundChannel(
        alarm.soundUri,
        alarm.soundName || 'Custom',
      );
      customChannel = true;
    } catch {
      // Fallback to default if channel creation fails
      channelId = ALARM_CHANNEL_ID;
    }
  } else {
    channelId = ALARM_CHANNEL_ID;
  }

  // When using a custom sound channel, omit notification-level sound so
  // Android uses the channel's sound.  For the default channel, keep
  // sound: 'default' which lets the channel's own sound play normally.
  const notificationPayload = {
    title,
    body,
    data: { alarmId: alarm.id },
    android: {
      channelId,
      fullScreenAction: {
        id: 'default',
        launchActivity: 'default',
      },
      importance: AndroidImportance.HIGH,
      sound: customChannel ? undefined : 'default',
      loopSound: true,
      vibrationPattern: [300, 300, 300, 300],
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

export async function scheduleSnooze(alarm: Alarm, minutes = 5): Promise<string> {
  await setupNotificationChannel();
  const settings = await loadSettings();

  const title = alarm.icon
    ? `${alarm.icon} Snoozed Alarm`
    : '\u23F0 Snoozed Alarm';

  let body: string;
  if (settings.guessWhyEnabled) {
    body = 'Snoozed \u2014 can you remember why?';
  } else if (alarm.private) {
    body = 'Snoozed \u2014 time to wake up!';
  } else {
    body = alarm.nickname || alarm.note || 'Time to wake up!';
  }

  let channelId = ALARM_CHANNEL_ID;
  let customChannel = false;
  if (alarm.soundUri) {
    try {
      channelId = await getOrCreateSoundChannel(
        alarm.soundUri,
        alarm.soundName || 'Custom',
      );
      customChannel = true;
    } catch {
      channelId = ALARM_CHANNEL_ID;
    }
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + minutes * 60 * 1000,
    alarmManager: { allowWhileIdle: true },
  };

  return await notifee.createTriggerNotification(
    {
      title,
      body,
      data: { alarmId: alarm.id },
      android: {
        channelId,
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        importance: AndroidImportance.HIGH,
        sound: customChannel ? undefined : 'default',
        loopSound: true,
        vibrationPattern: [300, 300, 300, 300],
        ongoing: true,
        autoCancel: false,
        pressAction: { id: 'default' },
        category: AndroidCategory.ALARM,
      },
    },
    trigger,
  );
}

export async function scheduleTimerNotification(
  label: string,
  icon: string,
  completionTimestamp: number,
  timerId: string,
  soundUri?: string,
  soundName?: string,
): Promise<string> {
  await setupNotificationChannel();

  let channelId = ALARM_CHANNEL_ID;
  let customChannel = false;
  if (soundUri) {
    try {
      channelId = await getOrCreateSoundChannel(
        soundUri,
        soundName || 'Custom',
        'timer_custom_',
      );
      customChannel = true;
      console.log('[Timer] Using custom channel:', channelId, 'sound:', soundUri);
    } catch (err) {
      console.error('[Timer] getOrCreateSoundChannel failed, using default:', err);
      // fallback to default channel
    }
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: completionTimestamp,
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  // Use a DIFFERENT notification ID than the countdown chronometer.
  // Sharing an ID caused Android to treat the completion as an "update"
  // to the silent countdown notification, suppressing the alarm sound.
  // A distinct ID fires as a brand-new HIGH-importance notification
  // with full-screen action and sound.
  return await notifee.createTriggerNotification(
    {
      id: `timer-done-${timerId}`,
      title: `${icon} Timer Complete`,
      body: `${label} is done!`,
      data: { timerId },
      android: {
        channelId,
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        importance: AndroidImportance.HIGH,
        sound: customChannel ? undefined : 'default',
        loopSound: true,
        vibrationPattern: [300, 300, 300, 300],
        lights: ['#FF0000', 300, 600] as [string, number, number],
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

// --- Sound preview ---

let _previewTimer: ReturnType<typeof setTimeout> | null = null;
let _previewCallId = 0;

/**
 * Preview a system sound by firing a short Notifee notification on a
 * dedicated low-importance channel for that sound URI.
 */
export async function previewSystemSound(
  soundUri: string,
  soundName: string,
): Promise<void> {
  await setupNotificationChannel();

  // Cancel any existing preview first
  await cancelSoundPreview();

  // Guard against rapid taps: if a newer call arrives while we await,
  // bail out so only the latest preview wins.
  const callId = ++_previewCallId;

  // Create a preview-specific channel: DEFAULT importance, no DND bypass
  const channelId = `preview_${extractMediaId(soundUri)}`;
  await notifee.createChannel({
    id: channelId,
    name: `Preview: ${soundName}`,
    importance: AndroidImportance.DEFAULT,
    sound: soundUri,
    vibration: false,
    bypassDnd: false,
  });

  if (callId !== _previewCallId) return;

  await notifee.displayNotification({
    id: 'sound_preview',
    title: `\u{1F50A} ${soundName}`,
    body: 'Sound preview',
    android: {
      channelId,
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default' },
    },
  });

  if (callId !== _previewCallId) return;

  // Auto-cancel after 3 seconds
  _previewTimer = setTimeout(async () => {
    try {
      await notifee.cancelNotification('sound_preview');
    } catch {}
    _previewTimer = null;
  }, 3000);
}

export async function cancelSoundPreview(): Promise<void> {
  if (_previewTimer) {
    clearTimeout(_previewTimer);
    _previewTimer = null;
  }
  try {
    await notifee.cancelNotification('sound_preview');
  } catch {}
}
