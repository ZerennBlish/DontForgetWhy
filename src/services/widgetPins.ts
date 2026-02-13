import AsyncStorage from '@react-native-async-storage/async-storage';

const PINNED_KEY = 'widgetPinnedPresets';
const ALARM_PINNED_KEY = 'widgetPinnedAlarms';
const MAX_PRESET_PINS = 3;
const MAX_ALARM_PINS = 3;

// --- Timer preset pins ---

export async function getPinnedPresets(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_PRESET_PINS);
    }
    return [];
  } catch {
    return [];
  }
}

export async function togglePinPreset(presetId: string): Promise<string[]> {
  const current = await getPinnedPresets();
  const index = current.indexOf(presetId);
  if (index >= 0) {
    current.splice(index, 1);
  } else {
    if (current.length >= MAX_PRESET_PINS) return current;
    current.push(presetId);
  }
  await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(current));
  return current;
}

export function isPinned(presetId: string, pinnedList: string[]): boolean {
  return pinnedList.includes(presetId);
}

// --- Alarm pins ---

export async function getPinnedAlarms(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARM_PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_ALARM_PINS);
    }
    return [];
  } catch {
    return [];
  }
}

export async function togglePinAlarm(alarmId: string): Promise<string[]> {
  const current = await getPinnedAlarms();
  const index = current.indexOf(alarmId);
  if (index >= 0) {
    current.splice(index, 1);
  } else {
    if (current.length >= MAX_ALARM_PINS) return current;
    current.push(alarmId);
  }
  await AsyncStorage.setItem(ALARM_PINNED_KEY, JSON.stringify(current));
  return current;
}

export function isAlarmPinned(alarmId: string, pinnedList: string[]): boolean {
  return pinnedList.includes(alarmId);
}
