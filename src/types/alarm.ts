export type AlarmDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const ALL_DAYS: AlarmDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS: AlarmDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEKENDS: AlarmDay[] = ['Sat', 'Sun'];

export interface Alarm {
  id: string;
  time: string;
  nickname?: string;
  note: string;
  quote: string;
  enabled: boolean;
  mode: 'recurring' | 'one-time';
  days: AlarmDay[];
  date: string | null;
  category: AlarmCategory;
  icon?: string;
  private: boolean;
  createdAt: string;
  notificationIds: string[];
  soundId?: string;
  /** @deprecated kept for backward compatibility with old alarms */
  notificationId?: string;
  /** @deprecated kept for backward compatibility */
  recurring?: boolean;
}

export type AlarmCategory = 'meds' | 'appointment' | 'task' | 'self-care' | 'general';
