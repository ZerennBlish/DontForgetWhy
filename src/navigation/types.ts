import { Alarm } from '../types/alarm';

export type RootStackParamList = {
  AlarmList: undefined;
  CreateAlarm: { alarm?: Alarm } | undefined;
  AlarmFire: { alarm: Alarm; fromNotification?: boolean };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean };
  Settings: undefined;
  MemoryScore: undefined;
  MemoryMatch: undefined;
  Games: undefined;
  ForgetLog: undefined;
};
