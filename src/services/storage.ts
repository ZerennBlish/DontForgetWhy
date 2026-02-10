import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '../types/alarm';
import { scheduleAlarm, cancelAlarm as cancelNotification } from './notifications';

const STORAGE_KEY = 'alarms';

export async function loadAlarms(): Promise<Alarm[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export async function addAlarm(alarm: Alarm): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  alarms.push(alarm);
  await saveAlarms(alarms);
  return alarms;
}

export async function deleteAlarm(id: string): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (alarm?.notificationId) {
    await cancelNotification(alarm.notificationId);
  }
  const filtered = alarms.filter(a => a.id !== id);
  await saveAlarms(filtered);
  return filtered;
}

export async function toggleAlarm(id: string): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  const updated: Alarm[] = [];
  for (const a of alarms) {
    if (a.id !== id) {
      updated.push(a);
      continue;
    }
    const toggled = { ...a, enabled: !a.enabled };
    if (toggled.enabled) {
      const notificationId = await scheduleAlarm(toggled);
      toggled.notificationId = notificationId;
    } else if (a.notificationId) {
      await cancelNotification(a.notificationId);
      toggled.notificationId = undefined;
    }
    updated.push(toggled);
  }
  await saveAlarms(updated);
  return updated;
}
