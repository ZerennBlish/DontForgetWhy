import { getDb } from './database';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Reminder } from '../types/reminder';
import type { AlarmDay } from '../types/alarm';
import { safeParseArray } from '../utils/safeParse';
import { withLock } from '../utils/asyncMutex';
import { scheduleReminderNotification, cancelReminderNotification, cancelReminderNotifications } from './notifications';

const VALID_DAYS: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseReminderDays(json: string | null): AlarmDay[] | undefined {
  if (!json) return undefined;
  const arr = safeParseArray<string>(json);
  if (arr.length === 0) return undefined;
  return arr.filter((d): d is AlarmDay => VALID_DAYS.includes(d));
}

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

// ---------------------------------------------------------------------------
// Row type & conversion
// ---------------------------------------------------------------------------

interface ReminderRow {
  id: string;
  text: string;
  icon: string;
  nickname: string | null;
  completed: number;
  completedAt: string | null;
  private: number;
  recurring: number;
  dueDate: string | null;
  dueTime: string | null;
  days: string | null;
  soundId: string | null;
  pinned: number;
  notificationId: string | null;
  notificationIds: string | null;
  completionHistory: string | null;
  createdAt: string;
  deletedAt: string | null;
}

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    text: row.text,
    icon: row.icon,
    nickname: row.nickname ?? undefined,
    completed: !!row.completed,
    completedAt: row.completedAt,
    private: !!row.private,
    recurring: !!row.recurring || undefined,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    days: parseReminderDays(row.days),
    soundId: row.soundId ?? undefined,
    pinned: !!row.pinned,
    notificationId: row.notificationId,
    notificationIds: row.notificationIds ? safeParseArray<string>(row.notificationIds) : undefined,
    completionHistory: row.completionHistory ? safeParseArray(row.completionHistory) : undefined,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
  };
}

function reminderToParams(r: Reminder): SQLiteBindValue[] {
  return [
    r.id, r.text, r.icon, r.nickname ?? null,
    r.completed ? 1 : 0, r.completedAt ?? null,
    r.private ? 1 : 0, r.recurring ? 1 : 0,
    r.dueDate ?? null, r.dueTime ?? null,
    r.days ? JSON.stringify(r.days) : null,
    r.soundId ?? null, r.pinned ? 1 : 0,
    r.notificationId ?? null,
    r.notificationIds ? JSON.stringify(r.notificationIds) : null,
    r.completionHistory ? JSON.stringify(r.completionHistory) : null,
    r.createdAt, r.deletedAt ?? null,
  ];
}

const REMINDER_INSERT = `INSERT OR REPLACE INTO reminders
  (id, text, icon, nickname, completed, completedAt, "private", recurring,
   dueDate, dueTime, days, soundId, pinned, notificationId, notificationIds,
   completionHistory, createdAt, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getReminders(includeDeleted = false): Promise<Reminder[]> {
  const db = getDb();
  const sql = includeDeleted
    ? 'SELECT * FROM reminders'
    : 'SELECT * FROM reminders WHERE deletedAt IS NULL';
  return db.getAllSync<ReminderRow>(sql).map(rowToReminder);
}

export function getReminderById(id: string): Reminder | null {
  const db = getDb();
  const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id = ?', [id]);
  return row ? rowToReminder(row) : null;
}

/** Compatibility shim — replaces all reminders in the table. */
async function saveReminders(reminders: Reminder[]): Promise<void> {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM reminders');
    for (const r of reminders) {
      db.runSync(REMINDER_INSERT, reminderToParams(r));
    }
  });
}

export async function addReminder(reminder: Reminder): Promise<void> {
  return withLock(`reminder-${reminder.id}`, async () => {
    try {
      const db = getDb();
      db.runSync(REMINDER_INSERT, reminderToParams(reminder));
    } catch (e) {
      console.error('[addReminder]', e);
    }
  });
}

export async function updateReminder(updated: Reminder): Promise<void> {
  return withLock(`reminder-${updated.id}`, async () => {
    try {
      const db = getDb();
      db.runSync(REMINDER_INSERT, reminderToParams(updated));
    } catch (e) {
      console.error('[updateReminder]', e);
    }
  });
}

export async function deleteReminder(id: string): Promise<void> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (row) {
        const reminder = rowToReminder(row);
        if (reminder.notificationIds?.length) {
          await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
        } else if (reminder.notificationId) {
          await cancelReminderNotification(reminder.notificationId).catch(() => {});
        }
      }
      db.runSync(
        'UPDATE reminders SET deletedAt=?, notificationId=NULL, notificationIds=NULL WHERE id=?',
        [new Date().toISOString(), id],
      );
    } catch (e) {
      console.error('[deleteReminder]', e);
    }
  });
}

export async function restoreReminder(id: string): Promise<void> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (!row) return;

      const reminder = rowToReminder(row);
      const restored: Reminder = { ...reminder, deletedAt: null };

      if (!restored.completed && restored.dueTime) {
        try {
          const notifIds = await scheduleReminderNotification(restored);
          db.runSync(REMINDER_INSERT, reminderToParams({
            ...restored, notificationId: notifIds[0] || null, notificationIds: notifIds,
          }));
        } catch {
          db.runSync(REMINDER_INSERT, reminderToParams(restored));
        }
      } else {
        db.runSync(REMINDER_INSERT, reminderToParams(restored));
      }
    } catch (e) {
      console.error('[restoreReminder]', e);
    }
  });
}

export async function permanentlyDeleteReminder(id: string): Promise<void> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (row) {
        const reminder = rowToReminder(row);
        if (reminder.notificationIds?.length) {
          await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
        } else if (reminder.notificationId) {
          await cancelReminderNotification(reminder.notificationId).catch(() => {});
        }
      }
      db.runSync('DELETE FROM reminders WHERE id=?', [id]);
    } catch (e) {
      console.error('[permanentlyDeleteReminder]', e);
    }
  });
}

export async function purgeDeletedReminders(): Promise<void> {
  return withLock('reminder-purge', async () => {
    try {
      const db = getDb();
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      db.runSync(
        'DELETE FROM reminders WHERE deletedAt IS NOT NULL AND deletedAt <= ?',
        [cutoff],
      );
    } catch (e) {
      console.error('[purgeDeletedReminders]', e);
    }
  });
}

export async function toggleReminderComplete(id: string): Promise<Reminder | null> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (!row) return null;

      const reminder = rowToReminder(row);
      const nowIso = new Date().toISOString();
      const wasCompleted = reminder.completed;
      const history = [...(reminder.completionHistory || [])];

      if (!wasCompleted) {
        history.push({ completedAt: nowIso });
      } else {
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

      db.runSync(REMINDER_INSERT, reminderToParams(toggled));
      return toggled;
    } catch (e) {
      console.error('[toggleReminderComplete]', e);
      return null;
    }
  });
}

// ---------------------------------------------------------------------------
// Cycle helpers (pure functions — unchanged)
// ---------------------------------------------------------------------------

function _getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCurrentCycleTimestamp(reminder: Reminder): number | null {
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
    const todayDow = now.getDay();
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

  // Yearly from createdAt: no dueDate, no specific days
  if (days.length === 0 && !reminder.dueDate && reminder.createdAt) {
    const created = new Date(reminder.createdAt);
    const mo = created.getMonth();
    const day = created.getDate();
    const now = new Date();
    const d = new Date(now.getFullYear(), mo, day, h, m, 0, 0);
    return d.getTime();
  }

  // Daily (all 7 days or fallback): today at dueTime
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function getNextCycleTimestamp(reminder: Reminder): number | null {
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
    const todayDow = now.getDay();
    let bestTs = Infinity;

    for (const day of days) {
      const target = DAY_INDEX[day];
      if (target === undefined) continue;
      const daysUntil = (target - todayDow + 7) % 7;
      const d = new Date(now);
      d.setDate(d.getDate() + daysUntil);
      d.setHours(h, m, 0, 0);
      if (d.getTime() <= now.getTime()) {
        d.setDate(d.getDate() + 7);
      }
      if (d.getTime() < bestTs) bestTs = d.getTime();
    }

    return bestTs < Infinity ? bestTs : null;
  }

  // Yearly from createdAt: no dueDate, no specific days
  if (days.length === 0 && !reminder.dueDate && reminder.createdAt) {
    const created = new Date(reminder.createdAt);
    const mo = created.getMonth();
    const day = created.getDate();
    const now = new Date();
    let d = new Date(now.getFullYear(), mo, day, h, m, 0, 0);
    if (d.getTime() <= now.getTime()) {
      d = new Date(now.getFullYear() + 1, mo, day, h, m, 0, 0);
    }
    if (d.getMonth() !== mo) {
      d = new Date(d.getFullYear(), mo + 1, 0, h, m, 0, 0);
    }
    return d.getTime();
  }

  // Daily (all 7 days or fallback): next occurrence of dueTime
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export async function clearCompletionHistory(id: string): Promise<void> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (!row) return;
      const reminder = rowToReminder(row);
      db.runSync(REMINDER_INSERT, reminderToParams({ ...reminder, completionHistory: [] }));
    } catch (e) {
      console.error('[clearCompletionHistory]', e);
    }
  });
}

export async function completeRecurringReminder(id: string): Promise<Reminder | null> {
  return withLock(`reminder-${id}`, async () => {
    try {
      const db = getDb();
      const row = db.getFirstSync<ReminderRow>('SELECT * FROM reminders WHERE id=?', [id]);
      if (!row) return null;
      const reminder = rowToReminder(row);

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

      // Yearly recurring (date set, no specific days): advance at least one year
      if (reminder.dueDate && days.length === 0) {
        const [origYear, mo, d] = reminder.dueDate.split('-').map(Number);
        const now = new Date();
        let nextDate = new Date(origYear + 1, mo - 1, d);
        if (nextDate.getMonth() !== mo - 1) {
          nextDate = new Date(origYear + 1, mo - 1, 0);
        }
        while (nextDate.getTime() <= now.getTime()) {
          const nextYear = nextDate.getFullYear() + 1;
          nextDate = new Date(nextYear, mo - 1, d);
          if (nextDate.getMonth() !== mo - 1) {
            nextDate = new Date(nextYear, mo - 1, 0);
          }
        }
        nextDueDate = _getDateStr(nextDate);
      }

      // Yearly from createdAt: no dueDate, no specific days
      if (!reminder.dueDate && days.length === 0 && reminder.createdAt) {
        const created = new Date(reminder.createdAt);
        const mo = created.getMonth() + 1;
        const d = created.getDate();
        const now = new Date();
        let nextDate = new Date(now.getFullYear() + 1, mo - 1, d);
        if (nextDate.getMonth() !== mo - 1) {
          nextDate = new Date(now.getFullYear() + 1, mo - 1, 0);
        }
        while (nextDate.getTime() <= now.getTime()) {
          const nextYear = nextDate.getFullYear() + 1;
          nextDate = new Date(nextYear, mo - 1, d);
          if (nextDate.getMonth() !== mo - 1) {
            nextDate = new Date(nextYear, mo - 1, 0);
          }
        }
        nextDueDate = _getDateStr(nextDate);
      }

      const updated: Reminder = {
        ...reminder,
        dueDate: nextDueDate,
        notificationId: null,
        notificationIds: [],
        completionHistory: history,
      };

      // Reschedule for next occurrence
      if (updated.dueTime) {
        const notifIds = await scheduleReminderNotification(updated, { skipCurrentCycle: true }).catch(() => [] as string[]);
        updated.notificationId = notifIds[0] || null;
        updated.notificationIds = notifIds;
      }

      db.runSync(REMINDER_INSERT, reminderToParams(updated));
      return updated;
    } catch (e) {
      console.error('[completeRecurringReminder]', e);
      return null;
    }
  });
}
