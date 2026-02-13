import AsyncStorage from '@react-native-async-storage/async-storage';

const PINNED_KEY = 'widgetPinnedPresets';
const MAX_PINS = 6;

export async function getPinnedPresets(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
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
    if (current.length >= MAX_PINS) return current;
    current.push(presetId);
  }
  await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(current));
  return current;
}

export function isPinned(presetId: string, pinnedList: string[]): boolean {
  return pinnedList.includes(presetId);
}
