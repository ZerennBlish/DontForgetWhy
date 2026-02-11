import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'forgetLog';

export interface ForgetEntry {
  id: string;
  alarmNote: string;
  alarmNickname?: string;
  alarmIcon?: string;
  alarmCategory: string;
  result: 'loss' | 'skip';
  timestamp: string;
}

export async function loadForgetLog(): Promise<ForgetEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ForgetEntry =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).timestamp === 'string'
    );
  } catch {
    return [];
  }
}

export async function addForgetEntry(
  entry: Omit<ForgetEntry, 'id' | 'timestamp'>
): Promise<void> {
  const log = await loadForgetLog();
  const full: ForgetEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  log.unshift(full);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export async function clearForgetLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
