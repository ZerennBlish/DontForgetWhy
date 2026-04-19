import { getDb, kvGet, kvSet } from './database';
import type { TimerPreset, ActiveTimer, UserTimer } from '../types/timer';
import { defaultPresets } from '../data/timerPresets';
import { withLock } from '../utils/asyncMutex';
import { safeParse, safeParseArray } from '../utils/safeParse';

function parsePresetOverrides(json: string | null): Record<string, number> {
  const parsed = safeParse(json, {});
  if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof val === 'number' && val > 0) {
      result[key] = val;
    }
  }
  return result;
}

const PRESETS_KEY = 'timerPresets';
const RECENT_KEY = 'recentPresets';

// ---------------------------------------------------------------------------
// Timer Presets (custom durations) → kv_store
// ---------------------------------------------------------------------------

export async function loadPresets(): Promise<TimerPreset[]> {
  const raw = kvGet(PRESETS_KEY);
  const customDurations = parsePresetOverrides(raw);
  return defaultPresets.map((p) => ({
    ...p,
    customSeconds: customDurations[p.id],
  }));
}

export async function saveCustomDuration(
  presetId: string,
  seconds: number,
): Promise<void> {
  return withLock('timer-presets', async () => {
    const raw = kvGet(PRESETS_KEY);
    const customDurations = parsePresetOverrides(raw);
    customDurations[presetId] = seconds;
    kvSet(PRESETS_KEY, JSON.stringify(customDurations));
  });
}

// ---------------------------------------------------------------------------
// Active Timers → active_timers table
// ---------------------------------------------------------------------------

interface ActiveTimerRow {
  id: string;
  presetId: string;
  label: string;
  icon: string;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: string;
  isRunning: number;
  notificationId: string | null;
  soundId: string | null;
}

function rowToActiveTimer(row: ActiveTimerRow): ActiveTimer {
  return {
    id: row.id,
    presetId: row.presetId,
    label: row.label,
    icon: row.icon,
    totalSeconds: row.totalSeconds,
    remainingSeconds: row.remainingSeconds,
    startedAt: row.startedAt,
    isRunning: !!row.isRunning,
    notificationId: row.notificationId ?? undefined,
    soundId: row.soundId ?? undefined,
  };
}

export async function loadActiveTimers(): Promise<ActiveTimer[]> {
  const db = getDb();
  return db.getAllSync<ActiveTimerRow>('SELECT * FROM active_timers').map(rowToActiveTimer);
}

export async function saveActiveTimers(timers: ActiveTimer[]): Promise<void> {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM active_timers');
    for (const t of timers) {
      db.runSync(
        `INSERT INTO active_timers (id, presetId, label, icon, totalSeconds, remainingSeconds, startedAt, isRunning, notificationId, soundId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.presetId, t.label, t.icon, t.totalSeconds, t.remainingSeconds,
         t.startedAt, t.isRunning ? 1 : 0, t.notificationId ?? null, t.soundId ?? null],
      );
    }
  });
}

export async function addActiveTimer(timer: ActiveTimer): Promise<ActiveTimer[]> {
  const db = getDb();
  db.runSync(
    `INSERT INTO active_timers (id, presetId, label, icon, totalSeconds, remainingSeconds, startedAt, isRunning, notificationId, soundId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [timer.id, timer.presetId, timer.label, timer.icon, timer.totalSeconds, timer.remainingSeconds,
     timer.startedAt, timer.isRunning ? 1 : 0, timer.notificationId ?? null, timer.soundId ?? null],
  );
  return loadActiveTimers();
}

async function removeActiveTimer(id: string): Promise<ActiveTimer[]> {
  const db = getDb();
  db.runSync('DELETE FROM active_timers WHERE id=?', [id]);
  return loadActiveTimers();
}

// ---------------------------------------------------------------------------
// Recent Presets → kv_store
// ---------------------------------------------------------------------------

interface RecentEntry {
  presetId: string;
  timestamp: number;
}

export async function recordPresetUsage(presetId: string): Promise<void> {
  return withLock('timer-presets', async () => {
    const raw = kvGet(RECENT_KEY);
    let entries: RecentEntry[] = safeParseArray<RecentEntry>(raw);
    entries = entries.filter((e) => e.presetId !== presetId);
    entries.unshift({ presetId, timestamp: Date.now() });
    if (entries.length > 20) entries = entries.slice(0, 20);
    kvSet(RECENT_KEY, JSON.stringify(entries));
  });
}

export async function loadRecentPresetIds(): Promise<string[]> {
  const raw = kvGet(RECENT_KEY);
  if (!raw) return [];
  try {
    const entries = safeParseArray<RecentEntry>(raw);
    if (entries.length === 0) return [];
    const validIds = new Set(defaultPresets.map((p) => p.id));
    try {
      const userTimers = await loadUserTimers();
      for (const t of userTimers) validIds.add(t.id);
    } catch {}
    const pruned = entries.filter((e) => validIds.has(e.presetId));
    if (pruned.length !== entries.length) {
      kvSet(RECENT_KEY, JSON.stringify(pruned));
    }
    return pruned.map((e) => e.presetId);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// User Timers → user_timers table
// ---------------------------------------------------------------------------

interface UserTimerRow {
  id: string;
  icon: string;
  label: string;
  seconds: number;
  soundId: string | null;
  createdAt: string;
}

function rowToUserTimer(row: UserTimerRow): UserTimer {
  return {
    id: row.id,
    icon: row.icon,
    label: row.label,
    seconds: row.seconds,
    soundId: row.soundId ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function loadUserTimers(): Promise<UserTimer[]> {
  const db = getDb();
  return db.getAllSync<UserTimerRow>('SELECT * FROM user_timers ORDER BY createdAt DESC')
    .map(rowToUserTimer);
}

export async function saveUserTimer(timer: UserTimer): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT INTO user_timers (id, icon, label, seconds, soundId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [timer.id, timer.icon, timer.label, timer.seconds, timer.soundId ?? null, timer.createdAt],
  );
}

