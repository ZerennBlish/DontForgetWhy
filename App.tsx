import 'react-native-get-random-values';
import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import VoiceRecordScreen from './src/screens/VoiceRecordScreen';
import VoiceMemoDetailScreen from './src/screens/VoiceMemoDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReminderScreen from './src/screens/ReminderScreen';
import TimerScreen from './src/screens/TimerScreen';
import VoiceMemoListScreen from './src/screens/VoiceMemoListScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useNotificationRouting } from './src/hooks/useNotificationRouting';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { colors } = useTheme();
  const { navigationRef, initState, onNavigationReady } = useNotificationRouting();

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

  // Wait for init phase to complete before rendering the navigator.
  if (!initState) return null;

  const { onboardingDone, alarmFireParams, notepadParams, alarmListParams, reminderListParams, timerParams, createAlarmParams, createReminderParams, calendarParams, voiceMemoListParams, voiceRecordParams, voiceMemoDetailParams } = initState;

  // For TRUE cold start: set initialState so the navigator renders
  // AlarmFireScreen or NotepadScreen on the very first frame.
  const initialNavState = alarmFireParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'AlarmList' as const },
      { name: 'AlarmFire' as const, params: alarmFireParams },
    ],
    index: 2,
  } : notepadParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'Notepad' as const, params: notepadParams },
    ],
    index: 1,
  } : createAlarmParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'AlarmList' as const },
      { name: 'CreateAlarm' as const, params: createAlarmParams },
    ],
    index: 2,
  } : createReminderParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'Reminders' as const },
      { name: 'CreateReminder' as const, params: createReminderParams },
    ],
    index: 2,
  } : calendarParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'Calendar' as const, params: calendarParams },
    ],
    index: 1,
  } : voiceMemoListParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'VoiceMemoList' as const },
    ],
    index: 1,
  } : voiceRecordParams !== null ? {
    routes: [
      { name: 'Home' as const },
      { name: 'VoiceRecord' as const },
    ],
    index: 1,
  } : voiceMemoDetailParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'VoiceMemoDetail' as const, params: voiceMemoDetailParams },
    ],
    index: 1,
  } : reminderListParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'Reminders' as const },
    ],
    index: 1,
  } : alarmListParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'AlarmList' as const },
    ],
    index: 1,
  } : timerParams ? {
    routes: [
      { name: 'Home' as const },
      { name: 'Timers' as const },
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
          initialRouteName={onboardingDone ? 'Home' : 'Onboarding'}
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
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AlarmList" component={AlarmListScreen} />
          <Stack.Screen name="Reminders" component={ReminderScreen} />
          <Stack.Screen
            name="Timers"
            component={TimerScreen}
            options={{ animation: 'slide_from_right' }}
          />
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
            name="VoiceMemoList"
            component={VoiceMemoListScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VoiceRecord"
            component={VoiceRecordScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VoiceMemoDetail"
            component={VoiceMemoDetailScreen}
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
