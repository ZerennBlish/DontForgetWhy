import { Alarm } from '../types/alarm';

export type RootStackParamList = {
  Home: undefined;
  Onboarding: { startSlide?: number } | undefined;
  AlarmList: undefined;
  Reminders: undefined;
  Timers: undefined;
  VoiceMemoList: undefined;
  CreateAlarm: { alarm?: Alarm; initialDate?: string } | undefined;
  CreateReminder: { reminderId?: string; initialDate?: string } | undefined;
  AlarmFire: {
    alarm?: Alarm;
    fromNotification?: boolean;
    isTimer?: boolean;
    timerLabel?: string;
    timerIcon?: string;
    timerId?: string;
    timerSoundId?: string;
    timerNotificationId?: string;
    notificationId?: string;
    postGuessWhy?: boolean;
  };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean; notificationId?: string };
  Settings: undefined;
  MemoryScore: undefined;
  MemoryMatch: undefined;
  Games: undefined;
  Sudoku: undefined;
  DailyRiddle: undefined;
  About: undefined;
  Trivia: undefined;
  Chess: undefined;
  Checkers: undefined;
  Notepad: { noteId?: string; newNote?: boolean } | undefined;
  Calendar: { initialDate?: string } | undefined;
  VoiceRecord: { addToMemoId?: string } | undefined;
  VoiceMemoDetail: { memoId: string };
};
