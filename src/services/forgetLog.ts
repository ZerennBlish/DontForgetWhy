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
    return Array.isArray(parsed) ? parsed : [];
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
