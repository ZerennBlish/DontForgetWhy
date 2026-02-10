import { Alarm } from '../types/alarm';

export type RootStackParamList = {
  AlarmList: undefined;
  CreateAlarm: undefined;
  AlarmFire: { alarm: Alarm };
  GuessWhy: { alarm: Alarm };
  Settings: undefined;
  MemoryScore: undefined;
};
