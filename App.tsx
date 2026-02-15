import 'react-native-get-random-values';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Vibration } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import guessWhyIcons from './src/data/guessWhyIcons';
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
import { loadAlarms, disableAlarm } from './src/services/storage';
import { loadSettings, getOnboardingComplete } from './src/services/settings';
import { setupNotificationChannel, cancelTimerCountdownNotification } from './src/services/notifications';
import { refreshHapticsSetting } from './src/utils/haptics';
import { refreshTimerWidget } from './src/widget/updateWidget';
import { loadActiveTimers, saveActiveTimers } from './src/services/timerStorage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { colors } = useTheme();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingDone);
  }, []);

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

  const navigationRef = useRef<any>(null);
  const isNavigationReady = useRef(false);
  const pendingAlarmId = useRef<string | null>(null);
  const pendingNotificationId = useRef<string | null>(null);

  const navigateToAlarm = useCallback(async (alarmId: string, pressedNotificationId?: string) => {
    console.log('[NOTIF] navigateToAlarm called — alarmId:', alarmId, 'pressedNotificationId:', pressedNotificationId);

    // Cancel pressed notification immediately to stop sound/vibration,
    // even if navigation isn't ready yet (cold-start race)
    if (pressedNotificationId) {
      console.log('[NOTIF] navigateToAlarm — cancelling pressed notification:', pressedNotificationId);
      try {
        await notifee.cancelNotification(pressedNotificationId);
        console.log('[NOTIF] navigateToAlarm — pressed notification cancelled:', pressedNotificationId);
      } catch (e) {
        console.log('[NOTIF] navigateToAlarm — cancelNotification FAILED:', pressedNotificationId, e);
      }
    }

    // Also kill any device-level vibration (belt-and-suspenders)
    Vibration.cancel();
    console.log('[NOTIF] navigateToAlarm — Vibration.cancel() called');

    if (!navigationRef.current || !isNavigationReady.current) {
      console.log('[NOTIF] navigateToAlarm — navigation NOT ready, queuing alarm:', alarmId);
      pendingAlarmId.current = alarmId;
      pendingNotificationId.current = pressedNotificationId || null;
      return;
    }

    const alarms = await loadAlarms();
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) {
      console.log('[NOTIF] navigateToAlarm — alarm not found in storage:', alarmId);
      return;
    }

    // Dismiss all displayed notifications for this alarm
    const idsToCancel = [...(alarm.notificationIds || [])];
    if (alarm.notificationId && !idsToCancel.includes(alarm.notificationId)) {
      idsToCancel.push(alarm.notificationId);
    }
    if (pressedNotificationId && !idsToCancel.includes(pressedNotificationId)) {
      idsToCancel.push(pressedNotificationId);
    }
    console.log('[NOTIF] navigateToAlarm — cancelling all alarm notification IDs:', idsToCancel);
    for (const id of idsToCancel) {
      try {
        await notifee.cancelNotification(id);
        console.log('[NOTIF] navigateToAlarm — cancelled:', id);
      } catch (e) {
        console.log('[NOTIF] navigateToAlarm — cancel FAILED:', id, e);
      }
    }

    // Kill vibration again after all cancels complete
    Vibration.cancel();

    // Auto-disable one-time alarms after firing
    if (alarm.mode === 'one-time') {
      disableAlarm(alarmId).then(() => refreshTimerWidget()).catch(() => {});
    }

    const settings = await loadSettings();
    if (settings.guessWhyEnabled) {
      // Check if GuessWhy can actually be played with this alarm
      const hasIcon = Boolean(alarm.icon) && guessWhyIcons.some((i) => i.emoji === alarm.icon);
      const canPlay = hasIcon || alarm.note.length >= 3;
      if (canPlay) {
        console.log('[NOTIF] NAVIGATING TO: GuessWhy');
        navigationRef.current.navigate('GuessWhy', { alarm, fromNotification: true });
      } else {
        // Can't play GuessWhy — go directly to AlarmFire, skip GuessWhy entirely
        console.log('[NOTIF] NAVIGATING TO: AlarmFire (GuessWhy enabled but canPlay=false)');
        navigationRef.current.navigate('AlarmFire', { alarm, fromNotification: true });
      }
    } else {
      console.log('[NOTIF] NAVIGATING TO: AlarmFire');
      navigationRef.current.navigate('AlarmFire', { alarm, fromNotification: true });
    }
  }, []);

  // Create notification channel on startup (DND bypass + alarm settings)
  // Also load haptics setting before first interaction
  useEffect(() => {
    setupNotificationChannel();
    refreshHapticsSetting();
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
            // Timer completed while app was killed — cancel orphaned countdown
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

  // Cold-start: app launched from notification tap or full-screen intent
  useEffect(() => {
    notifee.getInitialNotification().then(async (initial) => {
      console.log('[NOTIF] getInitialNotification result:', initial ? 'HAS notification' : 'null');
      if (!initial?.notification) return;

      const notifId = initial.notification.id;
      const alarmId = initial.notification.data?.alarmId as string | undefined;
      const timerId = initial.notification.data?.timerId as string | undefined;
      console.log('[NOTIF] COLD START — notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

      if (timerId && notifId) {
        console.log('[NOTIF] COLD START — timer notification, cancelling:', notifId);
        await notifee.cancelNotification(notifId).catch(() => {});
        await cancelTimerCountdownNotification(timerId).catch(() => {});
      } else if (alarmId) {
        // Cancel notification immediately to stop sound/vibration
        if (notifId) {
          console.log('[NOTIF] COLD START — cancelling alarm notification:', notifId);
          try {
            await notifee.cancelNotification(notifId);
            console.log('[NOTIF] COLD START — alarm notification cancelled:', notifId);
          } catch (e) {
            console.log('[NOTIF] COLD START — cancelNotification FAILED:', notifId, e);
          }
          // Also kill device-level vibration
          Vibration.cancel();
          console.log('[NOTIF] COLD START — Vibration.cancel() called');
        } else {
          console.log('[NOTIF] COLD START — WARNING: no notification ID for alarm');
        }
        console.log('[NOTIF] COLD START — calling navigateToAlarm');
        navigateToAlarm(alarmId, notifId || undefined);
      }
    });
  }, [navigateToAlarm]);

  // Foreground: notification pressed while app is open
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const notifId = detail.notification?.id;
      const alarmId = detail.notification?.data?.alarmId as string | undefined;
      const timerId = detail.notification?.data?.timerId as string | undefined;
      console.log('[NOTIF] onForegroundEvent type:', type, 'notifId:', notifId, 'alarmId:', alarmId, 'timerId:', timerId);

      if (type === EventType.PRESS) {
        if (timerId && notifId) {
          console.log('[NOTIF] FOREGROUND PRESS — timer notification, cancelling:', notifId);
          await notifee.cancelNotification(notifId).catch(() => {});
          await cancelTimerCountdownNotification(timerId).catch(() => {});
        } else if (alarmId) {
          // Cancel notification immediately to stop sound/vibration
          if (notifId) {
            console.log('[NOTIF] FOREGROUND PRESS — cancelling alarm notification:', notifId);
            try {
              await notifee.cancelNotification(notifId);
              console.log('[NOTIF] FOREGROUND PRESS — alarm notification cancelled:', notifId);
            } catch (e) {
              console.log('[NOTIF] FOREGROUND PRESS — cancelNotification FAILED:', notifId, e);
            }
            // Also kill device-level vibration
            Vibration.cancel();
            console.log('[NOTIF] FOREGROUND PRESS — Vibration.cancel() called');
          } else {
            console.log('[NOTIF] FOREGROUND PRESS — WARNING: no notification ID for alarm');
          }
          console.log('[NOTIF] FOREGROUND PRESS — calling navigateToAlarm');
          navigateToAlarm(alarmId, notifId || undefined);
        }
      }
      if (type === EventType.DISMISSED) {
        console.log('[NOTIF] FOREGROUND DISMISSED — alarmId:', alarmId);
        if (alarmId) {
          const alarms = await loadAlarms();
          const alarm = alarms.find((a) => a.id === alarmId);
          if (alarm?.mode === 'one-time') {
            await disableAlarm(alarmId);
            refreshTimerWidget();
          }
        }
      }
    });
    return unsubscribe;
  }, [navigateToAlarm]);

  const onNavigationReady = useCallback(() => {
    isNavigationReady.current = true;
    console.log('[NOTIF] onNavigationReady — pendingAlarmId:', pendingAlarmId.current, 'pendingNotificationId:', pendingNotificationId.current);
    if (pendingAlarmId.current) {
      navigateToAlarm(pendingAlarmId.current, pendingNotificationId.current || undefined);
      pendingAlarmId.current = null;
      pendingNotificationId.current = null;
    }
  }, [navigateToAlarm]);

  // Wait for onboarding check before rendering
  if (onboardingDone === null) {
    return null;
  }

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={onNavigationReady}
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
