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
import { loadAlarms, disableAlarm, deleteAlarm, purgeDeletedAlarms } from './src/services/storage';
import { getReminders, updateReminder, purgeDeletedReminders } from './src/services/reminderStorage';
import { loadSettings, getOnboardingComplete } from './src/services/settings';
import { setupNotificationChannel, cancelTimerCountdownNotification, scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications } from './src/services/notifications';
import { refreshHapticsSetting } from './src/utils/haptics';
import { refreshTimerWidget } from './src/widget/updateWidget';
import { loadActiveTimers, saveActiveTimers } from './src/services/timerStorage';
import { getPendingAlarm, setPendingAlarm, clearPendingAlarm, markNotifHandled, wasNotifHandled } from './src/services/pendingAlarm';
import { playAlarmSoundForNotification, stopAlarmSound } from './src/services/alarmSound';
import type { PendingAlarmData } from './src/services/pendingAlarm';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
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
  // Combines onboarding check + cold-start alarm resolution.
  const [initState, setInitState] = useState<{
    onboardingDone: boolean;
    alarmFireParams: RootStackParamList['AlarmFire'] | null;
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
      navigationRef.current.navigate('AlarmFire', {
        isTimer: true,
        timerLabel: pending.timerLabel || 'Timer',
        timerIcon: pending.timerIcon || '\u23F1\uFE0F',
        timerId: pending.timerId,
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
        const settings = await loadSettings();
        if (navigationRef.current) {
          navigationRef.current.navigate('AlarmFire', {
            alarm,
            fromNotification: true,
            notificationId: pending.notificationId,
            guessWhyEnabled: settings.guessWhyEnabled,
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

    // Fallback: check displayed notifications for an active alarm/timer
    // that hasn't been handled yet. Alarm notifications are ongoing and
    // only cancelled by Dismiss/Snooze, so a displayed one means an
    // active alarm that needs the fire screen.
    try {
      const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
      if (currentRoute === 'AlarmFire') return false;

      const displayed = await notifee.getDisplayedNotifications();
      for (const d of displayed) {
        const dAlarmId = d.notification?.data?.alarmId as string | undefined;
        const dTimerId = d.notification?.data?.timerId as string | undefined;
        const dNotifId = d.notification?.id;

        if (dAlarmId && dNotifId && !wasNotifHandled(dNotifId)) {
          console.log('[NOTIF] consumePendingAlarm fallback — found displayed alarm:', dAlarmId);
          await navigateToAlarmFire({ alarmId: dAlarmId, notificationId: dNotifId });
          return true;
        }
        if (dTimerId && dNotifId && !wasNotifHandled(dNotifId)) {
          const tIcon = d.notification?.title?.replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
          const tLabel = d.notification?.body?.replace(' is done!', '').trim() || 'Timer';
          console.log('[NOTIF] consumePendingAlarm fallback — found displayed timer:', dTimerId);
          await navigateToAlarmFire({ timerId: dTimerId, notificationId: dNotifId, timerLabel: tLabel, timerIcon: tIcon });
          return true;
        }
      }
    } catch (e) {
      console.error('[NOTIF] consumePendingAlarm fallback error:', e);
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
            alarmFireParams = {
              isTimer: true,
              timerLabel: pending.timerLabel || 'Timer',
              timerIcon: pending.timerIcon || '\u23F1\uFE0F',
              timerId: pending.timerId,
              timerNotificationId: pending.notificationId,
              notificationId: pending.notificationId,
              fromNotification: true,
            };
          } else if (pending.alarmId) {
            try {
              const alarms = await loadAlarms();
              const alarm = alarms.find((a) => a.id === pending.alarmId);
              if (alarm) {
                const settings = await loadSettings();
                alarmFireParams = {
                  alarm,
                  fromNotification: true,
                  notificationId: pending.notificationId,
                  guessWhyEnabled: settings.guessWhyEnabled,
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
              if (wasNotifHandled(notifId)) {
                console.log('[NOTIF] INIT — getInitialNotification already handled:', notifId);
              } else {
                if (timerId && notifId) {
                  const tIcon = initial.notification?.title?.replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
                  const tLabel = initial.notification?.body?.replace(' is done!', '').trim() || 'Timer';
                  alarmFireParams = {
                    isTimer: true,
                    timerLabel: tLabel,
                    timerIcon: tIcon,
                    timerId,
                    timerNotificationId: notifId,
                    notificationId: notifId,
                    fromNotification: true,
                  };
                } else if (alarmId) {
                  try {
                    const alarms = await loadAlarms();
                    const alarm = alarms.find((a) => a.id === alarmId);
                    if (alarm) {
                      const settings = await loadSettings();
                      alarmFireParams = {
                        alarm,
                        fromNotification: true,
                        notificationId: notifId,
                        guessWhyEnabled: settings.guessWhyEnabled,
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
          console.log('[NOTIF] INIT — set dedupe marker for:', alarmFireParams.notificationId);
        }

        console.log('[NOTIF] INIT — complete. alarmFireParams:', alarmFireParams ? 'SET' : 'null');
        setInitState({ onboardingDone, alarmFireParams });
      } catch (e) {
        console.error('[NOTIF] INIT — fatal error:', e);
        setInitState({ onboardingDone: true, alarmFireParams: null });
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

      // Navigate to AlarmFireScreen on PRESS or DELIVERED only.
      // DELIVERED (3) = notification displayed (fullScreenAction fires this).
      // PRESS (1) = user tapped the notification.
      const isNavigationEvent =
        type === EventType.PRESS ||
        type === EventType.DELIVERED;

      if (isNavigationEvent) {
        // For DELIVERED, filter: only alarm/timer notifications that should
        // navigate to AlarmFireScreen. Skip reminders, sound previews, etc.
        //
        // Timer completion uses ID timer-done-{timerId} (separate from the
        // countdown chronometer countdown-{timerId}). We distinguish them
        // by data.timerId: the countdown has no data field, so timerId is
        // undefined; the completion trigger has data: { timerId }.
        if (type === EventType.DELIVERED) {
          const isAlarmOrTimerCompletion = !!(alarmId || timerId);
          if (!isAlarmOrTimerCompletion) return;
          // Play alarm sound immediately on DELIVERED so it starts the
          // instant the notification fires, regardless of screen state.
          playAlarmSoundForNotification(alarmId, timerId).catch(() => {});
        }

        if (!navigationRef.current || !isNavigationReady.current) {
          // Navigation isn't ready yet — store alarm/timer data as pending
          // so onNavigationReady or AppState handler can consume it.
          // Without this, the event is lost and AlarmFireScreen never shows.
          if (timerId && notifId) {
            const tIcon = detail.notification?.title?.replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
            const tLabel = detail.notification?.body?.replace(' is done!', '').trim() || 'Timer';
            setPendingAlarm({ timerId, notificationId: notifId, timerLabel: tLabel, timerIcon: tIcon });
          } else if (alarmId) {
            setPendingAlarm({ alarmId, notificationId: notifId });
          }
          console.log('[NOTIF] FOREGROUND — navigation not ready, stored as pending for onNavigationReady');
          return;
        }

        // If AlarmFireScreen is already the active route, don't stack another
        const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
        if (currentRoute === 'AlarmFire') {
          console.log('[NOTIF] FOREGROUND — already on AlarmFireScreen, skipping');
          return;
        }

        // Clear any pending data from background handler to prevent double navigation
        clearPendingAlarm();

        // Skip if AlarmFireScreen already handled this notification
        if (wasNotifHandled(notifId)) {
          console.log('[NOTIF] FOREGROUND — skipping already-handled:', notifId);
          return;
        }

        // DO NOT mark as handled here — each branch handles its own marking.
        // Timer marks before direct navigation; alarm relies on
        // navigateToAlarmFire's internal mark. Marking prematurely here
        // would cause navigateToAlarmFire to see it as already handled
        // and skip the alarm navigation entirely.

        // DO NOT cancel notifications here — AlarmFireScreen's Dismiss/Snooze
        // handlers cancel notifications and stop alarm sound when the user acts.

        // Timer completion notifications have data.timerId set.
        // The countdown chronometer (same ID prefix) has NO data, so
        // timerId is undefined and this branch is skipped for it.
        if (timerId && notifId) {
          markNotifHandled(notifId);
          const tIcon = detail.notification?.title?.replace(' Timer Complete', '').trim() || '\u23F1\uFE0F';
          const tLabel = detail.notification?.body?.replace(' is done!', '').trim() || 'Timer';

          console.log('[NOTIF] FOREGROUND — navigating to AlarmFire (timer)');
          navigationRef.current.navigate('AlarmFire', {
            isTimer: true,
            timerLabel: tLabel,
            timerIcon: tIcon,
            timerId,
            timerNotificationId: notifId,
            notificationId: notifId,
            fromNotification: true,
          });
        } else if (alarmId) {
          // navigateToAlarmFire checks wasNotifHandled + marks internally
          console.log('[NOTIF] FOREGROUND — navigating to AlarmFire (alarm), notifId:', notifId);
          await navigateToAlarmFire({ alarmId, notificationId: notifId });
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
              await deleteAlarm(alarmId);
              refreshTimerWidget();
            }
          } catch {}
        }
      }

      // Yearly reminder auto-reschedule: when a reminder notification
      // fires (DELIVERED) or is dismissed, reschedule yearly recurring
      // reminders for next year. This catches the case where the user
      // doesn't tap Done in-app — the one-time trigger is consumed and
      // we must schedule the next occurrence automatically.
      const reminderId = detail.notification?.data?.reminderId as string | undefined;
      if (reminderId && (type === EventType.DELIVERED || type === EventType.DISMISSED)) {
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
        consumePendingAlarm();
      }
    });
    return () => subscription.remove();
  }, [consumePendingAlarm]);

  // ── Render ────────────────────────────────────────────────────────

  // Wait for init phase to complete before rendering the navigator.
  // This prevents any flash of the wrong screen.
  if (!initState) return null;

  const { onboardingDone, alarmFireParams } = initState;

  // For TRUE cold start: set initialState so the navigator renders
  // AlarmFireScreen on the very first frame. AlarmList is kept at
  // index 0 so the nav stack is clean after dismiss.
  const initialNavState = alarmFireParams ? {
    routes: [
      { name: 'AlarmList' as const },
      { name: 'AlarmFire' as const, params: alarmFireParams },
    ],
    index: 1,
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
