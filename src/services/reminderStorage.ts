import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from '../types/reminder';

const STORAGE_KEY = 'reminders';

export async function getReminders(): Promise<Reminder[]> {
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

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export async function addReminder(reminder: Reminder): Promise<void> {
  try {
    const reminders = await getReminders();
    reminders.push(reminder);
    await saveReminders(reminders);
  } catch (e) {
    console.error('[addReminder]', e);
  }
}

export async function updateReminder(updated: Reminder): Promise<void> {
  try {
    const reminders = await getReminders();
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
    const reminders = await getReminders();
    const filtered = reminders.filter((r) => r.id !== id);
    await saveReminders(filtered);
  } catch (e) {
    console.error('[deleteReminder]', e);
  }
}

export async function toggleReminderComplete(id: string): Promise<Reminder | null> {
  try {
    const reminders = await getReminders();
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
