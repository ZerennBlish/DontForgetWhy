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
    return parsed.filter(
      (item: unknown): item is Alarm =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).time === 'string' &&
        typeof (item as Record<string, unknown>).note === 'string' &&
        typeof (item as Record<string, unknown>).enabled === 'boolean' &&
        typeof (item as Record<string, unknown>).category === 'string'
    );
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

export async function updateAlarm(updatedAlarm: Alarm): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  const updated: Alarm[] = [];
  for (const a of alarms) {
    if (a.id !== updatedAlarm.id) {
      updated.push(a);
      continue;
    }
    if (a.notificationId) {
      await cancelNotification(a.notificationId);
    }
    if (updatedAlarm.enabled) {
      try {
        const notificationId = await scheduleAlarm(updatedAlarm);
        updated.push({ ...updatedAlarm, notificationId });
      } catch (error) {
        console.error('[updateAlarm] scheduleAlarm failed:', error);
        updated.push({ ...updatedAlarm, notificationId: undefined });
      }
    } else {
      updated.push({ ...updatedAlarm, notificationId: undefined });
    }
  }
  await saveAlarms(updated);
  return updated;
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
      try {
        const notificationId = await scheduleAlarm(toggled);
        toggled.notificationId = notificationId;
      } catch (error) {
        console.error('[toggleAlarm] scheduleAlarm failed:', error);
        toggled.notificationId = undefined;
      }
    } else if (a.notificationId) {
      await cancelNotification(a.notificationId);
      toggled.notificationId = undefined;
    }
    updated.push(toggled);
  }
  await saveAlarms(updated);
  return updated;
}
