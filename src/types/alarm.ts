export interface Alarm {
  id: string;
  time: string;
  note: string;
  quote: string;
  enabled: boolean;
  recurring: boolean;
  days: number[];
  category: AlarmCategory;
  createdAt: string;
  notificationId?: string;
}

export type AlarmCategory = 'meds' | 'appointment' | 'task' | 'self-care' | 'general';