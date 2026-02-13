import 'react-native-get-random-values';
import React, { useEffect, useMemo, useRef, useCallback } from 'react';
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
import { loadAlarms, disableAlarm } from './src/services/storage';
import { loadSettings } from './src/services/settings';
import { setupNotificationChannel, cancelTimerCountdownNotification } from './src/services/notifications';
import { loadActiveTimers, saveActiveTimers } from './src/services/timerStorage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { colors } = useTheme();

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
    if (!navigationRef.current || !isNavigationReady.current) {
      pendingAlarmId.current = alarmId;
      pendingNotificationId.current = pressedNotificationId || null;
      return;
    }

    const alarms = await loadAlarms();
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) return;

    // Dismiss all displayed notifications for this alarm
    const idsToCancel = [...(alarm.notificationIds || [])];
    if (alarm.notificationId && !idsToCancel.includes(alarm.notificationId)) {
      idsToCancel.push(alarm.notificationId);
    }
    if (pressedNotificationId && !idsToCancel.includes(pressedNotificationId)) {
      idsToCancel.push(pressedNotificationId);
    }
    for (const id of idsToCancel) {
      await notifee.cancelNotification(id).catch(() => {});
    }

    // Auto-disable one-time alarms after firing
    if (alarm.mode === 'one-time') {
      disableAlarm(alarmId).catch(() => {});
    }

    const settings = await loadSettings();
    if (settings.guessWhyEnabled) {
      navigationRef.current.navigate('GuessWhy', { alarm, fromNotification: true });
    } else {
      navigationRef.current.navigate('AlarmFire', { alarm, fromNotification: true });
    }
  }, []);

  // Create notification channel on startup (DND bypass + alarm settings)
  useEffect(() => {
    setupNotificationChannel();
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
      if (!initial?.notification) return;
      if (initial.notification.data?.timerId && initial.notification.id) {
        await notifee.cancelNotification(initial.notification.id);
        const timerId = initial.notification.data.timerId as string;
        await cancelTimerCountdownNotification(timerId).catch(() => {});
      } else if (initial.notification.data?.alarmId) {
        navigateToAlarm(
          initial.notification.data.alarmId as string,
          initial.notification.id || undefined,
        );
      }
    });
  }, [navigateToAlarm]);

  // Foreground: notification pressed while app is open
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        if (detail.notification?.data?.timerId && detail.notification?.id) {
          await notifee.cancelNotification(detail.notification.id);
          const timerId = detail.notification.data.timerId as string;
          await cancelTimerCountdownNotification(timerId).catch(() => {});
        } else if (detail.notification?.data?.alarmId) {
          navigateToAlarm(
            detail.notification.data.alarmId as string,
            detail.notification?.id || undefined,
          );
        }
      }
    });
    return unsubscribe;
  }, [navigateToAlarm]);

  const onNavigationReady = useCallback(() => {
    isNavigationReady.current = true;
    if (pendingAlarmId.current) {
      navigateToAlarm(pendingAlarmId.current, pendingNotificationId.current || undefined);
      pendingAlarmId.current = null;
      pendingNotificationId.current = null;
    }
  }, [navigateToAlarm]);

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={onNavigationReady}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
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
            name="ForgetLog"
            component={ForgetLogScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
