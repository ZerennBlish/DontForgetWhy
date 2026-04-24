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
  timerSoundId?: string;
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
const HANDLED_TTL = 600_000; // 10 minutes

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

// ── Persistent notification dedupe ──────────────────────────────────
// The in-memory Map above does not survive process death. When the app
// is killed and restarted, getInitialNotification() can return the same
// notification again. These helpers persist handled IDs in AsyncStorage
// so cold-start dedupe works across process restarts.

import { kvGet, kvSet } from './database';
import { safeParseArray } from '../utils/safeParse';

const HANDLED_NOTIFS_KEY = 'handledNotifIds';

interface PersistedNotifEntry {
  id: string;
  ts: number;
}

export async function persistNotifHandled(notifId: string): Promise<void> {
  markNotifHandled(notifId); // keep in-memory Map in sync
  try {
    const raw = kvGet(HANDLED_NOTIFS_KEY);
    let entries: PersistedNotifEntry[] = safeParseArray<PersistedNotifEntry>(raw);
    const now = Date.now();
    // Remove any existing entry for this ID, then add fresh
    entries = entries.filter((e) => e.id !== notifId);
    entries.push({ id: notifId, ts: now });
    const filtered = entries.filter((e) => now - e.ts <= HANDLED_TTL);
    kvSet(HANDLED_NOTIFS_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function wasNotifHandledPersistent(notifId: string | undefined): Promise<boolean> {
  if (!notifId) return false;
  // Fast path: check in-memory Map first
  if (wasNotifHandled(notifId)) return true;
  // Slow path: check AsyncStorage
  try {
    const raw = kvGet(HANDLED_NOTIFS_KEY);
    if (!raw) return false;
    const entries: PersistedNotifEntry[] = safeParseArray<PersistedNotifEntry>(raw);
    const now = Date.now();
    const entry = entries.find((e) => e.id === notifId);
    if (entry && now - entry.ts <= HANDLED_TTL) {
      // Restore to in-memory Map for future fast-path checks
      markNotifHandled(notifId);
      return true;
    }
    // Clean up expired entries if we found one
    if (entry) {
      const filtered = entries.filter((e) => now - e.ts <= HANDLED_TTL);
      kvSet(HANDLED_NOTIFS_KEY, JSON.stringify(filtered));
    }
  } catch {}
  return false;
}
