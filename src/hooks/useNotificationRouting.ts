import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import { kvGet, kvSet, kvRemove } from '../services/database';
import type { RootStackParamList } from '../navigation/types';
import { loadAlarms, deleteAlarm, purgeDeletedAlarms, updateSingleAlarm } from '../services/storage';
import { getReminders, updateReminder, purgeDeletedReminders } from '../services/reminderStorage';
import { purgeDeletedNotes, getPendingNoteAction, getNoteById } from '../services/noteStorage';
import { getOnboardingComplete } from '../services/settings';
import {
  setupNotificationChannel,
  cancelTimerCountdownNotification,
  scheduleReminderNotification,
  cancelReminderNotification,
  cancelReminderNotifications,
  scheduleSnooze,
} from '../services/notifications';
import { refreshHapticsSetting } from '../utils/haptics';
import { safeParse } from '../utils/safeParse';
import { refreshWidgets } from '../widget/updateWidget';
import { loadActiveTimers, saveActiveTimers } from '../services/timerStorage';
import { getReminderById } from '../services/reminderStorage';
import { getVoiceMemoById } from '../services/voiceMemoStorage';
import {
  getPendingAlarm,
  setPendingAlarm,
  clearPendingAlarm,
  markNotifHandled,
  wasNotifHandled,
  wasNotifHandledPersistent,
  persistNotifHandled,
} from '../services/pendingAlarm';
import { playAlarmSoundForNotification, stopAlarmSound } from '../services/alarmSound';
import type { PendingAlarmData } from '../services/pendingAlarm';

interface PendingTimestampAction {
  timestamp: number;
}

interface PendingAlarmAction extends PendingTimestampAction {
  action: string;
  alarmId?: string;
}

interface PendingReminderAction extends PendingTimestampAction {
  action: string;
  reminderId?: string;
}

interface PendingCalendarAction extends PendingTimestampAction {
  date: string | null;
}

interface PendingVoiceAction extends PendingTimestampAction {
  type: string;
  memoId?: string;
}

// ── Yearly reminder reschedule helper ──────────────────────────────
// Yearly recurring reminders use a one-time trigger (notifee has no
// YEARLY repeat). When the notification fires and the user doesn't
// tap Done in-app, we must reschedule for next year automatically.
async function rescheduleYearlyReminder(reminderId: string): Promise<void> {
  try {
    const reminders = await getReminders();
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;
    if (!reminder.recurring) return;
    if (reminder.days && reminder.days.length > 0) return;

    // Determine the yearly month/day — from dueDate if set, else from createdAt
    let mo: number; // 1-indexed month
    let d: number;
    if (reminder.dueDate) {
      [, mo, d] = reminder.dueDate.split('-').map(Number);
    } else if (reminder.createdAt) {
      const created = new Date(reminder.createdAt);
      mo = created.getMonth() + 1; // 1-indexed
      d = created.getDate();
    } else {
      return; // No date source, can't reschedule
    }

    // Cancel old notifications
    if (reminder.notificationIds?.length) {
      await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
    } else if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }

    // Bump to next year
    const now = new Date();
    let nextDate = new Date(now.getFullYear(), mo - 1, d);
    if (nextDate.getTime() <= now.getTime()) {
      nextDate = new Date(now.getFullYear() + 1, mo - 1, d);
    }
    // Handle invalid date (e.g. Feb 29 on non-leap year)
    if (nextDate.getMonth() !== mo - 1) {
      nextDate.setDate(0); // last day of the intended month
    }
    const nextDueDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

    const updated = {
      ...reminder,
      dueDate: nextDueDate,
      notificationId: null as string | null,
      notificationIds: [] as string[],
    };

    if (updated.dueTime) {
      const notifIds = await scheduleReminderNotification(updated).catch(() => [] as string[]);
      updated.notificationId = notifIds[0] || null;
      updated.notificationIds = notifIds;
    }

    await updateReminder(updated);
    console.log('[NOTIF] rescheduleYearlyReminder — bumped to', nextDueDate, 'for reminder:', reminderId);
  } catch (e) {
    console.error('[NOTIF] rescheduleYearlyReminder error:', e);
  }
}

interface InitState {
  onboardingDone: boolean;
  alarmFireParams: RootStackParamList['AlarmFire'] | null;
  notepadParams: RootStackParamList['Notepad'] | null;
  alarmListParams: boolean;
  reminderListParams: boolean;
  timerParams: boolean;
  createAlarmParams: RootStackParamList['CreateAlarm'] | null;
  createReminderParams: RootStackParamList['CreateReminder'] | null;
  calendarParams: RootStackParamList['Calendar'] | null;
  voiceMemoListParams: boolean;
  voiceRecordParams: RootStackParamList['VoiceRecord'] | null;
  voiceMemoDetailParams: RootStackParamList['VoiceMemoDetail'] | null;
}

interface UseNotificationRoutingResult {
  navigationRef: React.MutableRefObject<NavigationContainerRef<RootStackParamList> | null>;
  initState: InitState | null;
  onNavigationReady: () => void;
}

export function useNotificationRouting(): UseNotificationRoutingResult {
  // Single init state: null = loading, non-null = ready to render.
  // Combines onboarding check + cold-start alarm/note resolution.
  const [initState, setInitState] = useState<InitState | null>(null);

  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const isNavigationReady = useRef(false);

  // ── Shared navigation helper ────────────────────────────────────
  // Navigates to AlarmFireScreen from pending alarm data or notification
  // data. Used by: foreground event handler, onNavigationReady, AppState.

  const navigateToAlarmFire = useCallback(async (
    pending: PendingAlarmData,
  ) => {
    if (!navigationRef.current || !isNavigationReady.current) return;

    // Skip if AlarmFireScreen already handled this notification
    if (wasNotifHandled(pending.notificationId)) {
      console.log('[NOTIF] navigateToAlarmFire — skipping already-handled:', pending.notificationId);
      return;
    }
    if (pending.notificationId) {
      markNotifHandled(pending.notificationId);
    }

    if (pending.timerId && pending.notificationId) {
      console.log('[NOTIF] navigateToAlarmFire — timer:', pending.timerId);
      let timerSoundId = pending.timerSoundId;
      if (timerSoundId === undefined) {
        try {
          const timers = await loadActiveTimers();
          timerSoundId = timers.find(t => t.id === pending.timerId)?.soundId;
        } catch {}
      }
      navigationRef.current.navigate('AlarmFire', {
        isTimer: true,
        timerLabel: pending.timerLabel || 'Timer',
        timerIcon: pending.timerIcon || '\u23F1\uFE0F',
        timerId: pending.timerId,
        timerSoundId,
        timerNotificationId: pending.notificationId,
        notificationId: pending.notificationId,
        fromNotification: true,
      });
    } else if (pending.alarmId) {
      console.log('[NOTIF] navigateToAlarmFire — alarm:', pending.alarmId);
      try {
        const alarms = await loadAlarms();
        const alarm = alarms.find((a) => a.id === pending.alarmId);
        if (!alarm) {
          console.log('[NOTIF] navigateToAlarmFire — alarm not found:', pending.alarmId);
          return;
        }
        if (navigationRef.current) {
          navigationRef.current.navigate('AlarmFire', {
            alarm,
            fromNotification: true,
            notificationId: pending.notificationId,
          });
        }
      } catch (e) {
        console.error('[NOTIF] navigateToAlarmFire error:', e);
      }
    }
  }, []);

  // Consume pending alarm data from background handler and navigate.
  // Returns true if pending data was found and navigation was attempted.
  const consumePendingAlarm = useCallback(async (): Promise<boolean> => {
    const pending = getPendingAlarm();
    if (pending) {
      clearPendingAlarm();
      // Safety net: if this notification was already handled (e.g. dismissed/snoozed),
      // don't re-navigate to AlarmFire
      if (pending.notificationId && (wasNotifHandled(pending.notificationId) || await wasNotifHandledPersistent(pending.notificationId))) {
        console.log('[NOTIF] consumePendingAlarm — skipping already-handled:', pending.notificationId);
        return false;
      }
      console.log('[NOTIF] consumePendingAlarm — found:', JSON.stringify(pending));
      await navigateToAlarmFire(pending);
      return true;
    }

    return false;
  }, [navigateToAlarmFire]);

  // ── Init phase ────────────────────────────────────────────────────
  // Runs once on mount. For TRUE cold start (app was killed):
  //   1. Module-level pendingAlarm (set by onBackgroundEvent in index.ts)
  //   2. notifee.getInitialNotification() (cold start from PRESS or fullScreen)
  // Uses initialState so the navigator renders AlarmFireScreen on first frame.
  // For warm resume (app already running), foreground handler + AppState handle it.
  useEffect(() => {
    (async () => {
      try {
        const onboardingDone = await getOnboardingComplete();
        let alarmFireParams: RootStackParamList['AlarmFire'] | null = null;

        // 1. Check pending alarm from background event handler (cold start)
        const pending = getPendingAlarm();
        if (pending) {
          clearPendingAlarm();
          console.log('[NOTIF] INIT — found pending alarm data:', JSON.stringify(pending));

          if (pending.timerId && pending.notificationId) {
            let timerSoundId = pending.timerSoundId;
            if (timerSoundId === undefined) {
              try {
                const timers = await loadActiveTimers();
                timerSoundId = timers.find(t => t.id === pending.timerId)?.soundId;
              } catch {}
            }
            alarmFireParams = {
              isTimer: true,
              timerLabel: pending.timerLabel || 'Timer',
              timerIcon: pending.timerIcon || '\u23F1\uFE0F',
              timerId: pending.timerId,
              timerSoundId,
              timerNotificationId: pending.notificationId,
              notificationId: pending.notificationId,
              fromNotification: true,
            };
          } else if (pending.alarmId) {
            try {
              const alarms = await loadAlarms();
              const alarm = alarms.find((a) => a.id === pending.alarmId);
              if (alarm) {
                alarmFireParams = {
                  alarm,
                  fromNotification: true,
                  notificationId: pending.notificationId,
                };
              }
            } catch (e) {
              console.error('[NOTIF] INIT — failed to load alarm:', e);
            }
          }
        }

        // 2. Fallback: getInitialNotification (cold start via PRESS or fullScreenAction)
        if (!alarmFireParams) {
          try {
            const initial = await notifee.getInitialNotification();
            if (initial?.notification) {
              const notifId = initial.notification.id;
              const alarmId = initial.notification.data?.alarmId as string | undefined;
              const timerId = initial.notification.data?.timerId as string | undefined;
              console.log('[NOTIF] INIT — getInitialNotification found: notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

              // Check if AlarmFireScreen already handled this notification
              if (await wasNotifHandledPersistent(notifId)) {
                console.log('[NOTIF] INIT — getInitialNotification already handled:', notifId);
              } else {
                if (timerId && notifId) {
                  const tIcon = (initial.notification?.title ?? '').replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
                  const tLabel = (initial.notification?.body ?? '').replace(' is done!', '').trim() || 'Timer';
                  let initTimerSoundId: string | undefined;
                  try {
                    const timers = await loadActiveTimers();
                    initTimerSoundId = timers.find(t => t.id === timerId)?.soundId;
                  } catch {}
                  alarmFireParams = {
                    isTimer: true,
                    timerLabel: tLabel,
                    timerIcon: tIcon,
                    timerId,
                    timerSoundId: initTimerSoundId,
                    timerNotificationId: notifId,
                    notificationId: notifId,
                    fromNotification: true,
                  };
                } else if (alarmId) {
                  try {
                    const alarms = await loadAlarms();
                    const alarm = alarms.find((a) => a.id === alarmId);
                    if (alarm) {
                      alarmFireParams = {
                        alarm,
                        fromNotification: true,
                        notificationId: notifId,
                      };
                    }
                  } catch (e) {
                    console.error('[NOTIF] INIT — failed to load alarm from getInitialNotification:', e);
                  }
                }
              }
            } else {
              console.log('[NOTIF] INIT — getInitialNotification returned null (normal launch)');
            }
          } catch (e) {
            console.error('[NOTIF] INIT — getInitialNotification error:', e);
          }
        }

        // Mark this notification as handled so the foreground handler
        // doesn't navigate to AlarmFireScreen a second time.
        if (alarmFireParams?.notificationId) {
          markNotifHandled(alarmFireParams.notificationId);
          await persistNotifHandled(alarmFireParams.notificationId);
          console.log('[NOTIF] INIT — set dedupe marker for:', alarmFireParams.notificationId);
        }

        // 3. Check for pending note action from widget deep-link
        let notepadParams: RootStackParamList['Notepad'] | null = null;
        if (!alarmFireParams) {
          try {
            const pendingNote = await getPendingNoteAction();
            if (pendingNote) {
              if (pendingNote.type === 'new') {
                notepadParams = { newNote: true };
              } else if (pendingNote.noteId) {
                const note = getNoteById(pendingNote.noteId);
                if (!note) {
                  notepadParams = {};
                } else {
                  notepadParams = { noteId: pendingNote.noteId };
                }
              } else {
                notepadParams = {};
              }
            }
          } catch {}
        }

        // 4. Check for pending alarm action from widget (create or edit)
        let createAlarmParams: RootStackParamList['CreateAlarm'] | null = null;
        if (!alarmFireParams && !notepadParams) {
          try {
            const raw = kvGet('pendingAlarmAction');
            if (raw) {
              kvRemove('pendingAlarmAction');
              const parsed = safeParse<PendingAlarmAction | null>(raw, null);
              if (!parsed || Date.now() - parsed.timestamp > 10000) {
                // expired or invalid
              } else {
                if (parsed.action === 'createAlarm') {
                  createAlarmParams = {};
                } else if (parsed.action === 'editAlarm' && parsed.alarmId) {
                  const allAlarms = await loadAlarms();
                  const alarm = allAlarms.find((a) => a.id === parsed.alarmId);
                  if (alarm) createAlarmParams = { alarm };
                }
              }
            }
          } catch {}
        }

        // 5. Check for pending reminder action from widget (create or edit)
        let createReminderParams: RootStackParamList['CreateReminder'] | null = null;
        if (!alarmFireParams && !notepadParams && !createAlarmParams) {
          try {
            const raw = kvGet('pendingReminderAction');
            if (raw) {
              kvRemove('pendingReminderAction');
              const parsed = safeParse<PendingReminderAction | null>(raw, null);
              if (!parsed || Date.now() - parsed.timestamp > 10000) {
                // expired or invalid
              } else {
                if (parsed.action === 'createReminder') {
                  createReminderParams = {};
                } else if (parsed.action === 'editReminder' && parsed.reminderId) {
                  const reminder = getReminderById(parsed.reminderId);
                  if (reminder) {
                    createReminderParams = { reminderId: parsed.reminderId };
                  }
                }
              }
            }
          } catch {}
        }

        // 6. Check for pending alarm list action from widget deep-link
        let alarmListParams = false;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams) {
          try {
            const raw = kvGet('pendingAlarmListAction');
            if (raw) {
              kvRemove('pendingAlarmListAction');
              const parsed = safeParse<PendingTimestampAction | null>(raw, null);
              if (parsed && Date.now() - parsed.timestamp < 10000) {
                alarmListParams = true;
              }
            }
          } catch {}
        }

        // 6a. Check for pending reminder list action from widget deep-link
        let reminderListParams = false;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams && !alarmListParams) {
          try {
            const raw = kvGet('pendingReminderListAction');
            if (raw) {
              kvRemove('pendingReminderListAction');
              const parsed = safeParse<PendingTimestampAction | null>(raw, null);
              if (parsed && Date.now() - parsed.timestamp < 10000) {
                reminderListParams = true;
              }
            }
          } catch {}
        }

        // 6b. Check for pending timer action from widget deep-link
        let timerParams = false;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams && !alarmListParams && !reminderListParams) {
          try {
            const raw = kvGet('pendingTimerAction');
            if (raw) {
              kvRemove('pendingTimerAction');
              const parsed = safeParse<PendingTimestampAction | null>(raw, null);
              if (parsed && Date.now() - parsed.timestamp < 10000) {
                timerParams = true;
              }
            }
          } catch {}
        }

        // 7. Check for pending calendar action from widget deep-link
        let calendarParams: RootStackParamList['Calendar'] | null = null;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams && !alarmListParams && !reminderListParams && !timerParams) {
          try {
            const raw = kvGet('pendingCalendarAction');
            if (raw) {
              kvRemove('pendingCalendarAction');
              const parsed = safeParse<PendingCalendarAction | null>(raw, null);
              if (parsed && Date.now() - parsed.timestamp < 10000) {
                calendarParams = parsed.date ? { initialDate: parsed.date } : {};
              }
            }
          } catch {}
        }

        // 8. Check for pending voice action from widget deep-link
        let voiceMemoListParams = false;
        let voiceRecordParams: RootStackParamList['VoiceRecord'] | null = null;
        let voiceMemoDetailParams: RootStackParamList['VoiceMemoDetail'] | null = null;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams && !alarmListParams && !reminderListParams && !timerParams && !calendarParams) {
          try {
            const raw = kvGet('pendingVoiceAction');
            if (raw) {
              kvRemove('pendingVoiceAction');
              const parsed = safeParse<PendingVoiceAction | null>(raw, null);
              if (parsed && Date.now() - parsed.timestamp < 10000) {
                if (parsed.type === 'list') {
                  voiceMemoListParams = true;
                } else if (parsed.type === 'record') {
                  voiceRecordParams = undefined;
                } else if (parsed.type === 'detail' && parsed.memoId) {
                  const memo = getVoiceMemoById(parsed.memoId);
                  if (memo) {
                    voiceMemoDetailParams = { memoId: parsed.memoId };
                  }
                }
              }
            }
          } catch {}
        }

        console.log('[NOTIF] INIT — complete. alarmFireParams:', alarmFireParams ? 'SET' : 'null');
        setInitState({ onboardingDone, alarmFireParams, notepadParams, alarmListParams, reminderListParams, timerParams, createAlarmParams, createReminderParams, calendarParams, voiceMemoListParams, voiceRecordParams, voiceMemoDetailParams });
      } catch (e) {
        console.error('[NOTIF] INIT — fatal error:', e);
        setInitState({ onboardingDone: true, alarmFireParams: null, notepadParams: null, alarmListParams: false, reminderListParams: false, timerParams: false, createAlarmParams: null, createReminderParams: null, calendarParams: null, voiceMemoListParams: false, voiceRecordParams: null, voiceMemoDetailParams: null });
      }
    })();
  }, []);

  // ── Setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    setupNotificationChannel();
    refreshHapticsSetting();
    // Auto-cleanup: remove items soft-deleted over 30 days ago
    (async () => {
      try {
        await purgeDeletedAlarms();
        await purgeDeletedReminders();
        await purgeDeletedNotes();
      } catch {}
    })();
  }, []);

  // Clean up orphaned timer countdown notifications on launch
  useEffect(() => {
    (async () => {
      try {
        const timers = await loadActiveTimers();
        const now = Date.now();
        let changed = false;
        const remaining = timers.filter((timer) => {
          if (!timer.isRunning) return true;
          const completionTime = new Date(timer.startedAt).getTime() + timer.remainingSeconds * 1000;
          if (completionTime < now) {
            cancelTimerCountdownNotification(timer.id).catch(() => {});
            changed = true;
            return false;
          }
          return true;
        });
        if (changed) {
          await saveActiveTimers(remaining);
        }
      } catch {}
    })();
  }, []);

  // ── Foreground event handler ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const notifId = detail.notification?.id;
      const alarmId = detail.notification?.data?.alarmId as string | undefined;
      const timerId = detail.notification?.data?.timerId as string | undefined;
      console.log('[NOTIF] onForegroundEvent type:', type, 'notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

      // ── DELIVERED: play alarm sound only, no navigation ────────────
      if (type === EventType.DELIVERED) {
        const isAlarmOrTimerCompletion = !!(alarmId || timerId);
        if (!isAlarmOrTimerCompletion) {
          return;
        }
        playAlarmSoundForNotification(alarmId, timerId).catch(() => {});
        return;
      }

      // ── PRESS: user tapped notification body — navigate to AlarmFireScreen ─
      if (type === EventType.PRESS) {
        if (!navigationRef.current || !isNavigationReady.current) {
          const isCountdownEarly = notifId?.startsWith('countdown-');
          if (isCountdownEarly) {
            kvSet('pendingTimerAction', JSON.stringify({ timestamp: Date.now() }));
            console.log('[NOTIF] FOREGROUND PRESS — countdown tap, nav not ready, stored pendingTimerAction');
            return;
          }
          if (timerId && notifId) {
            const tIcon = (detail.notification?.title ?? '').replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
            const tLabel = (detail.notification?.body ?? '').replace(' is done!', '').trim() || 'Timer';
            let pendTimerSoundId: string | undefined;
            try {
              const timers = await loadActiveTimers();
              pendTimerSoundId = timers.find(t => t.id === timerId)?.soundId;
            } catch {}
            setPendingAlarm({ timerId, notificationId: notifId, timerLabel: tLabel, timerIcon: tIcon, timerSoundId: pendTimerSoundId });
          } else if (alarmId) {
            setPendingAlarm({ alarmId, notificationId: notifId });
          }
          console.log('[NOTIF] FOREGROUND PRESS — navigation not ready, stored as pending');
          return;
        }

        // If AlarmFireScreen is already the active route, don't stack another
        const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
        if (currentRoute === 'AlarmFire') {
          console.log('[NOTIF] FOREGROUND PRESS — already on AlarmFireScreen, skipping');
          return;
        }

        // Clear any pending data from background handler to prevent double navigation
        clearPendingAlarm();

        // Skip if AlarmFireScreen already handled this notification
        if (wasNotifHandled(notifId)) {
          console.log('[NOTIF] FOREGROUND PRESS — skipping already-handled:', notifId);
          return;
        }

        // Countdown tap — navigate to TimerScreen, not AlarmFire
        const isCountdown = notifId?.startsWith('countdown-');
        if (isCountdown) {
          console.log('[NOTIF] FOREGROUND PRESS — countdown tap, navigating to Timers');
          if (navigationRef.current && isNavigationReady.current) {
            navigationRef.current.navigate('Timers');
          } else {
            kvSet('pendingTimerAction', JSON.stringify({ timestamp: Date.now() }));
          }
          return;
        }

        if (timerId && notifId) {
          markNotifHandled(notifId);
          const tIcon = (detail.notification?.title ?? '').replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
          const tLabel = (detail.notification?.body ?? '').replace(' is done!', '').trim() || 'Timer';
          let fgTimerSoundId: string | undefined;
          try {
            const timers = await loadActiveTimers();
            fgTimerSoundId = timers.find(t => t.id === timerId)?.soundId;
          } catch {}

          console.log('[NOTIF] FOREGROUND PRESS — navigating to AlarmFire (timer)');
          navigationRef.current.navigate('AlarmFire', {
            isTimer: true,
            timerLabel: tLabel,
            timerIcon: tIcon,
            timerId,
            timerSoundId: fgTimerSoundId,
            timerNotificationId: notifId,
            notificationId: notifId,
            fromNotification: true,
          });
        } else if (alarmId) {
          console.log('[NOTIF] FOREGROUND PRESS — navigating to AlarmFire (alarm), notifId:', notifId);
          await navigateToAlarmFire({ alarmId, notificationId: notifId });
        }
      }

      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;

        console.log('[NOTIF] FOREGROUND ACTION_PRESS —', actionId, 'alarmId:', alarmId, 'timerId:', timerId);

        if (actionId === 'dismiss') {
          stopAlarmSound();

          if (notifId) {
            await notifee.cancelNotification(notifId).catch(() => {});
          }

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

          if (notifId) {
            markNotifHandled(notifId);
            await persistNotifHandled(notifId);
          }
        }

        if (actionId === 'snooze' && alarmId) {
          stopAlarmSound();

          // Set snoozing flag BEFORE cancelling notification (prevents one-time alarm deletion)
          try {
            kvSet(`snoozing_${alarmId}`, '1');
          } catch (e) {
            console.error('[NOTIF] snooze flag failed, aborting snooze:', e);
            return;
          }

          if (notifId) {
            await notifee.cancelNotification(notifId).catch(() => {});
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
            console.error('[NOTIF] foreground snooze failed:', e);
          }

          // Clear stale pending data — snooze replaces with a new notification
          clearPendingAlarm();

          if (notifId) {
            markNotifHandled(notifId);
            await persistNotifHandled(notifId);
          }
        }

        // If fire screen is showing, close it since alarm was handled via notification action
        if (navigationRef.current?.getCurrentRoute?.()?.name === 'AlarmFire') {
          stopAlarmSound();
          navigationRef.current.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      }

      if (type === EventType.DISMISSED) {
        console.log('[NOTIF] FOREGROUND DISMISSED — alarmId:', alarmId, 'timerId:', timerId);
        if (alarmId || timerId) {
          stopAlarmSound();
          clearPendingAlarm();
        }
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
                refreshWidgets();
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

      // Yearly reminder auto-reschedule
      const reminderId = detail.notification?.data?.reminderId as string | undefined;
      if (reminderId && type === EventType.DISMISSED) {
        rescheduleYearlyReminder(reminderId).catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigateToAlarmFire]);

  // ── Pending data consumption on navigation ready ─────────────────
  const onNavigationReady = useCallback(() => {
    isNavigationReady.current = true;
    console.log('[NOTIF] onNavigationReady');

    // Check for pending alarm data that wasn't consumed by initialState
    const pending = getPendingAlarm();
    if (pending) {
      clearPendingAlarm();
      console.log('[NOTIF] onNavigationReady — consuming pending alarm, navigating via reset');
      navigateToAlarmFire(pending);
    }

    // Check for pending note action from widget
    getPendingNoteAction().then((noteAction) => {
      if (noteAction && navigationRef.current) {
        if (noteAction.type === 'edit' && noteAction.noteId) {
          // Verify the note still exists — widget actions can race
          // against the user deleting the note from another surface.
          const note = getNoteById(noteAction.noteId);
          if (note) {
            navigationRef.current.navigate('Notepad', { noteId: noteAction.noteId });
          } else {
            navigationRef.current.navigate('Notepad');
          }
        } else if (noteAction.type === 'new') {
          navigationRef.current.navigate('Notepad', { newNote: true });
        } else {
          navigationRef.current.navigate('Notepad');
        }
      }
    }).catch(() => {});

    // Check for pending alarm action from widget (create or edit)
    try {
      const rawAlarm = kvGet('pendingAlarmAction');
      if (rawAlarm && navigationRef.current) {
        kvRemove('pendingAlarmAction');
        const parsed = safeParse<PendingAlarmAction | null>(rawAlarm, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          if (parsed.action === 'createAlarm') {
            navigationRef.current.navigate('CreateAlarm');
          } else if (parsed.action === 'editAlarm' && parsed.alarmId) {
            loadAlarms().then((allAlarms) => {
              const alarm = allAlarms.find((a) => a.id === parsed.alarmId);
              if (alarm && navigationRef.current) {
                navigationRef.current.navigate('CreateAlarm', { alarm });
              }
            });
          }
        }
      }
    } catch {}

    // Check for pending reminder action from widget (create or edit)
    try {
      const rawReminder = kvGet('pendingReminderAction');
      if (rawReminder && navigationRef.current) {
        kvRemove('pendingReminderAction');
        const parsed = safeParse<PendingReminderAction | null>(rawReminder, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          if (parsed.action === 'createReminder') {
            navigationRef.current.navigate('CreateReminder');
          } else if (parsed.action === 'editReminder' && parsed.reminderId) {
            const reminder = getReminderById(parsed.reminderId);
            if (reminder && navigationRef.current) {
              navigationRef.current.navigate('CreateReminder', { reminderId: parsed.reminderId });
            }
          }
        }
      }
    } catch {}

    // Check for pending calendar action from widget
    try {
      const rawCal = kvGet('pendingCalendarAction');
      if (rawCal && navigationRef.current) {
        kvRemove('pendingCalendarAction');
        const parsed = safeParse<PendingCalendarAction | null>(rawCal, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          navigationRef.current.navigate('Calendar', parsed.date ? { initialDate: parsed.date } : undefined);
        }
      }
    } catch {}

    // Check for pending timer action from widget
    try {
      const rawTimer = kvGet('pendingTimerAction');
      if (rawTimer && navigationRef.current) {
        kvRemove('pendingTimerAction');
        const parsed = safeParse<PendingTimestampAction | null>(rawTimer, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          navigationRef.current.navigate('Timers');
        }
      }
    } catch {}

    // Check for pending voice action from widget
    try {
      const rawVoice = kvGet('pendingVoiceAction');
      if (rawVoice && navigationRef.current) {
        kvRemove('pendingVoiceAction');
        const parsed = safeParse<PendingVoiceAction | null>(rawVoice, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          if (parsed.type === 'list') {
            navigationRef.current.navigate('VoiceMemoList');
          } else if (parsed.type === 'record') {
            navigationRef.current.navigate('VoiceRecord');
          } else if (parsed.type === 'detail' && parsed.memoId) {
            const memo = getVoiceMemoById(parsed.memoId);
            if (memo && navigationRef.current) {
              navigationRef.current.navigate('VoiceMemoDetail', { memoId: parsed.memoId });
            } else if (navigationRef.current) {
              navigationRef.current.navigate('VoiceMemoList');
            }
          }
        }
      }
    } catch {}

    // Check for pending alarm list action from widget
    try {
      const rawAlarmList = kvGet('pendingAlarmListAction');
      if (rawAlarmList && navigationRef.current) {
        kvRemove('pendingAlarmListAction');
        const parsed = safeParse<PendingTimestampAction | null>(rawAlarmList, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          navigationRef.current.navigate('AlarmList');
        }
      }
    } catch {}

    // Check for pending reminder list action from widget
    try {
      const rawReminderList = kvGet('pendingReminderListAction');
      if (rawReminderList && navigationRef.current) {
        kvRemove('pendingReminderListAction');
        const parsed = safeParse<PendingTimestampAction | null>(rawReminderList, null);
        if (parsed && Date.now() - parsed.timestamp < 10000) {
          navigationRef.current.navigate('Reminders');
        }
      }
    } catch {}
  }, [navigateToAlarmFire]);

  // ── AppState fallback ────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isNavigationReady.current && navigationRef.current) {
        // Safety net: if app resumes on a stale AlarmFire screen, reset to AlarmList
        const currentRoute = navigationRef.current.getCurrentRoute?.();
        if (currentRoute?.name === 'AlarmFire') {
          const hasPending = getPendingAlarm();
          if (!hasPending) {
            notifee.getDisplayedNotifications().then((displayed) => {
              const hasAlarmNotif = displayed.some(
                (n) => {
                  const ch = n.notification?.android?.channelId || '';
                  return ch.startsWith('alarm') ||
                    (ch.startsWith('timer') && ch !== 'timer-progress');
                }
              );
              if (!hasAlarmNotif && navigationRef.current) {
                navigationRef.current.reset({ index: 0, routes: [{ name: 'Home' }] });
              }
            }).catch(() => {});
            return;
          }
        }

        consumePendingAlarm();
        // Check for pending note action from widget
        getPendingNoteAction().then((noteAction) => {
          if (noteAction && navigationRef.current) {
            if (noteAction.type === 'edit' && noteAction.noteId) {
              const note = getNoteById(noteAction.noteId);
              if (note) {
                navigationRef.current.navigate('Notepad', { noteId: noteAction.noteId });
              } else {
                navigationRef.current.navigate('Notepad');
              }
            } else if (noteAction.type === 'new') {
              navigationRef.current.navigate('Notepad', { newNote: true });
            } else {
              navigationRef.current.navigate('Notepad');
            }
          }
        }).catch(() => {});
        // Check for pending alarm action from widget (create or edit)
        try {
          const rawAlarm2 = kvGet('pendingAlarmAction');
          if (rawAlarm2 && navigationRef.current) {
            kvRemove('pendingAlarmAction');
            const parsed = safeParse<PendingAlarmAction | null>(rawAlarm2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              if (parsed.action === 'createAlarm') {
                navigationRef.current.navigate('CreateAlarm');
              } else if (parsed.action === 'editAlarm' && parsed.alarmId) {
                loadAlarms().then((allAlarms) => {
                  const alarm = allAlarms.find((a) => a.id === parsed.alarmId);
                  if (alarm && navigationRef.current) {
                    navigationRef.current.navigate('CreateAlarm', { alarm });
                  }
                });
              }
            }
          }
        } catch {}
        // Check for pending reminder action from widget (create or edit)
        try {
          const rawReminder2 = kvGet('pendingReminderAction');
          if (rawReminder2 && navigationRef.current) {
            kvRemove('pendingReminderAction');
            const parsed = safeParse<PendingReminderAction | null>(rawReminder2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              if (parsed.action === 'createReminder') {
                navigationRef.current.navigate('CreateReminder');
              } else if (parsed.action === 'editReminder' && parsed.reminderId) {
                const reminder = getReminderById(parsed.reminderId);
                if (reminder && navigationRef.current) {
                  navigationRef.current.navigate('CreateReminder', { reminderId: parsed.reminderId });
                }
              }
            }
          }
        } catch {}
        // Check for pending calendar action from widget
        try {
          const rawCal2 = kvGet('pendingCalendarAction');
          if (rawCal2 && navigationRef.current) {
            kvRemove('pendingCalendarAction');
            const parsed = safeParse<PendingCalendarAction | null>(rawCal2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              navigationRef.current.navigate('Calendar', parsed.date ? { initialDate: parsed.date } : undefined);
            }
          }
        } catch {}
        // Check for pending timer action from widget
        try {
          const rawTimer2 = kvGet('pendingTimerAction');
          if (rawTimer2 && navigationRef.current) {
            kvRemove('pendingTimerAction');
            const parsed = safeParse<PendingTimestampAction | null>(rawTimer2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              navigationRef.current.navigate('Timers');
            }
          }
        } catch {}
        // Check for pending voice action from widget
        try {
          const rawVoice2 = kvGet('pendingVoiceAction');
          if (rawVoice2 && navigationRef.current) {
            kvRemove('pendingVoiceAction');
            const parsed = safeParse<PendingVoiceAction | null>(rawVoice2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              if (parsed.type === 'list') {
                navigationRef.current.navigate('VoiceMemoList');
              } else if (parsed.type === 'record') {
                navigationRef.current.navigate('VoiceRecord');
              } else if (parsed.type === 'detail' && parsed.memoId) {
                const memo = getVoiceMemoById(parsed.memoId);
                if (memo && navigationRef.current) {
                  navigationRef.current.navigate('VoiceMemoDetail', { memoId: parsed.memoId });
                } else if (navigationRef.current) {
                  navigationRef.current.navigate('VoiceMemoList');
                }
              }
            }
          }
        } catch {}
        // Check for pending alarm list action from widget
        try {
          const rawAlarmList2 = kvGet('pendingAlarmListAction');
          if (rawAlarmList2 && navigationRef.current) {
            kvRemove('pendingAlarmListAction');
            const parsed = safeParse<PendingTimestampAction | null>(rawAlarmList2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              navigationRef.current.navigate('AlarmList');
            }
          }
        } catch {}
        // Check for pending reminder list action from widget
        try {
          const rawReminderList2 = kvGet('pendingReminderListAction');
          if (rawReminderList2 && navigationRef.current) {
            kvRemove('pendingReminderListAction');
            const parsed = safeParse<PendingTimestampAction | null>(rawReminderList2, null);
            if (parsed && Date.now() - parsed.timestamp < 10000) {
              navigationRef.current.navigate('Reminders');
            }
          }
        } catch {}
      }
    });
    return () => subscription.remove();
  }, [consumePendingAlarm]);

  return {
    navigationRef,
    initState,
    onNavigationReady,
  };
}
