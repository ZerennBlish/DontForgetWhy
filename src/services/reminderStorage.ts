import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from '../types/reminder';
import { scheduleReminderNotification, cancelReminderNotification } from './notifications';

const STORAGE_KEY = 'reminders';

// Internal: loads ALL reminders including soft-deleted
async function _loadAllReminders(): Promise<Reminder[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is Reminder =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).text === 'string' &&
        typeof (item as Record<string, unknown>).icon === 'string' &&
        typeof (item as Record<string, unknown>).completed === 'boolean' &&
        typeof (item as Record<string, unknown>).private === 'boolean' &&
        typeof (item as Record<string, unknown>).createdAt === 'string',
    );
  } catch {
    return [];
  }
}

export async function getReminders(includeDeleted = false): Promise<Reminder[]> {
  const all = await _loadAllReminders();
  if (includeDeleted) return all;
  return all.filter((r) => !r.deletedAt);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export async function addReminder(reminder: Reminder): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    reminders.push(reminder);
    await saveReminders(reminders);
  } catch (e) {
    console.error('[addReminder]', e);
  }
}

export async function updateReminder(updated: Reminder): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const index = reminders.findIndex((r) => r.id === updated.id);
    if (index >= 0) {
      reminders[index] = updated;
      await saveReminders(reminders);
    }
  } catch (e) {
    console.error('[updateReminder]', e);
  }
}

export async function deleteReminder(id: string): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const reminder = reminders.find((r) => r.id === id);
    if (reminder?.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, deletedAt: new Date().toISOString(), notificationId: null } : r
    );
    await saveReminders(updated);
  } catch (e) {
    console.error('[deleteReminder]', e);
  }
}

export async function restoreReminder(id: string): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const updated: Reminder[] = [];
    for (const r of reminders) {
      if (r.id !== id) {
        updated.push(r);
        continue;
      }
      const restored: Reminder = { ...r, deletedAt: null };
      if (!restored.completed && restored.dueTime) {
        try {
          const notifId = await scheduleReminderNotification(restored);
          updated.push({ ...restored, notificationId: notifId });
        } catch {
          updated.push(restored);
        }
      } else {
        updated.push(restored);
      }
    }
    await saveReminders(updated);
  } catch (e) {
    console.error('[restoreReminder]', e);
  }
}

export async function permanentlyDeleteReminder(id: string): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const reminder = reminders.find((r) => r.id === id);
    if (reminder?.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }
    const filtered = reminders.filter((r) => r.id !== id);
    await saveReminders(filtered);
  } catch (e) {
    console.error('[permanentlyDeleteReminder]', e);
  }
}

export async function purgeDeletedReminders(): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const kept = reminders.filter((r) => {
      if (!r.deletedAt) return true;
      return new Date(r.deletedAt).getTime() > cutoff;
    });
    if (kept.length < reminders.length) {
      await saveReminders(kept);
    }
  } catch (e) {
    console.error('[purgeDeletedReminders]', e);
  }
}

export async function toggleReminderComplete(id: string): Promise<Reminder | null> {
  try {
    const reminders = await _loadAllReminders();
    const index = reminders.findIndex((r) => r.id === id);
    if (index < 0) return null;
    const reminder = reminders[index];
    const toggled: Reminder = {
      ...reminder,
      completed: !reminder.completed,
      completedAt: !reminder.completed ? new Date().toISOString() : null,
    };
    reminders[index] = toggled;
    await saveReminders(reminders);
    return toggled;
  } catch (e) {
    console.error('[toggleReminderComplete]', e);
    return null;
  }
}
