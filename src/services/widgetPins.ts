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

export async function unpinAlarm(alarmId: string): Promise<void> {
  const current = await getPinnedAlarms();
  const filtered = current.filter((id) => id !== alarmId);
  if (filtered.length !== current.length) {
    await AsyncStorage.setItem(ALARM_PINNED_KEY, JSON.stringify(filtered));
  }
}

export async function pruneAlarmPins(validIds: string[]): Promise<string[]> {
  const current = await getPinnedAlarms();
  const validSet = new Set(validIds);
  const pruned = current.filter((id) => validSet.has(id));
  if (pruned.length !== current.length) {
    await AsyncStorage.setItem(ALARM_PINNED_KEY, JSON.stringify(pruned));
  }
  return pruned;
}

// --- Reminder pins ---

const REMINDER_PINNED_KEY = 'widgetPinnedReminders';
const MAX_REMINDER_PINS = 3;

export async function getPinnedReminders(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_REMINDER_PINS);
    }
    return [];
  } catch {
    return [];
  }
}

export async function togglePinReminder(reminderId: string): Promise<boolean> {
  const current = await getPinnedReminders();
  const index = current.indexOf(reminderId);
  if (index >= 0) {
    current.splice(index, 1);
    await AsyncStorage.setItem(REMINDER_PINNED_KEY, JSON.stringify(current));
    return false;
  }
  if (current.length >= MAX_REMINDER_PINS) return true;
  current.push(reminderId);
  await AsyncStorage.setItem(REMINDER_PINNED_KEY, JSON.stringify(current));
  return true;
}

export function isReminderPinned(reminderId: string, pinnedList: string[]): boolean {
  return pinnedList.includes(reminderId);
}

export async function unpinReminder(reminderId: string): Promise<void> {
  const current = await getPinnedReminders();
  const filtered = current.filter((id) => id !== reminderId);
  if (filtered.length !== current.length) {
    await AsyncStorage.setItem(REMINDER_PINNED_KEY, JSON.stringify(filtered));
  }
}

export async function pruneReminderPins(validIds: string[]): Promise<string[]> {
  const current = await getPinnedReminders();
  const validSet = new Set(validIds);
  const pruned = current.filter((id) => validSet.has(id));
  if (pruned.length !== current.length) {
    await AsyncStorage.setItem(REMINDER_PINNED_KEY, JSON.stringify(pruned));
  }
  return pruned;
}
