import { Alarm } from '../types/alarm';

export type RootStackParamList = {
  Onboarding: { startSlide?: number } | undefined;
  AlarmList: { initialTab?: number } | undefined;
  CreateAlarm: { alarm?: Alarm } | undefined;
  CreateReminder: { reminderId?: string } | undefined;
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
    guessWhyEnabled?: boolean;
    postGuessWhy?: boolean;
  };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean; notificationId?: string };
  Settings: undefined;
  MemoryScore: undefined;
  MemoryMatch: undefined;
  Games: undefined;
  Sudoku: undefined;
  DailyRiddle: undefined;
  ForgetLog: undefined;
  About: undefined;
  Trivia: undefined;
  Notepad: { noteId?: string; newNote?: boolean } | undefined;
};
