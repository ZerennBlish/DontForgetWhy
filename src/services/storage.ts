import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Alarm, ALL_DAYS } from '../types/alarm';
import { scheduleAlarm, cancelAlarmNotifications } from './notifications';

const STORAGE_KEY = 'alarms';

function migrateAlarm(item: Record<string, unknown>): Alarm {
  const raw = item as unknown as Alarm & { recurring?: boolean; notificationId?: string };
  // Migrate old notificationId (string) to notificationIds (string[])
  let notificationIds: string[] = raw.notificationIds || [];
  if (notificationIds.length === 0 && raw.notificationId) {
    notificationIds = [raw.notificationId];
  }
  // Migrate old recurring boolean + number[] days to new format
  const mode: 'recurring' | 'one-time' = raw.mode || 'recurring';
  let days = raw.days;
  if (!Array.isArray(days) || days.length === 0 || typeof days[0] === 'number') {
    days = [...ALL_DAYS];
  }
  const date = raw.date ?? null;

  return { ...raw, mode, days, date, notificationIds } as Alarm;
}

export async function loadAlarms(): Promise<Alarm[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          item !== null &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).id === 'string' &&
          typeof (item as Record<string, unknown>).time === 'string' &&
          typeof (item as Record<string, unknown>).note === 'string' &&
          typeof (item as Record<string, unknown>).enabled === 'boolean' &&
          typeof (item as Record<string, unknown>).category === 'string' &&
          typeof (item as Record<string, unknown>).private === 'boolean' &&
          typeof (item as Record<string, unknown>).createdAt === 'string'
      )
      .map(migrateAlarm);
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
    // Cancel all existing notifications
    if (a.notificationIds?.length) {
      await cancelAlarmNotifications(a.notificationIds);
    }
    if (updatedAlarm.enabled) {
      try {
        const notificationIds = await scheduleAlarm(updatedAlarm);
        updated.push({ ...updatedAlarm, notificationIds });
      } catch (error) {
        console.error('[updateAlarm] scheduleAlarm failed:', error);
        updated.push({ ...updatedAlarm, enabled: false, notificationIds: [] });
        Alert.alert('Scheduling Failed', "Alarm saved but couldn't schedule notifications. Check notification permissions.");
      }
    } else {
      updated.push({ ...updatedAlarm, notificationIds: [] });
    }
  }
  await saveAlarms(updated);
  return updated;
}

export async function deleteAlarm(id: string): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (alarm?.notificationIds?.length) {
    await cancelAlarmNotifications(alarm.notificationIds);
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
        const notificationIds = await scheduleAlarm(toggled);
        toggled.notificationIds = notificationIds;
      } catch (error) {
        console.error('[toggleAlarm] scheduleAlarm failed:', error);
        toggled.enabled = false;
        toggled.notificationIds = [];
        Alert.alert('Scheduling Failed', "Couldn't schedule notifications. Check notification permissions.");
      }
    } else if (a.notificationIds?.length) {
      await cancelAlarmNotifications(a.notificationIds);
      toggled.notificationIds = [];
    }
    updated.push(toggled);
  }
  await saveAlarms(updated);
  return updated;
}

export async function disableAlarm(id: string): Promise<void> {
  const alarms = await loadAlarms();
  const updated = alarms.map((a) =>
    a.id === id ? { ...a, enabled: false, notificationIds: [] } : a,
  );
  await saveAlarms(updated);
}
