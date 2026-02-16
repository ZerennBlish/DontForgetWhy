// Module-level variable for passing alarm/timer data from the headless
// onBackgroundEvent handler (index.ts) to the React tree (App.tsx).
//
// onBackgroundEvent runs before the React app mounts. It writes here
// SYNCHRONOUSLY so the data is available when App.tsx reads it during
// its initialization phase — before the navigator renders.

export interface PendingAlarmData {
  alarmId?: string;
  timerId?: string;
  notificationId?: string;
  timerLabel?: string;
  timerIcon?: string;
}

let _pending: PendingAlarmData | null = null;

export function setPendingAlarm(data: PendingAlarmData): void {
  _pending = data;
}

export function getPendingAlarm(): PendingAlarmData | null {
  return _pending;
}

export function clearPendingAlarm(): void {
  _pending = null;
}
