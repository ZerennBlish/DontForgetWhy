import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from '@notifee/react-native';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import { loadAlarms, deleteAlarm } from './src/services/storage';
import { getReminders, updateReminder } from './src/services/reminderStorage';
import { scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications } from './src/services/notifications';
import { refreshTimerWidget } from './src/widget/updateWidget';
import { setPendingAlarm } from './src/services/pendingAlarm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playAlarmSoundForNotification, stopAlarmSound } from './src/services/alarmSound';

// ── Yearly reminder reschedule helper ──────────────────────────────
// Yearly recurring reminders use a one-time trigger (notifee has no
// YEARLY repeat). When the notification fires and the user doesn't
// tap Done in-app, we must reschedule for next year automatically.
// This runs in the headless background handler for killed-app scenarios.
async function rescheduleYearlyReminder(reminderId: string): Promise<void> {
  try {
    const reminders = await getReminders();
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;
    if (!reminder.recurring || !reminder.dueDate || (reminder.days && reminder.days.length > 0)) return;

    if (reminder.notificationIds?.length) {
      await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
    } else if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }

    const [, mo, d] = reminder.dueDate.split('-').map(Number);
    const now = new Date();
    let nextDate = new Date(now.getFullYear(), mo - 1, d);
    if (nextDate.getTime() <= now.getTime()) {
      nextDate = new Date(now.getFullYear() + 1, mo - 1, d);
    }
    if (nextDate.getMonth() !== mo - 1) {
      nextDate.setDate(0);
    }
    const nextDueDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

    const updated: typeof reminder = {
      ...reminder,
      dueDate: nextDueDate,
      notificationId: null,
      notificationIds: [],
    };

    if (updated.dueTime) {
      const notifIds = await scheduleReminderNotification(updated).catch(() => [] as string[]);
      updated.notificationId = notifIds[0] || null;
      updated.notificationIds = notifIds;
    }

    await updateReminder(updated);
    console.log('[NOTIF] BACKGROUND rescheduleYearlyReminder — bumped to', nextDueDate, 'for reminder:', reminderId);
  } catch (e) {
    console.error('[NOTIF] BACKGROUND rescheduleYearlyReminder error:', e);
  }
}

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
    // Play alarm sound immediately on DELIVERED so it starts the instant
    // the notification fires, regardless of screen state.
    if (type === EventType.DELIVERED && (alarmId || timerId)) {
      playAlarmSoundForNotification(alarmId, timerId).catch(() => {});
    }

    // Filter: only store pending data for alarm/timer COMPLETION notifications.
    // Skip reminders (have reminderId, no alarmId) and previews (no data).
    //
    // Timer completion uses ID timer-done-{timerId} (separate from the
    // countdown chronometer countdown-{timerId}). We identify completions
    // by data.timerId: the countdown has no data field → timerId is undefined;
    // the completion trigger has data: { timerId } → timerId is set.
    if (timerId && notifId) {
      const tIcon = (detail.notification?.title ?? '').replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
      const tLabel = (detail.notification?.body ?? '').replace(' is done!', '').trim() || 'Timer';
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
    console.log('[NOTIF] BACKGROUND DISMISSED — alarmId:', alarmId, 'timerId:', timerId);
    if (alarmId || timerId) {
      stopAlarmSound();
    }
    if (alarmId) {
      try {
        const alarms = await loadAlarms();
        const alarm = alarms.find((a) => a.id === alarmId);
        if (alarm?.mode === 'one-time') {
          // Check if this DISMISSED was triggered by a snooze cancellation.
          // The snoozing flag is set atomically before cancel in AlarmFireScreen.
          const snoozingFlag = await AsyncStorage.getItem(`snoozing_${alarmId}`);
          if (snoozingFlag) {
            await AsyncStorage.removeItem(`snoozing_${alarmId}`);
          } else {
            await deleteAlarm(alarmId);
            await refreshTimerWidget();
          }
        }
      } catch {}
    }
  }

  // Yearly reminder auto-reschedule: when a reminder notification
  // fires (DELIVERED) or is dismissed in the background/killed state,
  // reschedule yearly recurring reminders for next year.
  const reminderId = detail.notification?.data?.reminderId as string | undefined;
  if (reminderId && (type === EventType.DELIVERED || type === EventType.DISMISSED)) {
    await rescheduleYearlyReminder(reminderId);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
