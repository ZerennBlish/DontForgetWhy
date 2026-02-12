export interface TimerPreset {
  id: string;
  icon: string;
  label: string;
  seconds: number;
  customSeconds?: number;
}

export interface ActiveTimer {
  id: string;
  presetId: string;
  label: string;
  icon: string;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: string;
  isRunning: boolean;
  notificationId?: string;
}
