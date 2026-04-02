import { Alert } from 'react-native';
import { getDb } from './database';
import type { SQLiteBindValue } from 'expo-sqlite';
import { Alarm, AlarmDay, ALL_DAYS } from '../types/alarm';
import type { AlarmCategory } from '../types/alarm';
import { scheduleAlarm, cancelAlarmNotifications } from './notifications';
import { deleteAlarmPhoto } from './alarmPhotoStorage';

// ---------------------------------------------------------------------------
// Row type & conversion
// ---------------------------------------------------------------------------

interface AlarmRow {
  id: string;
  time: string;
  note: string;
  quote: string;
  enabled: number;
  mode: string;
  days: string | null;
  date: string | null;
  category: string;
  icon: string | null;
  nickname: string | null;
  guessWhy: number;
  private: number;
  soundId: string | null;
  soundUri: string | null;
  soundName: string | null;
  soundID: number | null;
  photoUri: string | null;
  notificationIds: string | null;
  createdAt: string;
  deletedAt: string | null;
}

function rowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    time: row.time,
    note: row.note,
    quote: row.quote || '',
    enabled: !!row.enabled,
    mode: (row.mode as 'recurring' | 'one-time') || 'recurring',
    days: row.days ? JSON.parse(row.days) : [...ALL_DAYS],
    date: row.date,
    category: row.category as AlarmCategory,
    icon: row.icon ?? undefined,
    nickname: row.nickname ?? undefined,
    guessWhy: !!row.guessWhy || undefined,
    private: !!row.private,
    soundId: row.soundId || 'default',
    soundUri: row.soundUri,
    soundName: row.soundName,
    soundID: row.soundID,
    photoUri: row.photoUri,
    notificationIds: row.notificationIds ? JSON.parse(row.notificationIds) : [],
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
  };
}

function alarmToParams(a: Alarm): SQLiteBindValue[] {
  return [
    a.id, a.time, a.note, a.quote || '', a.enabled ? 1 : 0,
    a.mode || 'recurring', JSON.stringify(a.days || []), a.date ?? null,
    a.category, a.icon ?? null, a.nickname ?? null,
    a.guessWhy ? 1 : 0, a.private ? 1 : 0,
    a.soundId || 'default', a.soundUri ?? null, a.soundName ?? null, a.soundID ?? null,
    a.photoUri ?? null, JSON.stringify(a.notificationIds || []),
    a.createdAt, a.deletedAt ?? null,
  ];
}

const ALARM_INSERT = `INSERT OR REPLACE INTO alarms
  (id, time, note, quote, enabled, mode, days, date, category, icon, nickname,
   guessWhy, private, soundId, soundUri, soundName, soundID, photoUri, notificationIds,
   createdAt, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function loadAlarms(includeDeleted = false): Promise<Alarm[]> {
  const db = getDb();
  const sql = includeDeleted
    ? 'SELECT * FROM alarms'
    : 'SELECT * FROM alarms WHERE deletedAt IS NULL';
  return db.getAllSync<AlarmRow>(sql).map(rowToAlarm);
}

/** Compatibility shim — replaces all alarms in the table. */
export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM alarms');
    for (const a of alarms) {
      db.runSync(ALARM_INSERT, alarmToParams(a));
    }
  });
}

export async function addAlarm(alarm: Alarm): Promise<Alarm[]> {
  const db = getDb();
  db.runSync(ALARM_INSERT, alarmToParams(alarm));
  return loadAlarms();
}

export async function updateAlarm(updatedAlarm: Alarm): Promise<Alarm[]> {
  const db = getDb();

  // Cancel old notifications
  const oldRow = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [updatedAlarm.id]);
  if (oldRow) {
    const oldIds = oldRow.notificationIds ? JSON.parse(oldRow.notificationIds) as string[] : [];
    if (oldIds.length) {
      await cancelAlarmNotifications(oldIds);
    }
  }

  let finalAlarm = { ...updatedAlarm };
  if (finalAlarm.enabled) {
    try {
      const notificationIds = await scheduleAlarm(finalAlarm);
      finalAlarm = { ...finalAlarm, notificationIds };
    } catch (error) {
      console.error('[updateAlarm] scheduleAlarm failed:', error);
      finalAlarm = { ...finalAlarm, enabled: false, notificationIds: [] };
      Alert.alert('Scheduling Failed', "Alarm saved but couldn't schedule notifications. Check notification permissions.");
    }
  } else {
    finalAlarm = { ...finalAlarm, notificationIds: [] };
  }

  db.runSync(ALARM_INSERT, alarmToParams(finalAlarm));
  return loadAlarms();
}

export async function deleteAlarm(id: string): Promise<Alarm[]> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [id]);
  if (row) {
    const ids = row.notificationIds ? JSON.parse(row.notificationIds) as string[] : [];
    if (ids.length) await cancelAlarmNotifications(ids);
  }
  db.runSync(
    'UPDATE alarms SET deletedAt=?, notificationIds=? WHERE id=?',
    [new Date().toISOString(), '[]', id],
  );
  return loadAlarms();
}

export async function restoreAlarm(id: string): Promise<Alarm[]> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [id]);
  if (!row) return loadAlarms();

  const alarm = rowToAlarm(row);
  const restored: Alarm = { ...alarm, deletedAt: null };

  if (restored.enabled) {
    try {
      const notificationIds = await scheduleAlarm(restored);
      db.runSync(ALARM_INSERT, alarmToParams({ ...restored, notificationIds }));
    } catch {
      db.runSync(ALARM_INSERT, alarmToParams({ ...restored, enabled: false, notificationIds: [] }));
    }
  } else {
    db.runSync(ALARM_INSERT, alarmToParams(restored));
  }

  return loadAlarms();
}

export async function permanentlyDeleteAlarm(id: string): Promise<Alarm[]> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [id]);
  if (row) {
    const ids = row.notificationIds ? JSON.parse(row.notificationIds) as string[] : [];
    if (ids.length) await cancelAlarmNotifications(ids);
    if (row.photoUri) await deleteAlarmPhoto(row.photoUri);
  }
  db.runSync('DELETE FROM alarms WHERE id=?', [id]);
  return loadAlarms();
}

export async function purgeDeletedAlarms(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toPurge = db.getAllSync<AlarmRow>(
    'SELECT * FROM alarms WHERE deletedAt IS NOT NULL AND deletedAt <= ?',
    [cutoff],
  );
  for (const row of toPurge) {
    if (row.photoUri) await deleteAlarmPhoto(row.photoUri);
  }
  db.runSync(
    'DELETE FROM alarms WHERE deletedAt IS NOT NULL AND deletedAt <= ?',
    [cutoff],
  );
}

export async function updateSingleAlarm(
  alarmId: string,
  updateFn: (alarm: Alarm) => Alarm,
): Promise<void> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [alarmId]);
  if (!row) return;
  const updated = updateFn(rowToAlarm(row));
  db.runSync(ALARM_INSERT, alarmToParams(updated));
}

export async function toggleAlarm(id: string): Promise<Alarm[]> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [id]);
  if (!row) return loadAlarms();

  const alarm = rowToAlarm(row);
  const toggled = { ...alarm, enabled: !alarm.enabled };

  if (toggled.enabled) {
    // Auto-update past dates for one-time alarms being toggled on
    if (toggled.mode === 'one-time' && toggled.date) {
      const [h, m] = toggled.time.split(':').map(Number);
      const [y, mo, d] = toggled.date.split('-').map(Number);
      const alarmDate = new Date(y, mo - 1, d, h, m, 0, 0);
      if (alarmDate.getTime() <= Date.now()) {
        const now = new Date();
        const todayWithTime = new Date();
        todayWithTime.setHours(h, m, 0, 0);
        const newDate = todayWithTime.getTime() > Date.now() ? now : new Date(now.getTime() + 86400000);
        toggled.date = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
        console.log('[toggleAlarm] updated past date to:', toggled.date);
      }
    }
    try {
      const notificationIds = await scheduleAlarm(toggled);
      toggled.notificationIds = notificationIds;
    } catch (error) {
      console.error('[toggleAlarm] scheduleAlarm failed:', error);
      toggled.enabled = false;
      toggled.notificationIds = [];
      Alert.alert('Scheduling Failed', "Couldn't schedule notifications. Check notification permissions.");
    }
  } else if (alarm.notificationIds?.length) {
    await cancelAlarmNotifications(alarm.notificationIds);
    toggled.notificationIds = [];
  }

  db.runSync(ALARM_INSERT, alarmToParams(toggled));
  return loadAlarms();
}

export async function disableAlarm(id: string): Promise<void> {
  const db = getDb();
  const row = db.getFirstSync<AlarmRow>('SELECT * FROM alarms WHERE id=?', [id]);
  if (row) {
    const ids = row.notificationIds ? JSON.parse(row.notificationIds) as string[] : [];
    if (ids.length) {
      try { await cancelAlarmNotifications(ids); } catch (e) {
        console.error('[disableAlarm] cancelAlarmNotifications failed:', e);
      }
    }
  }
  db.runSync(
    'UPDATE alarms SET enabled=0, notificationIds=? WHERE id=?',
    ['[]', id],
  );
}
