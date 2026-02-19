import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from '../types/reminder';
import { scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications } from './notifications';

const STORAGE_KEY = 'reminders';

const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function _toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function hasCompletedToday(reminder: Reminder): boolean {
  const history = reminder.completionHistory;
  if (!history || history.length === 0) return false;
  const todayKey = _toDateKey(new Date());
  return history.some((entry) => _toDateKey(new Date(entry.completedAt)) === todayKey);
}

// Internal: loads ALL reminders including soft-deleted
async function _loadAllReminders(): Promise<Reminder[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter(
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

    // Migrate completionHistory
    let needsMigration = false;
    const migrated = filtered.map((r) => {
      if (r.completedAt && (!r.completionHistory || r.completionHistory.length === 0)) {
        needsMigration = true;
        return { ...r, completionHistory: [{ completedAt: r.completedAt }] };
      }
      if (!r.completionHistory) {
        needsMigration = true;
        return { ...r, completionHistory: [] };
      }
      return r;
    });

    if (needsMigration) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }

    return migrated;
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
    if (reminder) {
      if (reminder.notificationIds?.length) {
        await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
      } else if (reminder.notificationId) {
        await cancelReminderNotification(reminder.notificationId).catch(() => {});
      }
    }
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, deletedAt: new Date().toISOString(), notificationId: null, notificationIds: [] } : r
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
          const notifIds = await scheduleReminderNotification(restored);
          updated.push({ ...restored, notificationId: notifIds[0] || null, notificationIds: notifIds });
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
    if (reminder) {
      if (reminder.notificationIds?.length) {
        await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
      } else if (reminder.notificationId) {
        await cancelReminderNotification(reminder.notificationId).catch(() => {});
      }
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
    const nowIso = new Date().toISOString();
    const wasCompleted = reminder.completed;
    const history = [...(reminder.completionHistory || [])];

    if (!wasCompleted) {
      // Marking complete: push to history
      history.push({ completedAt: nowIso });
    } else {
      // Unmarking: pop the last entry
      history.pop();
    }

    const toggled: Reminder = {
      ...reminder,
      completed: !reminder.completed,
      completedAt: !reminder.completed ? nowIso : null,
      notificationId: !reminder.completed ? null : reminder.notificationId,
      notificationIds: !reminder.completed ? [] : reminder.notificationIds,
      completionHistory: history,
    };
    reminders[index] = toggled;
    await saveReminders(reminders);
    return toggled;
  } catch (e) {
    console.error('[toggleReminderComplete]', e);
    return null;
  }
}

function _getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get the timestamp of the current cycle for a recurring reminder.
 * Used for the 6-hour early completion window check.
 *
 * - Daily: today at dueTime (no auto-advancing past current time)
 * - Weekly: most recent matching day at dueTime (looking backward, including today)
 * - Yearly: dueDate at dueTime
 *
 * Returns null if no dueTime is set.
 */
export function getCurrentCycleTimestamp(reminder: Reminder): number | null {
  if (!reminder.dueTime) return null;
  const [h, m] = reminder.dueTime.split(':').map(Number);
  const days = reminder.days || [];

  // Yearly: dueDate set, no specific days
  if (reminder.dueDate && days.length === 0) {
    const [y, mo, d] = reminder.dueDate.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0).getTime();
  }

  // Weekly: specific days (1-6 days selected)
  if (days.length > 0 && days.length < 7) {
    const now = new Date();
    const todayDow = now.getDay(); // 0=Sun
    let bestTs = -Infinity;

    for (const day of days) {
      const target = DAY_INDEX[day];
      if (target === undefined) continue;
      const daysAgo = (todayDow - target + 7) % 7;
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(h, m, 0, 0);
      if (d.getTime() > bestTs) bestTs = d.getTime();
    }

    return bestTs > -Infinity ? bestTs : null;
  }

  // Daily (no days, all 7 days, or fallback): today at dueTime
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * Clear all completion history for a recurring reminder without
 * deleting or deactivating it. Used when "deleting" a recurring
 * reminder from the Completed filter — removes it from that view
 * while keeping the reminder active.
 */
export async function clearCompletionHistory(id: string): Promise<void> {
  try {
    const reminders = await _loadAllReminders();
    const index = reminders.findIndex((r) => r.id === id);
    if (index < 0) return;
    reminders[index] = { ...reminders[index], completionHistory: [] };
    await saveReminders(reminders);
  } catch (e) {
    console.error('[clearCompletionHistory]', e);
  }
}

/**
 * Recurring reminder "complete": cancel current notifications, compute
 * the next occurrence based on the recurring pattern, reschedule, and
 * keep the reminder active (never set completed = true).
 *
 * One completion per calendar day maximum — if already completed today,
 * returns the reminder unchanged without rescheduling.
 *
 * Uses skipCurrentCycle when rescheduling so that early completions
 * (before the notification fires) schedule for the NEXT occurrence
 * instead of re-scheduling the same one.
 */
export async function completeRecurringReminder(id: string): Promise<Reminder | null> {
  try {
    const reminders = await _loadAllReminders();
    const index = reminders.findIndex((r) => r.id === id);
    if (index < 0) return null;
    const reminder = reminders[index];

    // One completion per calendar day
    if (hasCompletedToday(reminder)) {
      return reminder;
    }

    // Cancel existing notifications
    if (reminder.notificationIds?.length) {
      await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
    } else if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId).catch(() => {});
    }

    // Record completion in history
    const cycleTs = getCurrentCycleTimestamp(reminder);
    const history = [...(reminder.completionHistory || [])];
    history.push({
      completedAt: new Date().toISOString(),
      scheduledFor: cycleTs ? new Date(cycleTs).toISOString() : undefined,
    });

    const days = reminder.days || [];
    let nextDueDate = reminder.dueDate;

    // Yearly recurring (date set, no specific days): bump to next future occurrence
    if (reminder.dueDate && days.length === 0) {
      const [, mo, d] = reminder.dueDate.split('-').map(Number);
      const now = new Date();
      let nextDate = new Date(now.getFullYear(), mo - 1, d);
      if (nextDate.getTime() <= now.getTime()) {
        nextDate = new Date(now.getFullYear() + 1, mo - 1, d);
      }
      // Handle invalid date (e.g., Feb 29 on non-leap year rolls to Mar)
      if (nextDate.getMonth() !== mo - 1) {
        nextDate.setDate(0); // last day of the intended month
      }
      nextDueDate = _getDateStr(nextDate);
    }

    // Daily and weekly: dueDate stays null — scheduleReminderNotification
    // uses getNextAlarmTimestamp / getNextDayTimestamp to find the next
    // occurrence automatically, so no dueDate change needed.

    const updated: Reminder = {
      ...reminder,
      dueDate: nextDueDate,
      notificationId: null,
      notificationIds: [],
      completionHistory: history,
    };

    // Reschedule for next occurrence, skipping the current cycle so
    // early completions don't re-trigger the same notification
    if (updated.dueTime) {
      const notifIds = await scheduleReminderNotification(updated, { skipCurrentCycle: true }).catch(() => [] as string[]);
      updated.notificationId = notifIds[0] || null;
      updated.notificationIds = notifIds;
    }

    reminders[index] = updated;
    await saveReminders(reminders);
    return updated;
  } catch (e) {
    console.error('[completeRecurringReminder]', e);
    return null;
  }
}
