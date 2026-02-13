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
import { loadAlarms } from './src/services/storage';
import { loadSettings } from './src/services/settings';
import { setupNotificationChannel, cancelTimerCountdownNotification } from './src/services/notifications';
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
  const navigateToAlarm = useCallback(async (alarmId: string) => {
    if (!navigationRef.current || !isNavigationReady.current) {
      pendingAlarmId.current = alarmId;
      return;
    }

    const alarms = await loadAlarms();
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) return;

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

  // Cold-start: app launched from notification tap or full-screen intent
  useEffect(() => {
    notifee.getInitialNotification().then(async (initial) => {
      if (!initial?.notification) return;
      if (initial.notification.data?.timerId && initial.notification.id) {
        await notifee.cancelNotification(initial.notification.id);
        const timerId = initial.notification.data.timerId as string;
        await cancelTimerCountdownNotification(timerId).catch(() => {});
      } else if (initial.notification.data?.alarmId) {
        navigateToAlarm(initial.notification.data.alarmId as string);
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
          navigateToAlarm(detail.notification.data.alarmId as string);
        }
      }
    });
    return unsubscribe;
  }, [navigateToAlarm]);

  const onNavigationReady = useCallback(() => {
    isNavigationReady.current = true;
    if (pendingAlarmId.current) {
      navigateToAlarm(pendingAlarmId.current);
      pendingAlarmId.current = null;
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
