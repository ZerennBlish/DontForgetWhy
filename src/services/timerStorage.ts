import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TimerPreset, ActiveTimer } from '../types/timer';
import { defaultPresets } from '../data/timerPresets';

const PRESETS_KEY = 'timerPresets';
const ACTIVE_KEY = 'activeTimers';
const RECENT_KEY = 'recentPresets';

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

export async function saveActiveTimers(
  timers: ActiveTimer[]
): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(timers));
}

export async function addActiveTimer(
  timer: ActiveTimer
): Promise<ActiveTimer[]> {
  const timers = await loadActiveTimers();
  timers.push(timer);
  await saveActiveTimers(timers);
  return timers;
}

export async function removeActiveTimer(
  id: string
): Promise<ActiveTimer[]> {
  const timers = await loadActiveTimers();
  const filtered = timers.filter((t) => t.id !== id);
  await saveActiveTimers(filtered);
  return filtered;
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
    return parsed.map((e: RecentEntry) => e.presetId);
  } catch {
    return [];
  }
}
