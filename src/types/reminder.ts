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
}
