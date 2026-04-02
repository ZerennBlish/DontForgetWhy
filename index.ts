import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from '@notifee/react-native';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import { loadAlarms, deleteAlarm, updateSingleAlarm } from './src/services/storage';
import { getReminders, updateReminder } from './src/services/reminderStorage';
import { scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications, scheduleSnooze, cancelTimerCountdownNotification } from './src/services/notifications';
import { refreshWidgets } from './src/widget/updateWidget';
import { setPendingAlarm, clearPendingAlarm, markNotifHandled, persistNotifHandled } from './src/services/pendingAlarm';
import { loadActiveTimers, saveActiveTimers } from './src/services/timerStorage';
import { kvGet, kvSet, kvRemove } from './src/services/database';
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
    if (!reminder.recurring) return;
    if (reminder.days && reminder.days.length > 0) return;

    // Determine yearly month/day — from dueDate if set, else from createdAt
    let mo: number; // 1-indexed month
    let d: number;
    if (reminder.dueDate) {
      [, mo, d] = reminder.dueDate.split('-').map(Number);
    } else if (reminder.createdAt) {
      const created = new Date(reminder.createdAt);
      mo = created.getMonth() + 1;
      d = created.getDate();
    } else {
      return;
    }

    if (reminder.notificationIds?.length) {
      await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
    } else if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }

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
      let timerSoundId: string | undefined;
      try {
        const timers = await loadActiveTimers();
        timerSoundId = timers.find(t => t.id === timerId)?.soundId;
      } catch {}
      setPendingAlarm({
        timerId,
        notificationId: notifId,
        timerLabel: tLabel,
        timerIcon: tIcon,
        timerSoundId,
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

  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    const notifId2 = detail.notification?.id;

    console.log('[NOTIF] BACKGROUND ACTION_PRESS —', actionId, 'alarmId:', alarmId, 'timerId:', timerId);

    if (actionId === 'dismiss') {
      stopAlarmSound();

      // Cancel the notification
      if (notifId2) {
        await notifee.cancelNotification(notifId2).catch(() => {});
      }

      // One-time alarm: soft-delete (same logic as existing DISMISSED handler)
      if (alarmId) {
        try {
          const alarms = await loadAlarms();
          const alarm = alarms.find((a) => a.id === alarmId);
          if (alarm?.mode === 'one-time') {
            const snoozingFlag = kvGet(`snoozing_${alarmId}`);
            if (snoozingFlag) {
              kvRemove(`snoozing_${alarmId}`);
            } else {
              await deleteAlarm(alarmId);
              await refreshWidgets();
            }
          }
        } catch {}
      }

      // Timer cleanup: cancel countdown notification and remove from active timers
      if (timerId) {
        try {
          await cancelTimerCountdownNotification(timerId);
        } catch {}
        try {
          const timers = await loadActiveTimers();
          const updated = timers.filter((t) => t.id !== timerId);
          await saveActiveTimers(updated);
          await refreshWidgets();
        } catch {}
      }

      // Clear stale pending data so app open doesn't re-navigate to AlarmFire
      clearPendingAlarm();

      // Mark as handled so fire screen doesn't reopen
      if (notifId2) {
        markNotifHandled(notifId2);
        await persistNotifHandled(notifId2);
      }
    }

    if (actionId === 'snooze' && alarmId) {
      stopAlarmSound();

      // Set snoozing flag BEFORE cancelling notification (prevents one-time alarm deletion)
      // Abort if flag write fails — a failed snooze is better than a deleted alarm
      try {
        kvSet(`snoozing_${alarmId}`, '1');
      } catch (e) {
        console.error('[NOTIF] snooze flag failed, aborting snooze:', e);
        return;
      }

      // Cancel the notification
      if (notifId2) {
        await notifee.cancelNotification(notifId2).catch(() => {});
      }

      // Schedule snooze notification and persist the new notification ID
      try {
        const alarms = await loadAlarms();
        const alarm = alarms.find((a) => a.id === alarmId);
        if (alarm) {
          const snoozeNotifId = await scheduleSnooze(alarm);
          try {
            await updateSingleAlarm(alarmId, (a) => ({
              ...a,
              notificationIds: [
                ...(a.notificationIds || []),
                snoozeNotifId,
              ],
            }));
          } catch {}
        }
      } catch (e) {
        console.error('[NOTIF] background snooze failed:', e);
      }

      // Clear stale pending data — snooze replaces with a new notification
      clearPendingAlarm();

      // Mark as handled
      if (notifId2) {
        markNotifHandled(notifId2);
        await persistNotifHandled(notifId2);
      }
    }
  }

  if (type === EventType.DISMISSED) {
    console.log('[NOTIF] BACKGROUND DISMISSED — alarmId:', alarmId, 'timerId:', timerId);
    if (alarmId || timerId) {
      stopAlarmSound();
      clearPendingAlarm();
    }
    if (alarmId) {
      try {
        const alarms = await loadAlarms();
        const alarm = alarms.find((a) => a.id === alarmId);
        if (alarm?.mode === 'one-time') {
          // Check if this DISMISSED was triggered by a snooze cancellation.
          // The snoozing flag is set atomically before cancel in AlarmFireScreen.
          const snoozingFlag = kvGet(`snoozing_${alarmId}`);
          if (snoozingFlag) {
            kvRemove(`snoozing_${alarmId}`);
          } else {
            await deleteAlarm(alarmId);
            await refreshWidgets();
          }
        }
      } catch {}
    }
    // Timer cleanup: cancel countdown notification and remove from active timers
    if (timerId) {
      try {
        await cancelTimerCountdownNotification(timerId);
      } catch {}
      try {
        const timers = await loadActiveTimers();
        const updated = timers.filter((t) => t.id !== timerId);
        await saveActiveTimers(updated);
        await refreshWidgets();
      } catch {}
    }
  }

  // Yearly reminder auto-reschedule: when a reminder notification
  // is dismissed in the background/killed state, reschedule yearly
  // recurring reminders for next year. NOT on DELIVERED — rescheduling
  // on delivery bumps the dueDate before the user can complete in-app.
  const reminderId = detail.notification?.data?.reminderId as string | undefined;
  if (reminderId && type === EventType.DISMISSED) {
    await rescheduleYearlyReminder(reminderId);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
