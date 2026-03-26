import 'react-native-get-random-values';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import AlarmListScreen from './src/screens/AlarmListScreen';
import CreateAlarmScreen from './src/screens/CreateAlarmScreen';
import AlarmFireScreen from './src/screens/AlarmFireScreen';
import GuessWhyScreen from './src/screens/GuessWhyScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MemoryScoreScreen from './src/screens/MemoryScoreScreen';
import ForgetLogScreen from './src/screens/ForgetLogScreen';
import MemoryMatchScreen from './src/screens/MemoryMatchScreen';
import GamesScreen from './src/screens/GamesScreen';
import SudokuScreen from './src/screens/SudokuScreen';
import DailyRiddleScreen from './src/screens/DailyRiddleScreen';
import CreateReminderScreen from './src/screens/CreateReminderScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AboutScreen from './src/screens/AboutScreen';
import TriviaScreen from './src/screens/TriviaScreen';
import NotepadScreen from './src/screens/NotepadScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import { loadAlarms, disableAlarm, deleteAlarm, purgeDeletedAlarms, updateSingleAlarm } from './src/services/storage';
import { getReminders, updateReminder, purgeDeletedReminders } from './src/services/reminderStorage';
import { purgeDeletedNotes, getPendingNoteAction } from './src/services/noteStorage';
import { getOnboardingComplete } from './src/services/settings';
import { setupNotificationChannel, cancelTimerCountdownNotification, scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications, scheduleSnooze } from './src/services/notifications';
import { refreshHapticsSetting } from './src/utils/haptics';
import { refreshWidgets } from './src/widget/updateWidget';
import { loadActiveTimers, saveActiveTimers } from './src/services/timerStorage';
import { getPendingAlarm, setPendingAlarm, clearPendingAlarm, markNotifHandled, wasNotifHandled, wasNotifHandledPersistent, persistNotifHandled } from './src/services/pendingAlarm';
import { playAlarmSoundForNotification, stopAlarmSound } from './src/services/alarmSound';
import type { PendingAlarmData } from './src/services/pendingAlarm';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Yearly reminder reschedule helper ──────────────────────────────
// Yearly recurring reminders use a one-time trigger (notifee has no
// YEARLY repeat). When the notification fires and the user doesn't
// tap Done in-app, we must reschedule for next year automatically.
async function rescheduleYearlyReminder(reminderId: string): Promise<void> {
  try {
    const reminders = await getReminders();
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;
    // Only reschedule yearly pattern: recurring + dueDate + no specific days
    if (!reminder.recurring || !reminder.dueDate || (reminder.days && reminder.days.length > 0)) return;

    // Cancel old notifications
    if (reminder.notificationIds?.length) {
      await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
    } else if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }

    // Bump dueDate to next year (same month/day, year+1)
    const [, mo, d] = reminder.dueDate.split('-').map(Number);
    const now = new Date();
    let nextDate = new Date(now.getFullYear(), mo - 1, d);
    if (nextDate.getTime() <= now.getTime()) {
      nextDate = new Date(now.getFullYear() + 1, mo - 1, d);
    }
    // Handle invalid date (e.g. Feb 29 on non-leap year rolls to Mar)
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

function AppNavigator() {
  const { colors } = useTheme();

  // Single init state: null = loading, non-null = ready to render.
  // Combines onboarding check + cold-start alarm/note resolution.
  const [initState, setInitState] = useState<{
    onboardingDone: boolean;
    alarmFireParams: RootStackParamList['AlarmFire'] | null;
    notepadParams: RootStackParamList['Notepad'] | null;
    alarmListParams: RootStackParamList['AlarmList'] | null;
    createAlarmParams: RootStackParamList['CreateAlarm'] | null;
    createReminderParams: RootStackParamList['CreateReminder'] | null;
    calendarParams: RootStackParamList['Calendar'] | null;
  } | null>(null);

  const navigationRef = useRef<any>(null);
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
  //
  // Fallback: if no pending data exists, check for displayed alarm
  // notifications. This catches edge cases where event handlers didn't
  // store pending data (e.g., DELIVERED went to foreground handler during
  // a background→foreground transition and was lost).
  const consumePendingAlarm = useCallback(async (): Promise<boolean> => {
    const pending = getPendingAlarm();
    if (pending) {
      clearPendingAlarm();
      console.log('[NOTIF] consumePendingAlarm — found:', JSON.stringify(pending));
      await navigateToAlarmFire(pending);
      return true;
    }

    return false;
  }, [navigateToAlarmFire]);

  // ── Init phase ────────────────────────────────────────────────────
  // Runs once on mount. For TRUE cold start (app was killed):
  //   1. Module-level pendingAlarm (set by onBackgroundEvent in index.ts)
  //   2. notifee.getInitialNotification() (cold start from PRESS/fullScreen)
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
              // (module-level Map — covers same-process dedupe within 30s)
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
        // (which fires moments later for the same DELIVERED event)
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
                notepadParams = { noteId: pendingNote.noteId };
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
            const raw = await AsyncStorage.getItem('pendingAlarmAction');
            if (raw) {
              await AsyncStorage.removeItem('pendingAlarmAction');
              const parsed = JSON.parse(raw) as { action: string; alarmId?: string; timestamp: number };
              if (Date.now() - parsed.timestamp < 10000) {
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
            const raw = await AsyncStorage.getItem('pendingReminderAction');
            if (raw) {
              await AsyncStorage.removeItem('pendingReminderAction');
              const parsed = JSON.parse(raw) as { action: string; reminderId?: string; timestamp: number };
              if (Date.now() - parsed.timestamp < 10000) {
                if (parsed.action === 'createReminder') {
                  createReminderParams = {};
                } else if (parsed.action === 'editReminder' && parsed.reminderId) {
                  createReminderParams = { reminderId: parsed.reminderId };
                }
              }
            }
          } catch {}
        }

        // 6. Check for pending tab action from widget deep-link
        let alarmListParams: RootStackParamList['AlarmList'] | null = null;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams) {
          try {
            const raw = await AsyncStorage.getItem('pendingTabAction');
            if (raw) {
              await AsyncStorage.removeItem('pendingTabAction');
              const parsed = JSON.parse(raw) as { tab: number; timestamp: number };
              if (Date.now() - parsed.timestamp < 10000) {
                alarmListParams = { initialTab: parsed.tab };
              }
            }
          } catch {}
        }

        // 7. Check for pending calendar action from widget deep-link
        let calendarParams: RootStackParamList['Calendar'] | null = null;
        if (!alarmFireParams && !notepadParams && !createAlarmParams && !createReminderParams && !alarmListParams) {
          try {
            const raw = await AsyncStorage.getItem('pendingCalendarAction');
            if (raw) {
              await AsyncStorage.removeItem('pendingCalendarAction');
              const parsed = JSON.parse(raw) as { date: string | null; timestamp: number };
              if (Date.now() - parsed.timestamp < 10000) {
                calendarParams = parsed.date ? { initialDate: parsed.date } : {};
              }
            }
          } catch {}
        }

        console.log('[NOTIF] INIT — complete. alarmFireParams:', alarmFireParams ? 'SET' : 'null');
        setInitState({ onboardingDone, alarmFireParams, notepadParams, alarmListParams, createAlarmParams, createReminderParams, calendarParams });
      } catch (e) {
        console.error('[NOTIF] INIT — fatal error:', e);
        setInitState({ onboardingDone: true, alarmFireParams: null, notepadParams: null, alarmListParams: null, createAlarmParams: null, createReminderParams: null, calendarParams: null });
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

  // ── Navigation helpers ────────────────────────────────────────────

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [colors],
  );

  // ── Foreground event handler ──────────────────────────────────────
  // Handles events when the app is running (foreground or warm-started).
  // This is the PRIMARY navigation path when the app is already open.
  //
  // PRESS (1): User tapped the notification in the shade
  // DELIVERED (3): Notification was actually displayed — this fires when
  //   fullScreenAction triggers (alarm goes off). NOT the same as
  //   TRIGGER_NOTIFICATION_CREATED (7) which fires at schedule time.
  // DISMISSED (0): User swiped away the notification
  //
  // NOTE: Do NOT handle TRIGGER_NOTIFICATION_CREATED (7) here — that fires
  // when a trigger is SCHEDULED, not when the alarm actually goes off.
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const notifId = detail.notification?.id;
      const alarmId = detail.notification?.data?.alarmId as string | undefined;
      const timerId = detail.notification?.data?.timerId as string | undefined;
      console.log('[NOTIF] onForegroundEvent type:', type, 'notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

      // ── DELIVERED: play alarm sound only, no navigation ────────────
      // When the app is in the foreground, DELIVERED just starts sound.
      // The user interacts via notification action buttons (Dismiss/Snooze).
      // Tapping the notification body (PRESS) optionally opens AlarmFireScreen.
      if (type === EventType.DELIVERED) {
        const isAlarmOrTimerCompletion = !!(alarmId || timerId);
        if (!isAlarmOrTimerCompletion) {
          // Still handle yearly reminder reschedule for non-alarm DELIVERED
          const rid = detail.notification?.data?.reminderId as string | undefined;
          if (rid) rescheduleYearlyReminder(rid).catch(() => {});
          return;
        }
        // Play alarm sound immediately — no navigation, no setPendingAlarm,
        // no markNotifHandled. PRESS can still navigate if user taps later.
        playAlarmSoundForNotification(alarmId, timerId).catch(() => {});
        return;
      }

      // ── PRESS: user tapped notification body — navigate to AlarmFireScreen ─
      if (type === EventType.PRESS) {
        if (!navigationRef.current || !isNavigationReady.current) {
          // Navigation isn't ready yet — store alarm/timer data as pending
          // so onNavigationReady or AppState handler can consume it.
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
                const snoozingFlag = await AsyncStorage.getItem(`snoozing_${alarmId}`);
                if (snoozingFlag) {
                  await AsyncStorage.removeItem(`snoozing_${alarmId}`);
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

          if (notifId) {
            markNotifHandled(notifId);
            await persistNotifHandled(notifId);
          }
        }

        if (actionId === 'snooze' && alarmId) {
          stopAlarmSound();

          // Set snoozing flag BEFORE cancelling notification (prevents one-time alarm deletion)
          // Abort if flag write fails — a failed snooze is better than a deleted alarm
          try {
            await AsyncStorage.setItem(`snoozing_${alarmId}`, '1');
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

          if (notifId) {
            markNotifHandled(notifId);
            await persistNotifHandled(notifId);
          }
        }

        // If fire screen is showing, close it since alarm was handled via notification action
        if (navigationRef.current?.getCurrentRoute?.()?.name === 'AlarmFire') {
          stopAlarmSound();
          navigationRef.current.reset({ index: 0, routes: [{ name: 'AlarmList' }] });
        }
      }

      if (type === EventType.DISMISSED) {
        console.log('[NOTIF] FOREGROUND DISMISSED — alarmId:', alarmId, 'timerId:', timerId);
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
                refreshWidgets();
              }
            }
          } catch {}
        }
      }

      // Yearly reminder auto-reschedule: when a reminder notification
      // is dismissed, reschedule yearly recurring reminders for next year.
      // (DELIVERED case is handled in the DELIVERED block above.)
      const reminderId = detail.notification?.data?.reminderId as string | undefined;
      if (reminderId && type === EventType.DISMISSED) {
        rescheduleYearlyReminder(reminderId).catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigateToAlarmFire]);

  // ── Pending data consumption on navigation ready ─────────────────
  // When the navigator becomes ready, check if there's pending alarm data
  // from the background handler that wasn't consumed by initialState
  // (e.g., app was already running, NavigationContainer already mounted).
  // Use navigate() to go directly to AlarmFireScreen.
  const onNavigationReady = useCallback(() => {
    isNavigationReady.current = true;
    console.log('[NOTIF] onNavigationReady');

    // Check for pending alarm data that wasn't consumed by initialState
    const pending = getPendingAlarm();
    if (pending) {
      clearPendingAlarm();
      console.log('[NOTIF] onNavigationReady — consuming pending alarm, navigating via reset');
      // Use navigateToAlarmFire (async) — navigation is ready at this point
      navigateToAlarmFire(pending);
    }

    // Check for pending note action from widget
    getPendingNoteAction().then((noteAction) => {
      if (noteAction && navigationRef.current) {
        if (noteAction.type === 'edit' && noteAction.noteId) {
          navigationRef.current.navigate('Notepad', { noteId: noteAction.noteId });
        } else if (noteAction.type === 'new') {
          navigationRef.current.navigate('Notepad', { newNote: true });
        } else {
          navigationRef.current.navigate('Notepad');
        }
      }
    }).catch(() => {});

    // Check for pending alarm action from widget (create or edit)
    AsyncStorage.getItem('pendingAlarmAction').then(async (raw) => {
      if (raw && navigationRef.current) {
        AsyncStorage.removeItem('pendingAlarmAction');
        const parsed = JSON.parse(raw) as { action: string; alarmId?: string; timestamp: number };
        if (Date.now() - parsed.timestamp < 10000) {
          if (parsed.action === 'createAlarm') {
            navigationRef.current.navigate('CreateAlarm');
          } else if (parsed.action === 'editAlarm' && parsed.alarmId) {
            const allAlarms = await loadAlarms();
            const alarm = allAlarms.find((a) => a.id === parsed.alarmId);
            if (alarm && navigationRef.current) {
              navigationRef.current.navigate('CreateAlarm', { alarm });
            }
          }
        }
      }
    }).catch(() => {});

    // Check for pending reminder action from widget (create or edit)
    AsyncStorage.getItem('pendingReminderAction').then((raw) => {
      if (raw && navigationRef.current) {
        AsyncStorage.removeItem('pendingReminderAction');
        const parsed = JSON.parse(raw) as { action: string; reminderId?: string; timestamp: number };
        if (Date.now() - parsed.timestamp < 10000) {
          if (parsed.action === 'createReminder') {
            navigationRef.current.navigate('CreateReminder');
          } else if (parsed.action === 'editReminder' && parsed.reminderId) {
            navigationRef.current.navigate('CreateReminder', { reminderId: parsed.reminderId });
          }
        }
      }
    }).catch(() => {});

    // Check for pending calendar action from widget
    AsyncStorage.getItem('pendingCalendarAction').then((raw) => {
      if (raw && navigationRef.current) {
        AsyncStorage.removeItem('pendingCalendarAction');
        const parsed = JSON.parse(raw) as { date: string | null; timestamp: number };
        if (Date.now() - parsed.timestamp < 10000) {
          navigationRef.current.navigate('Calendar', parsed.date ? { initialDate: parsed.date } : undefined);
        }
      }
    }).catch(() => {});

    // pendingTabAction is now handled directly by AlarmListScreen
  }, [navigateToAlarmFire]);

  // ── AppState fallback ────────────────────────────────────────────
  // When the app comes to foreground, check for pending alarm data from
  // the background handler. This catches edge cases where:
  // - onBackgroundEvent stored pending data
  // - fullScreenAction brought the app to foreground
  // - But the foreground event handler didn't fire or missed the event
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isNavigationReady.current && navigationRef.current) {
        // Safety net: if app resumes on a stale AlarmFire screen (e.g., after
        // exitApp didn't kill the process), reset to AlarmList — but only if
        // there are no active alarm/timer notifications displayed (which would
        // mean the fire screen is legitimate and still in use).
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
                navigationRef.current.reset({ index: 0, routes: [{ name: 'AlarmList' }] });
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
              navigationRef.current.navigate('Notepad', { noteId: noteAction.noteId });
            } else if (noteAction.type === 'new') {
              navigationRef.current.navigate('Notepad', { newNote: true });
            } else {
              navigationRef.current.navigate('Notepad');
            }
          }
        }).catch(() => {});
        // Check for pending alarm action from widget (create or edit)
        AsyncStorage.getItem('pendingAlarmAction').then(async (raw) => {
          if (raw && navigationRef.current) {
            AsyncStorage.removeItem('pendingAlarmAction');
            const parsed = JSON.parse(raw) as { action: string; alarmId?: string; timestamp: number };
            if (Date.now() - parsed.timestamp < 10000) {
              if (parsed.action === 'createAlarm') {
                navigationRef.current.navigate('CreateAlarm');
              } else if (parsed.action === 'editAlarm' && parsed.alarmId) {
                const allAlarms = await loadAlarms();
                const alarm = allAlarms.find((a) => a.id === parsed.alarmId);
                if (alarm && navigationRef.current) {
                  navigationRef.current.navigate('CreateAlarm', { alarm });
                }
              }
            }
          }
        }).catch(() => {});
        // Check for pending reminder action from widget (create or edit)
        AsyncStorage.getItem('pendingReminderAction').then((raw) => {
          if (raw && navigationRef.current) {
            AsyncStorage.removeItem('pendingReminderAction');
            const parsed = JSON.parse(raw) as { action: string; reminderId?: string; timestamp: number };
            if (Date.now() - parsed.timestamp < 10000) {
              if (parsed.action === 'createReminder') {
                navigationRef.current.navigate('CreateReminder');
              } else if (parsed.action === 'editReminder' && parsed.reminderId) {
                navigationRef.current.navigate('CreateReminder', { reminderId: parsed.reminderId });
              }
            }
          }
        }).catch(() => {});
        // Check for pending calendar action from widget
        AsyncStorage.getItem('pendingCalendarAction').then((raw) => {
          if (raw && navigationRef.current) {
            AsyncStorage.removeItem('pendingCalendarAction');
            const parsed = JSON.parse(raw) as { date: string | null; timestamp: number };
            if (Date.now() - parsed.timestamp < 10000) {
              navigationRef.current.navigate('Calendar', parsed.date ? { initialDate: parsed.date } : undefined);
            }
          }
        }).catch(() => {});
        // pendingTabAction is now handled directly by AlarmListScreen
      }
    });
    return () => subscription.remove();
  }, [consumePendingAlarm]);

  // ── Render ────────────────────────────────────────────────────────

  // Wait for init phase to complete before rendering the navigator.
  // This prevents any flash of the wrong screen.
  if (!initState) return null;

  const { onboardingDone, alarmFireParams, notepadParams, alarmListParams, createAlarmParams, createReminderParams, calendarParams } = initState;

  // For TRUE cold start: set initialState so the navigator renders
  // AlarmFireScreen or NotepadScreen on the very first frame. AlarmList
  // is kept at index 0 so the nav stack is clean after dismiss.
  const initialNavState = alarmFireParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'AlarmFire' as const, params: alarmFireParams },
    ],
    index: 1,
  } : notepadParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'Notepad' as const, params: notepadParams },
    ],
    index: 1,
  } : createAlarmParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'CreateAlarm' as const, params: createAlarmParams },
    ],
    index: 1,
  } : createReminderParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'CreateReminder' as const, params: createReminderParams },
    ],
    index: 1,
  } : calendarParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'Calendar' as const, params: calendarParams },
    ],
    index: 1,
  } : alarmListParams ? {
    routes: [
      { name: 'AlarmList' as const, params: alarmListParams },
    ],
    index: 0,
  } : undefined;

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={onNavigationReady}
        initialState={initialNavState}
      >
        <Stack.Navigator
          initialRouteName={onboardingDone ? 'AlarmList' : 'Onboarding'}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="AlarmList" component={AlarmListScreen} />
          <Stack.Screen
            name="CreateAlarm"
            component={CreateAlarmScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AlarmFire"
            component={AlarmFireScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="GuessWhy"
            component={GuessWhyScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MemoryScore"
            component={MemoryScoreScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MemoryMatch"
            component={MemoryMatchScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Games"
            component={GamesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Sudoku"
            component={SudokuScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="DailyRiddle"
            component={DailyRiddleScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreateReminder"
            component={CreateReminderScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="ForgetLog"
            component={ForgetLogScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Trivia"
            component={TriviaScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Notepad"
            component={NotepadScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
