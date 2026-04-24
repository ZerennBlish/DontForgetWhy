import type { AlarmDay } from './alarm';

export interface CompletionEntry {
  completedAt: string;
  scheduledFor?: string;
}

export interface Reminder {
  id: string;
  icon: string;
  text: string;
  nickname?: string;
  private: boolean;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  dueDate: string | null;
  dueTime: string | null;
  notificationId: string | null;
  pinned: boolean;
  deletedAt?: string | null;
  days?: AlarmDay[];
  recurring?: boolean;
  notificationIds?: string[];
  completionHistory?: CompletionEntry[];
  soundId?: string;
}
