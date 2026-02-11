import 'react-native-get-random-values';
import React, { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import AlarmListScreen from './src/screens/AlarmListScreen';
import CreateAlarmScreen from './src/screens/CreateAlarmScreen';
import AlarmFireScreen from './src/screens/AlarmFireScreen';
import GuessWhyScreen from './src/screens/GuessWhyScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MemoryScoreScreen from './src/screens/MemoryScoreScreen';
import ForgetLogScreen from './src/screens/ForgetLogScreen';
import { loadAlarms } from './src/services/storage';
import { loadSettings } from './src/services/settings';
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

  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const alarmId = response.notification.request.content.data?.alarmId;
        if (alarmId) {
          const alarms = await loadAlarms();
          const alarm = alarms.find((a) => a.id === alarmId);
          if (alarm && navigationRef.current) {
            const settings = await loadSettings();
            if (settings.guessWhyEnabled) {
              navigationRef.current.navigate('GuessWhy', { alarm });
            } else {
              navigationRef.current.navigate('AlarmFire', { alarm });
            }
          }
        }
      }
    );
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
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
