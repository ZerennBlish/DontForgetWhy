import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Alarm, AlarmDay, ALL_DAYS } from '../types/alarm';
import { scheduleAlarm, cancelAlarmNotifications } from './notifications';

const STORAGE_KEY = 'alarms';

const NUM_TO_DAY: Record<number, AlarmDay> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

function migrateAlarm(item: Record<string, unknown>): Alarm {
  const raw = item as unknown as Alarm & { recurring?: boolean; notificationId?: string };

  // Migrate old notificationId (string) to notificationIds (string[])
  let notificationIds: string[] = raw.notificationIds || [];
  if (notificationIds.length === 0 && raw.notificationId) {
    notificationIds = [raw.notificationId];
  }

  // Migrate mode: check legacy `recurring` field
  let mode: 'recurring' | 'one-time' = raw.mode || 'recurring';
  if (!raw.mode && raw.recurring === false) {
    mode = 'one-time';
  }

  // Migrate days: convert numeric arrays to string arrays
  let days: AlarmDay[];
  if (!Array.isArray(raw.days)) {
    days = [...ALL_DAYS];
  } else if (typeof raw.days[0] === 'number') {
    days = (raw.days as unknown as number[])
      .map((n) => NUM_TO_DAY[n])
      .filter((d): d is AlarmDay => d !== undefined);
    if (days.length === 0) days = [...ALL_DAYS];
  } else {
    days = raw.days as AlarmDay[];
  }

  const date = raw.date ?? null;

  // Default soundId for alarms without one
  const soundId = typeof raw.soundId === 'string' ? raw.soundId : 'default';

  return { ...raw, mode, days, date, notificationIds, soundId } as Alarm;
}

// Internal: loads ALL alarms from storage including soft-deleted
async function _loadAllAlarms(): Promise<Alarm[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed
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
      );

    const migrated = filtered.map(migrateAlarm);

    // Save back migrated data so migration only runs once
    const needsMigration = filtered.some(
      (item) =>
        item.recurring !== undefined ||
        item.notificationId !== undefined ||
        (Array.isArray(item.days) && item.days.length > 0 && typeof item.days[0] === 'number') ||
        item.mode === undefined ||
        item.soundId === undefined,
    );
    if (needsMigration) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return [];
  }
}

export async function loadAlarms(includeDeleted = false): Promise<Alarm[]> {
  const all = await _loadAllAlarms();
  if (includeDeleted) return all;
  return all.filter((a) => !a.deletedAt);
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export async function addAlarm(alarm: Alarm): Promise<Alarm[]> {
  const alarms = await _loadAllAlarms();
  alarms.push(alarm);
  await saveAlarms(alarms);
  return alarms;
}

export async function updateAlarm(updatedAlarm: Alarm): Promise<Alarm[]> {
  const alarms = await _loadAllAlarms();
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
  const alarms = await _loadAllAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (alarm?.notificationIds?.length) {
    await cancelAlarmNotifications(alarm.notificationIds);
  }
  const updated = alarms.map(a =>
    a.id === id ? { ...a, deletedAt: new Date().toISOString(), notificationIds: [] } : a
  );
  await saveAlarms(updated);
  return updated;
}

export async function restoreAlarm(id: string): Promise<Alarm[]> {
  const alarms = await _loadAllAlarms();
  const updated: Alarm[] = [];
  for (const a of alarms) {
    if (a.id !== id) {
      updated.push(a);
      continue;
    }
    const restored: Alarm = { ...a, deletedAt: null };
    if (restored.enabled) {
      try {
        const notificationIds = await scheduleAlarm(restored);
        updated.push({ ...restored, notificationIds });
      } catch {
        updated.push({ ...restored, enabled: false, notificationIds: [] });
      }
    } else {
      updated.push(restored);
    }
  }
  await saveAlarms(updated);
  return updated;
}

export async function permanentlyDeleteAlarm(id: string): Promise<Alarm[]> {
  const alarms = await _loadAllAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (alarm?.notificationIds?.length) {
    await cancelAlarmNotifications(alarm.notificationIds);
  }
  const filtered = alarms.filter(a => a.id !== id);
  await saveAlarms(filtered);
  return filtered;
}

export async function purgeDeletedAlarms(): Promise<void> {
  const alarms = await _loadAllAlarms();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const kept = alarms.filter((a) => {
    if (!a.deletedAt) return true;
    return new Date(a.deletedAt).getTime() > cutoff;
  });
  if (kept.length < alarms.length) {
    await saveAlarms(kept);
  }
}

/**
 * Atomically update a single alarm by ID without affecting other alarms.
 * Loads ALL alarms (including soft-deleted), applies the update function
 * to the matching alarm, and saves the full array back.
 *
 * Use this instead of loadAlarms() + saveAlarms() to avoid wiping
 * soft-deleted alarms from storage.
 */
export async function updateSingleAlarm(
  alarmId: string,
  updateFn: (alarm: Alarm) => Alarm,
): Promise<void> {
  const alarms = await _loadAllAlarms();
  const idx = alarms.findIndex((a) => a.id === alarmId);
  if (idx === -1) return;
  alarms[idx] = updateFn(alarms[idx]);
  await saveAlarms(alarms);
}

export async function toggleAlarm(id: string): Promise<Alarm[]> {
  const alarms = await _loadAllAlarms();
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
  const alarms = await _loadAllAlarms();
  const alarm = alarms.find((a) => a.id === id);
  if (alarm?.notificationIds?.length) {
    try {
      await cancelAlarmNotifications(alarm.notificationIds);
    } catch (e) {
      console.error('[disableAlarm] cancelAlarmNotifications failed:', e);
    }
  }
  const updated = alarms.map((a) =>
    a.id === id ? { ...a, enabled: false, notificationIds: [] } : a,
  );
  await saveAlarms(updated);
}
