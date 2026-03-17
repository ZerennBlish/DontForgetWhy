import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TimerPreset, ActiveTimer, UserTimer } from '../types/timer';
import { defaultPresets } from '../data/timerPresets';

const PRESETS_KEY = 'timerPresets';
const ACTIVE_KEY = 'activeTimers';
const RECENT_KEY = 'recentPresets';
const USER_TIMERS_KEY = 'userTimers';

// Async mutex for serializing read-modify-write operations on ACTIVE_KEY
let _mutex: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const prev = _mutex;
  _mutex = next;
  return prev.then(async () => {
    try {
      return await fn();
    } finally {
      release!();
    }
  });
}

async function _writeActiveTimers(timers: ActiveTimer[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(timers));
}

export async function loadPresets(): Promise<TimerPreset[]> {
  const raw = await AsyncStorage.getItem(PRESETS_KEY);
  let customDurations: Record<string, number> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customDurations = parsed;
      }
    } catch {
      // ignore
    }
  }
  return defaultPresets.map((p) => ({
    ...p,
    customSeconds: customDurations[p.id],
  }));
}

export async function saveCustomDuration(
  presetId: string,
  seconds: number
): Promise<void> {
  const raw = await AsyncStorage.getItem(PRESETS_KEY);
  let customDurations: Record<string, number> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customDurations = parsed;
      }
    } catch {
      // ignore
    }
  }
  customDurations[presetId] = seconds;
  await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(customDurations));
}

export async function loadActiveTimers(): Promise<ActiveTimer[]> {
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ActiveTimer =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).label === 'string' &&
        typeof (item as Record<string, unknown>).totalSeconds === 'number' &&
        typeof (item as Record<string, unknown>).remainingSeconds === 'number' &&
        typeof (item as Record<string, unknown>).startedAt === 'string' &&
        typeof (item as Record<string, unknown>).isRunning === 'boolean'
    );
  } catch {
    return [];
  }
}

export function saveActiveTimers(
  timers: ActiveTimer[]
): Promise<void> {
  return withLock(() => _writeActiveTimers(timers));
}

export function addActiveTimer(
  timer: ActiveTimer
): Promise<ActiveTimer[]> {
  return withLock(async () => {
    const timers = await loadActiveTimers();
    timers.push(timer);
    await _writeActiveTimers(timers);
    return timers;
  });
}

export function removeActiveTimer(
  id: string
): Promise<ActiveTimer[]> {
  return withLock(async () => {
    const timers = await loadActiveTimers();
    const filtered = timers.filter((t) => t.id !== id);
    await _writeActiveTimers(filtered);
    return filtered;
  });
}

interface RecentEntry {
  presetId: string;
  timestamp: number;
}

export async function recordPresetUsage(
  presetId: string
): Promise<void> {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  let entries: RecentEntry[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed;
    } catch {
      // ignore
    }
  }
  entries = entries.filter((e) => e.presetId !== presetId);
  entries.unshift({ presetId, timestamp: Date.now() });
  if (entries.length > 20) entries = entries.slice(0, 20);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(entries));
}

export async function loadRecentPresetIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries = parsed as RecentEntry[];
    const validIds = new Set(defaultPresets.map((p) => p.id));
    try {
      const userTimers = await loadUserTimers();
      for (const t of userTimers) validIds.add(t.id);
    } catch {}
    const pruned = entries.filter((e) => validIds.has(e.presetId));
    if (pruned.length !== entries.length) {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(pruned));
    }
    return pruned.map((e) => e.presetId);
  } catch {
    return [];
  }
}

export async function loadUserTimers(): Promise<UserTimer[]> {
  const raw = await AsyncStorage.getItem(USER_TIMERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a: UserTimer, b: UserTimer) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function saveUserTimer(timer: UserTimer): Promise<void> {
  const existing = await loadUserTimers();
  existing.push(timer);
  await AsyncStorage.setItem(USER_TIMERS_KEY, JSON.stringify(existing));
}

export async function deleteUserTimer(id: string): Promise<void> {
  const existing = await loadUserTimers();
  const filtered = existing.filter((t) => t.id !== id);
  await AsyncStorage.setItem(USER_TIMERS_KEY, JSON.stringify(filtered));
}

export async function updateUserTimer(
  id: string,
  updates: Partial<UserTimer>
): Promise<void> {
  const existing = await loadUserTimers();
  const updated = existing.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  );
  await AsyncStorage.setItem(USER_TIMERS_KEY, JSON.stringify(updated));
}
