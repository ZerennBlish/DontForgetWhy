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

// ── Notification dedupe ──────────────────────────────────────────────
// Tracks which notification IDs have already been handled by AlarmFireScreen
// to prevent App.tsx from navigating to AlarmFireScreen a second time for
// the same notification (e.g., DELIVERED fires fullScreenAction over the
// lock screen, then PRESS/getInitialNotification fires when the user
// opens the app moments later).
//
// Uses a module-level Map (not AsyncStorage) so it's synchronous and
// survives within a single app process. The 30-second TTL covers the
// gap between full-screen display and the user opening the app.

const _handledNotifs = new Map<string, number>();
const HANDLED_TTL = 30_000; // 30 seconds

export function markNotifHandled(notifId: string): void {
  _handledNotifs.set(notifId, Date.now());
  // Clean up old entries
  const now = Date.now();
  for (const [id, ts] of _handledNotifs) {
    if (now - ts > HANDLED_TTL) _handledNotifs.delete(id);
  }
}

export function wasNotifHandled(notifId: string | undefined): boolean {
  if (!notifId) return false;
  const ts = _handledNotifs.get(notifId);
  if (!ts) return false;
  if (Date.now() - ts > HANDLED_TTL) {
    _handledNotifs.delete(notifId);
    return false;
  }
  return true;
}
